// Deterministic Haunt Score + verdict composition, shared by the live model
// path and the heuristic path so both play by the same rules: the model finds
// and explains the clauses; arithmetic — not vibes — produces the score.

import type { Haunting } from './types';

/**
 * Haunt Score (0–100):
 *  - the three scariest hauntings dominate (average × 10 → up to 100 at 10/10)
 *  - breadth adds a little: every additional distinct haunting beyond the
 *    first three adds 1.5 points, capped so breadth alone can't max the score.
 */
export function hauntScoreFor(hauntings: Haunting[]): number {
  if (hauntings.length === 0) return 0;
  const sorted = [...hauntings].sort((a, b) => b.scariness - a.scariness);
  const top = sorted.slice(0, 3);
  const core = (top.reduce((s, h) => s + h.scariness, 0) / top.length) * 10;
  const breadth = Math.min(5, Math.max(0, sorted.length - 3)) * 1.5;
  return Math.max(0, Math.min(100, Math.round(core * 0.92 + breadth)));
}

export function verdictFor(score: number, count: number): string {
  if (count === 0)
    return 'No hauntings found. Either this document is unusually gentle — or it hides its teeth unusually well.';
  if (score >= 80)
    return 'Deeply haunted. This document takes far more than it gives — read every line before you agree.';
  if (score >= 60)
    return 'Seriously haunted. Several clauses here would matter on the worst day, not the average one.';
  if (score >= 40)
    return 'Moderately haunted. A few real traps among the boilerplate — worth knowing before you click Agree.';
  if (score >= 20)
    return 'Lightly haunted. Mostly standard language, with a whisper or two worth noticing.';
  return 'Barely a whisper. This is about as gentle as legal documents get.';
}

/** Split a document into paragraph-aware chunks for the extraction step. */
export function chunkDocument(text: string, maxChunkChars = 3500, maxChunks = 8): { chunks: string[]; truncated: boolean } {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = '';
  const push = () => { if (current.trim()) chunks.push(current.trim()); current = ''; };

  for (const para of paragraphs.length ? paragraphs : [text]) {
    if (para.length > maxChunkChars) {
      // Very long paragraph: hard-split it.
      push();
      for (let i = 0; i < para.length; i += maxChunkChars) chunks.push(para.slice(i, i + maxChunkChars));
      continue;
    }
    if ((current + '\n\n' + para).length > maxChunkChars) push();
    current = current ? current + '\n\n' + para : para;
  }
  push();

  if (chunks.length <= maxChunks) return { chunks, truncated: false };
  // Too many chunks: sample evenly across the document so the tail (where
  // arbitration and termination clauses like to hide) is not silently dropped.
  const sampled: string[] = [];
  const step = chunks.length / maxChunks;
  for (let i = 0; i < maxChunks; i++) sampled.push(chunks[Math.floor(i * step)]);
  return { chunks: sampled, truncated: true };
}
