'use client';

import { useEffect, useRef, useState } from 'react';
import HauntingCard from '@/components/HauntingCard';
import PhantomMark from '@/components/PhantomMark';
import { SAMPLE_LABEL, SAMPLE_POLICY } from '@/lib/sample';
import type { AnalysisResult } from '@/lib/types';

type Stage = 'input' | 'processing' | 'results';
type InputMode = 'url' | 'paste';

const STEPS = [
  'Opening the document',
  'Reading every clause, including the small ones',
  'The Phantom is pulling the hauntings out of the text',
  'Ranking the scares',
  'Composing the verdict',
];

function scoreTone(score: number): string {
  if (score >= 80) return 'text-[#e88a70]';
  if (score >= 60) return 'text-[#e0a76a]';
  if (score >= 40) return 'text-[#c9a45c]';
  if (score >= 20) return 'text-[#b3a8e8]';
  return 'text-[#a79f8d]';
}

export default function Home() {
  const [stage, setStage] = useState<Stage>('input');
  const [inputMode, setInputMode] = useState<InputMode>('url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [step, setStep] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  async function summon(payload: { url?: string; text?: string; sourceLabel?: string }) {
    setError(null);
    setStage('processing');
    setStep(0);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 2600);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'The summoning failed.');
      setResult(data as AnalysisResult);
      setStage('results');
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The summoning failed. Try again.');
      setStage('input');
    } finally {
      if (timer.current) clearInterval(timer.current);
    }
  }

  function restart() {
    setResult(null);
    setError(null);
    setStage('input');
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">
      {/* Header */}
      <header className="flex items-center justify-between py-7">
        <div className="flex items-center gap-3">
          <span className="text-[var(--color-gold)]">
            <PhantomMark size={34} />
          </span>
          <span className="font-display text-xl tracking-wide text-[var(--color-bone)]">
            FinePrint <span className="italic text-[var(--color-gold)]">Phantom</span>
          </span>
        </div>
        <span className="hidden text-xs uppercase tracking-[0.18em] text-[var(--color-faint)] sm:block">
          Ghost in the Machine · Week 4
        </span>
      </header>

      {stage !== 'results' && (
        <>
          {/* Hero */}
          <section className="mt-6 text-center sm:mt-10">
            <div className="drift mx-auto w-fit text-[var(--color-spectral)]">
              <PhantomMark size={74} />
            </div>
            <h1 className="font-display mx-auto mt-6 max-w-3xl text-5xl leading-[1.05] text-[var(--color-bone)] sm:text-6xl">
              Summon the clauses hiding in the{' '}
              <em className="text-[var(--color-gold)]">fine print</em>.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[var(--color-ash)]">
              Every Terms of Service has a ghost in it — the clause that sells your data,
              locks you out of court, or renews itself forever. Paste one in, and the Phantom
              reads all of it, pulls out the scariest clauses word for word, and tells you
              what they actually mean.
            </p>
          </section>

          {/* Input card */}
          <section className="mx-auto mt-10 max-w-3xl rounded-3xl border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.45)] sm:p-8">
            {stage === 'processing' ? (
              <div className="py-6 text-center" aria-live="polite">
                <div className="drift mx-auto w-fit text-[var(--color-gold)]">
                  <PhantomMark size={58} />
                </div>
                <ol className="mx-auto mt-8 max-w-md space-y-3 text-left">
                  {STEPS.map((label, i) => (
                    <li
                      key={label}
                      className={`flex items-center gap-3 text-[15px] transition-opacity duration-500 ${
                        i < step ? 'text-[var(--color-ash)]' : i === step ? 'text-[var(--color-bone)]' : 'text-[var(--color-faint)] opacity-60'
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          i === step ? 'breathe bg-[var(--color-gold)]' : i < step ? 'bg-[var(--color-spectral)]' : 'bg-[var(--color-line)]'
                        }`}
                      />
                      {label}
                      {i < step && <span className="ml-auto text-[var(--color-spectral)]">done</span>}
                      {i === step && <span className="ml-auto text-[var(--color-gold)]">…</span>}
                    </li>
                  ))}
                </ol>
                <p className="mt-8 text-sm text-[var(--color-faint)]">
                  A long document can take a little while. The Phantom reads it all.
                </p>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  {(['url', 'paste'] as InputMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setInputMode(m)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        inputMode === m
                          ? 'bg-[var(--color-gold)] text-[#171106]'
                          : 'border border-[var(--color-line)] text-[var(--color-ash)] hover:border-[var(--color-gold)] hover:text-[var(--color-bone)]'
                      }`}
                    >
                      {m === 'url' ? 'Policy URL' : 'Paste the text'}
                    </button>
                  ))}
                </div>

                {inputMode === 'url' ? (
                  <div className="mt-5">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com/terms-of-service"
                      className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-coal)] px-4 py-3.5 text-[15px] text-[var(--color-bone)] placeholder:text-[var(--color-faint)] focus:border-[var(--color-gold)] focus:outline-none"
                    />
                    <p className="mt-2 text-xs text-[var(--color-faint)]">
                      The page is fetched and read on the server. Long documents are read up to
                      60,000 characters and sampled across their full length.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5">
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={9}
                      placeholder="Paste the Terms of Service or privacy policy here…"
                      className="w-full resize-y rounded-xl border border-[var(--color-line)] bg-[var(--color-coal)] px-4 py-3.5 text-[15px] leading-relaxed text-[var(--color-bone)] placeholder:text-[var(--color-faint)] focus:border-[var(--color-gold)] focus:outline-none"
                    />
                    <p className="mt-2 text-xs text-[var(--color-faint)]">
                      {text.trim().length.toLocaleString()} characters. Your text is analyzed and
                      never stored — there is no database here.
                    </p>
                  </div>
                )}

                {error && (
                  <div className="mt-4 rounded-xl border border-[#5a2f26] bg-[#241311] px-4 py-3 text-sm text-[#e8a08a]">
                    {error}
                  </div>
                )}

                <button
                  onClick={() =>
                    inputMode === 'url'
                      ? summon({ url: url.trim() })
                      : summon({ text, sourceLabel: 'Pasted text' })
                  }
                  disabled={inputMode === 'url' ? !url.trim() : text.trim().length < 200}
                  className="mt-6 w-full rounded-full bg-[var(--color-gold)] px-6 py-3.5 text-base font-semibold text-[#171106] transition hover:bg-[#dab96f] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Summon the Phantom
                </button>

                <div className="mt-5 flex items-center gap-3 text-xs text-[var(--color-faint)]">
                  <span className="h-px flex-1 bg-[var(--color-line)]" />
                  no document handy?
                  <span className="h-px flex-1 bg-[var(--color-line)]" />
                </div>
                <button
                  onClick={() => summon({ text: SAMPLE_POLICY, sourceLabel: SAMPLE_LABEL })}
                  className="mt-4 w-full rounded-full border border-[var(--color-line)] px-5 py-3 text-sm font-medium text-[var(--color-ash)] transition hover:border-[var(--color-spectral)] hover:text-[var(--color-bone)]"
                >
                  Exorcise our sample instead — the “Streamly” terms, haunted on purpose →
                </button>
              </>
            )}
          </section>

          {/* How it works */}
          <section className="mx-auto mt-14 grid max-w-4xl gap-5 sm:grid-cols-3">
            {[
              {
                n: 'I',
                title: 'It reads everything',
                body: 'The document is split into passages, end to end — including the tail, where the arbitration and termination clauses like to hide.',
              },
              {
                n: 'II',
                title: 'An open model hunts',
                body: 'A Mastra agent powered by Llama 3.3 70B (an open-weight model) extracts candidate clauses from each passage, quoting them verbatim.',
              },
              {
                n: 'III',
                title: 'You get the hauntings',
                body: 'Duplicates are merged, every haunting is scored for scariness, and the document earns a Haunt Score — arithmetic, not vibes.',
              },
            ].map((c) => (
              <div key={c.n} className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-coal)] p-5">
                <div className="font-display text-lg text-[var(--color-gold)]">{c.n}</div>
                <h3 className="font-display mt-2 text-xl text-[var(--color-bone)]">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-ash)]">{c.body}</p>
              </div>
            ))}
          </section>
        </>
      )}

      {stage === 'results' && result && (
        <section className="fade-up">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-3xl text-[var(--color-bone)] sm:text-4xl">The haunting report</h2>
            <button
              onClick={restart}
              className="rounded-full border border-[var(--color-line)] px-4 py-1.5 text-sm font-medium text-[var(--color-ash)] transition hover:border-[var(--color-gold)] hover:text-[var(--color-bone)]"
            >
              ↺ Summon another
            </button>
          </div>

          {result.mode === 'mock' && (
            <div className="mt-4 rounded-2xl border border-[#4d3f1d] bg-[#1d1808] px-4 py-3 text-sm text-[#d9c07a]">
              <strong>Demo mode.</strong> {result.modeNote}
            </div>
          )}

          {/* Haunt Score hero */}
          <div className="mt-6 overflow-hidden rounded-3xl border border-[var(--color-line)] bg-[var(--color-panel)]">
            <div className="grid sm:grid-cols-[240px_1fr]">
              <div className="flex flex-col items-center justify-center border-b border-[var(--color-line)] bg-[var(--color-coal)] px-6 py-9 sm:border-b-0 sm:border-r">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-ash)]">
                  Haunt Score
                </span>
                <span className={`font-display mt-2 text-7xl leading-none ${scoreTone(result.hauntScore)}`}>
                  {result.hauntScore}
                </span>
                <span className="mt-2 text-sm text-[var(--color-faint)]">out of 100</span>
                <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-panel2)]">
                  <div
                    className="score-bar-fill h-full rounded-full bg-[var(--color-gold)]"
                    style={{ width: `${result.hauntScore}%` }}
                  />
                </div>
              </div>
              <div className="flex flex-col justify-center px-7 py-8">
                <div className="text-[var(--color-spectral)]">
                  <PhantomMark size={30} />
                </div>
                <p className="font-display mt-3 text-2xl leading-snug text-[var(--color-bone)]">
                  {result.verdict}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-[var(--color-faint)]">
                  Source: {result.sourceLabel} · {result.charCount.toLocaleString()} characters read
                  {result.truncated && ' · the document was longer than the reading cap, so passages were sampled across its full length'}
                  {' · '}{result.hauntings.length} haunting{result.hauntings.length === 1 ? '' : 's'} found.
                </p>
              </div>
            </div>
          </div>

          {/* Hauntings */}
          <div className="mt-8 space-y-5">
            {result.hauntings.map((h, i) => (
              <HauntingCard key={`${h.category}-${i}`} haunting={h} index={i} />
            ))}
            {result.hauntings.length === 0 && (
              <p className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] p-6 text-center text-[var(--color-ash)]">
                No hauntings surfaced in this document. Gentle terms — or very well-hidden ones.
              </p>
            )}
          </div>

          <p className="mt-10 text-center text-sm leading-relaxed text-[var(--color-faint)]">
            How this reading was made: a three-step Mastra workflow (chunk → extract → compose)
            powered by {result.modelName}. Quotes are verbatim from the document; the Haunt Score
            is computed from the individual scariness ratings, not generated. Explanations are an
            aid to reading, not legal advice.
          </p>
        </section>
      )}

      <footer className="mt-20 border-t border-[var(--color-line)] pt-6 text-center text-xs text-[var(--color-faint)]">
        FinePrint Phantom — built with open-weight AI for the DEV Hacktoberfest “Ghost in the
        Machine” challenge. Nothing you paste is stored.
      </footer>
    </main>
  );
}
