# FinePrint Phantom

**Summon the clauses hiding in the fine print.**

Every Terms of Service has a ghost in it: the clause that sells your data, the
one that locks you out of court, the one that renews itself forever while you
sleep. Nobody reads 8,000 words of legalese — so FinePrint Phantom reads it for
you. Paste a policy URL or the raw text, and a Mastra agent powered by an
open-weight model extracts the scariest clauses ("hauntings"), each with:

- the **exact quoted clause**, verbatim from the document,
- a **plain-English explanation** of what it means for the user, and
- a **scariness score from 1–10**,

plus an overall **Haunt Score (0–100)** and a one-line verdict.

Built for the [DEV Hacktoberfest Week 4 challenge — "Ghost in the Machine"](https://dev.to/challenges/hacktoberfest-week4-2026-10-26),
October 2026. The project was started and completed inside the challenge window.

## Prize categories targeted

- **Overall** — the entry itself.
- **Best Use of Mastra** — the analysis is a real Mastra workflow (below), not
  a single prompt: a registered agent, three composed steps, structured
  validation at every hand-off.
- **Best Use of Render** — the app is deployed on Render (Next.js web service;
  see the deploy notes below).

## Run it

```bash
npm install
cp .env.example .env.local   # optional — see below
npm run dev                  # http://localhost:3000
```

Production:

```bash
npm run build
npm run start
```

### Configuration

| Variable | Effect |
|---|---|
| `GROQ_API_KEY` | Server-side key for Groq, which serves the open-weight model. With it set, analysis runs **live**. Get a free key at [console.groq.com](https://console.groq.com). |
| `PHANTOM_MOCK` | Set to `1` to force demo mode even when a key exists. |

**Demo mode:** with no key configured (or if a live call fails partway), the
same workflow runs on a built-in heuristic engine that pattern-matches the
actual document and still quotes only real clauses from it. The UI labels this
clearly as Demo mode — nothing is faked silently.

The model is **GPT-OSS 120B** (`openai/gpt-oss-120b`), an open-weight
model, served via Groq's free tier. Switching providers later is a one-file
change in `src/lib/provider.ts` / `src/lib/phantom.ts` — the workflow speaks
JSON, not vendor.

## How it works

```
URL or pasted text
      │
      ▼
POST /api/analyze            (server-side fetch + HTML→text for URLs,
                              60,000-character cap with a truncation notice)
      │
      ▼
Mastra workflow "haunt-workflow"          src/lib/phantom.ts
  1. prepare — paragraph-aware chunking (~3,500 chars/chunk); if a document
               has too many chunks, they are sampled evenly so the tail —
               where arbitration clauses hide — is never silently dropped
  2. extract — the Phantom agent reads each chunk and returns candidate
               clauses as validated JSON (verbatim quote, category,
               explanation, scariness); invalid entries are discarded
  3. compose — the agent dedupes and ranks the candidates and writes the
               verdict; the Haunt Score is then computed by deterministic
               arithmetic (src/lib/scoring.ts), never generated
      │
      ▼
Results UI: Haunt Score hero → verdict → haunting cards, scariest first
```

There is deliberately **no database**: documents are analyzed in memory and
discarded. A tool that reads privacy policies for a living should not keep a
copy of yours.

## Layout

```
src/
  app/
    page.tsx                 Landing, input, processing, results (client)
    layout.tsx, globals.css  Dark, Halloween-elegant theme
    api/analyze/route.ts     The only door to the model; POST {url|text}
  components/
    PhantomMark.tsx          The specter mark (inline SVG)
    HauntingCard.tsx         One haunting: quote, explanation, scariness
  lib/
    phantom.ts               Mastra agent + 3-step workflow (server only)
    provider.ts              Live/mock selection, model identity
    heuristic.ts             The demo-mode engine (pattern library)
    scoring.ts               Haunt Score arithmetic, verdicts, chunking
    fetchDoc.ts              URL fetching and HTML→text stripping
    sample.ts                The built-in "Streamly" sample policy
    types.ts                 Shared types
```

## Deploying (Render)

Create a Web Service from this repo on Render with:

- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Environment variable: `GROQ_API_KEY` (optional; without it the service runs
  in labeled demo mode)

## License

MIT.
