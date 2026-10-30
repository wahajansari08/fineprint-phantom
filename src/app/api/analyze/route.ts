// POST /api/analyze — summon the Phantom over one document.
// Body: { url?: string, text?: string, sourceLabel?: string }
// The GROQ_API_KEY never leaves the server; this route is its only door.

import { NextResponse } from 'next/server';
import { fetchDocumentText, MAX_DOC_CHARS } from '@/lib/fetchDoc';
import { heuristicAnalyze } from '@/lib/heuristic';
import { runHauntWorkflow } from '@/lib/phantom';
import { isLive, MODEL_LABEL } from '@/lib/provider';
import { hauntScoreFor, verdictFor } from '@/lib/scoring';
import type { AnalysisRequestBody, AnalysisResult } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: AnalysisRequestBody;
  try {
    body = (await req.json()) as AnalysisRequestBody;
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 });
  }

  // --- Resolve the document -------------------------------------------------
  let text = '';
  let sourceLabel = body.sourceLabel?.trim() || 'Pasted text';
  let fetchTruncated = false;
  try {
    if (body.url && body.url.trim()) {
      const fetched = await fetchDocumentText(body.url.trim());
      text = fetched.text;
      fetchTruncated = fetched.truncated;
      sourceLabel = body.url.trim();
    } else if (body.text && body.text.trim()) {
      const raw = body.text.trim();
      fetchTruncated = raw.length > MAX_DOC_CHARS;
      text = raw.slice(0, MAX_DOC_CHARS);
    } else {
      return NextResponse.json(
        { error: 'Provide a policy URL or paste the document text.' },
        { status: 400 },
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not get that document.' },
      { status: 422 },
    );
  }
  if (text.length < 200) {
    return NextResponse.json(
      { error: 'That document is too short to haunt. Paste at least a few paragraphs of the policy.' },
      { status: 422 },
    );
  }

  const live = isLive();

  // --- Run the Mastra workflow (with an honest last-resort fallback) --------
  try {
    const out = await runHauntWorkflow(text);
    const mock = !live || out.degraded;
    const result: AnalysisResult = {
      hauntings: out.hauntings,
      hauntScore: out.hauntScore,
      verdict: out.verdict,
      sourceLabel,
      charCount: text.length,
      truncated: fetchTruncated || out.truncated,
      mode: mock ? 'mock' : 'live',
      modeNote: !live
        ? 'Demo mode: no GROQ_API_KEY configured, so the built-in heuristic engine read this document locally. Set the key to summon the full model.'
        : out.degraded
          ? 'The live model stumbled mid-summoning, so part of this reading came from the local heuristic engine.'
          : `Analyzed live by ${MODEL_LABEL} through a Mastra workflow.`,
      modelName: MODEL_LABEL,
    };
    return NextResponse.json(result);
  } catch (err) {
    console.error('[phantom] workflow failed, falling back to heuristic:', err);
    const hauntings = heuristicAnalyze(text);
    const hauntScore = hauntScoreFor(hauntings);
    const result: AnalysisResult = {
      hauntings,
      hauntScore,
      verdict: verdictFor(hauntScore, hauntings.length),
      sourceLabel,
      charCount: text.length,
      truncated: fetchTruncated,
      mode: 'mock',
      modeNote:
        'Demo mode: the agent workflow was unavailable, so the local heuristic engine read this document instead.',
      modelName: MODEL_LABEL,
    };
    return NextResponse.json(result);
  }
}
