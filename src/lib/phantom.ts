// FinePrint Phantom — the Mastra agent + workflow. SERVER ONLY (reads
// GROQ_API_KEY via the provider module; never import from a client component).
//
// Architecture (a real Mastra workflow, three steps):
//   1. prepare  — chunk the document (paragraph-aware, tail-sampled)
//   2. extract  — per chunk, the Phantom agent (Llama 3.3 70B, open-weight)
//                 pulls candidate clauses with verbatim quotes and scores
//   3. compose  — the agent dedupes, ranks, titles and explains the final
//                 hauntings, and writes the verdict; the Haunt Score itself
//                 is computed by deterministic arithmetic (lib/scoring.ts)
// In mock mode (no key) the same workflow runs, but the extraction and
// composition steps use the local heuristic engine (lib/heuristic.ts), and
// any live failure degrades to it per-step with the result flagged as mock.

import { Mastra } from '@mastra/core';
import { Agent } from '@mastra/core/agent';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { heuristicAnalyze } from './heuristic';
import { chunkDocument, hauntScoreFor, verdictFor } from './scoring';
import { isLive, MODEL_ID } from './provider';
import type { Haunting, HauntingCategory } from './types';

const CATEGORIES: HauntingCategory[] = [
  'data-selling', 'data-sharing', 'tracking', 'arbitration', 'auto-renewal',
  'payment', 'liability', 'content-ownership', 'unilateral-changes',
  'termination', 'retention', 'other',
];

const hauntingSchema = z.object({
  title: z.string(),
  category: z.string(),
  quote: z.string(),
  explanation: z.string(),
  scariness: z.number(),
});

const AGENT_INSTRUCTIONS = `You are the FinePrint Phantom: a meticulous legal-document analyst who reads Terms of Service and privacy policies the way a careful friend would — looking for the clauses that quietly take rights, money, data, or recourse away from the user.

Your rules:
- Quote clauses VERBATIM from the document. Never paraphrase a quote, never invent one.
- Judge scariness by consequences on the user's worst day, not their average day: 1-3 is standard boilerplate, 4-6 deserves a raised eyebrow, 7-8 is a real trap, 9-10 is the kind of clause people regret not reading.
- Explanations are plain English, one or two sentences, no legal jargon, honest rather than theatrical.
- Titles are short and evocative ("The Locked Courtroom", "The Soul Clause") but never silly.
- Respond with JSON only, exactly in the shape requested. No markdown fences, no commentary.`;

let agentSingleton: Agent | null = null;
function phantomAgent(): Agent {
  if (!agentSingleton) {
    agentSingleton = new Agent({
      id: 'fineprint-phantom',
      name: 'FinePrint Phantom',
      instructions: AGENT_INSTRUCTIONS,
      // Mastra's model router resolves "provider/model" and reads the
      // provider key (GROQ_API_KEY) from the environment at call time.
      model: `groq/${MODEL_ID}`,
    });
  }
  return agentSingleton;
}

/** Pull the first JSON value out of a model response, defensively. */
function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(trimmed); } catch { /* fall through */ }
  const start = trimmed.search(/[[{]/);
  if (start === -1) throw new Error('Model returned no JSON');
  for (let end = trimmed.length; end > start; end--) {
    const ch = trimmed[end - 1];
    if (ch === '}' || ch === ']') {
      try { return JSON.parse(trimmed.slice(start, end)); } catch { /* keep shrinking */ }
    }
  }
  throw new Error('Model returned malformed JSON');
}

/** Validate + normalize one raw candidate from the model. Null if unusable. */
function normalizeHaunting(raw: unknown): Haunting | null {
  const parsed = hauntingSchema.safeParse(raw);
  if (!parsed.success) return null;
  const h = parsed.data;
  const quote = h.quote.trim();
  if (quote.length < 25) return null;
  return {
    title: h.title.trim().slice(0, 60) || 'The Unnamed Clause',
    category: (CATEGORIES.includes(h.category as HauntingCategory) ? h.category : 'other') as HauntingCategory,
    quote: quote.length > 480 ? quote.slice(0, 477).trimEnd() + '…' : quote,
    explanation: h.explanation.trim().slice(0, 400),
    scariness: Math.max(1, Math.min(10, Math.round(h.scariness))),
  };
}

async function agentJson(prompt: string): Promise<unknown> {
  const res = await phantomAgent().generate(prompt);
  return extractJson(res.text ?? '');
}

// ---------------------------------------------------------------------------
// Workflow steps
// ---------------------------------------------------------------------------

const prepareStep = createStep({
  id: 'prepare',
  inputSchema: z.object({ text: z.string() }),
  outputSchema: z.object({ chunks: z.array(z.string()), truncated: z.boolean() }),
  execute: async ({ inputData }) => chunkDocument(inputData.text),
});

const extractStep = createStep({
  id: 'extract',
  inputSchema: z.object({ chunks: z.array(z.string()), truncated: z.boolean() }),
  outputSchema: z.object({
    candidates: z.array(hauntingSchema),
    truncated: z.boolean(),
    degraded: z.boolean(),
  }),
  execute: async ({ inputData }) => {
    const candidates: Haunting[] = [];
    let degraded = false;

    for (const chunk of inputData.chunks) {
      if (!isLive()) {
        candidates.push(...heuristicAnalyze(chunk));
        continue;
      }
      try {
        const raw = await agentJson(
          `Read this excerpt from a legal document and extract the clauses most hostile to the user (data sale/sharing, tracking, forced arbitration or class-action waiver, auto-renewal and refund traps, sweeping content licenses, unilateral changes, termination at will, liability caps, post-deletion retention, or anything similarly one-sided). Ignore benign boilerplate.\n\nReturn JSON: {"candidates":[{"title":"...","category":"one of ${CATEGORIES.join('|')}","quote":"<verbatim quote>","explanation":"...","scariness":1-10}]}\nAt most 4 candidates. If none are hostile, return {"candidates":[]}.\n\nEXCERPT:\n"""\n${chunk}\n"""`,
        );
        const list = (raw as { candidates?: unknown[] })?.candidates ?? [];
        for (const item of list) {
          const h = normalizeHaunting(item);
          if (h) candidates.push(h);
        }
      } catch {
        // Live call failed for this chunk: degrade to the heuristic engine
        // for this chunk rather than failing the whole summoning.
        degraded = true;
        candidates.push(...heuristicAnalyze(chunk));
      }
    }
    return { candidates, truncated: inputData.truncated, degraded };
  },
});

const composeStep = createStep({
  id: 'compose',
  inputSchema: z.object({
    candidates: z.array(hauntingSchema),
    truncated: z.boolean(),
    degraded: z.boolean(),
  }),
  outputSchema: z.object({
    hauntings: z.array(hauntingSchema),
    hauntScore: z.number(),
    verdict: z.string(),
    degraded: z.boolean(),
  }),
  execute: async ({ inputData }) => {
    let degraded = inputData.degraded;
    let hauntings: Haunting[] = [];
    let verdict: string | null = null;

    if (isLive() && inputData.candidates.length > 0) {
      try {
        const raw = await agentJson(
          `Here are candidate hostile clauses extracted from one legal document (JSON):\n${JSON.stringify(inputData.candidates)}\n\nDedupe near-duplicates (same clause or same category covering the same ground — keep the strongest quote), rank by scariness, keep at most 10, and polish each title and explanation without changing any quote. Then write a one-line verdict (under 25 words) in the voice of a calm, honest friend summarizing how haunted this document is.\n\nReturn JSON: {"hauntings":[<same shape as candidates>],"verdict":"..."}`,
        );
        const list = (raw as { hauntings?: unknown[] })?.hauntings ?? [];
        hauntings = list.map(normalizeHaunting).filter((h): h is Haunting => h !== null);
        const v = (raw as { verdict?: unknown })?.verdict;
        if (typeof v === 'string' && v.trim()) verdict = v.trim().slice(0, 240);
      } catch {
        degraded = true;
      }
    }

    if (hauntings.length === 0) {
      // Mock path (or live compose failed): deterministic dedupe by category.
      const byCategory = new Map<string, Haunting>();
      for (const c of inputData.candidates as Haunting[]) {
        const existing = byCategory.get(c.category);
        if (!existing || c.scariness > existing.scariness) byCategory.set(c.category, c);
      }
      hauntings = [...byCategory.values()];
    }

    hauntings = hauntings.sort((a, b) => b.scariness - a.scariness).slice(0, 10);
    const hauntScore = hauntScoreFor(hauntings);
    return {
      hauntings,
      hauntScore,
      verdict: verdict ?? verdictFor(hauntScore, hauntings.length),
      degraded,
    };
  },
});

export const hauntWorkflow = createWorkflow({
  id: 'haunt-workflow',
  inputSchema: z.object({ text: z.string() }),
  outputSchema: z.object({
    hauntings: z.array(hauntingSchema),
    hauntScore: z.number(),
    verdict: z.string(),
    degraded: z.boolean(),
  }),
})
  .then(prepareStep)
  .then(extractStep)
  .then(composeStep)
  .commit();

export const mastra = new Mastra({
  agents: { phantom: phantomAgent() },
  workflows: { hauntWorkflow },
});

export interface WorkflowOutcome {
  hauntings: Haunting[];
  hauntScore: number;
  verdict: string;
  degraded: boolean;
  truncated: boolean;
}

/** Run the full summoning through the registered Mastra workflow. */
export async function runHauntWorkflow(text: string): Promise<WorkflowOutcome> {
  const workflow = mastra.getWorkflow('hauntWorkflow');
  const run = await workflow.createRun();
  // The workflow's final output does not carry `truncated` (it is consumed by
  // the extract step), so recompute it cheaply from the same chunker.
  const { truncated } = chunkDocument(text);
  const result = await run.start({ inputData: { text } });
  if (result.status !== 'success') {
    throw new Error(`Workflow ended with status: ${result.status}`);
  }
  const out = result.result as Omit<WorkflowOutcome, 'truncated'>;
  return { ...out, truncated };
}
