// Shared types for FinePrint Phantom.

export type HauntingCategory =
  | 'data-selling'
  | 'data-sharing'
  | 'tracking'
  | 'arbitration'
  | 'auto-renewal'
  | 'payment'
  | 'liability'
  | 'content-ownership'
  | 'unilateral-changes'
  | 'termination'
  | 'retention'
  | 'other';

export interface Haunting {
  /** Short evocative name, e.g. "The Data Merchant". */
  title: string;
  category: HauntingCategory;
  /** The exact clause, quoted verbatim from the document. */
  quote: string;
  /** Plain-English explanation of what this clause really means for the user. */
  explanation: string;
  /** Scariness from 1 (mild) to 10 (terrifying). */
  scariness: number;
}

export interface AnalysisResult {
  hauntings: Haunting[];
  /** Overall Haunt Score, 0 (benign) to 100 (deeply haunted). */
  hauntScore: number;
  /** One-line verdict on the document. */
  verdict: string;
  /** Where the document came from: a URL, pasted text, or the built-in sample. */
  sourceLabel: string;
  /** Character count of the document actually analyzed. */
  charCount: number;
  /** True when the document was truncated to fit the analysis cap. */
  truncated: boolean;
  /** 'live' when the open-weight model ran, 'mock' for the heuristic demo engine. */
  mode: 'live' | 'mock';
  /** Human-readable note about the mode / any fallback that occurred. */
  modeNote: string;
  /** The open-weight model that powers (or would power) the analysis. */
  modelName: string;
}

export interface AnalysisRequestBody {
  url?: string;
  text?: string;
  sourceLabel?: string;
}
