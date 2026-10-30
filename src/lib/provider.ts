// Provider selection, mirroring SkinCart's convention:
//   live  — GROQ_API_KEY is set and PHANTOM_MOCK is not '1'
//   mock  — otherwise (the heuristic engine analyzes the document locally)
// The key is server-side only and never reaches the browser.

export const MODEL_ID = 'openai/gpt-oss-120b';
export const MODEL_LABEL = 'GPT-OSS 120B (open-weight, served via Groq)';

export function isLive(): boolean {
  return Boolean(process.env.GROQ_API_KEY) && process.env.PHANTOM_MOCK !== '1';
}
