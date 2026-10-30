import type { Haunting, HauntingCategory } from '@/lib/types';

const CATEGORY_LABELS: Record<HauntingCategory, string> = {
  'data-selling': 'Data selling',
  'data-sharing': 'Data sharing',
  tracking: 'Tracking',
  arbitration: 'Forced arbitration',
  'auto-renewal': 'Auto-renewal',
  payment: 'Payments & refunds',
  liability: 'Liability',
  'content-ownership': 'Content ownership',
  'unilateral-changes': 'Unilateral changes',
  termination: 'Termination',
  retention: 'Data retention',
  other: 'Fine print',
};

function scareTone(scariness: number): { bar: string; text: string; word: string } {
  if (scariness >= 9) return { bar: 'bg-[#d4694e]', text: 'text-[#e88a70]', word: 'Terrifying' };
  if (scariness >= 7) return { bar: 'bg-[#d98a4e]', text: 'text-[#e0a76a]', word: 'Alarming' };
  if (scariness >= 5) return { bar: 'bg-[#c9a45c]', text: 'text-[#c9a45c]', word: 'Unsettling' };
  if (scariness >= 3) return { bar: 'bg-[#9d8fe0]', text: 'text-[#b3a8e8]', word: 'A whisper' };
  return { bar: 'bg-[#5f5970]', text: 'text-[#a79f8d]', word: 'Barely there' };
}

export default function HauntingCard({ haunting, index }: { haunting: Haunting; index: number }) {
  const tone = scareTone(haunting.scariness);
  return (
    <article
      className="fade-up rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[0_10px_36px_rgba(0,0,0,0.35)]"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-display text-2xl text-[var(--color-bone)]">{haunting.title}</h3>
        <span className="rounded-full border border-[var(--color-line)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ash)]">
          {CATEGORY_LABELS[haunting.category]}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-panel2)]">
          <div
            className={`score-bar-fill h-full rounded-full ${tone.bar}`}
            style={{ width: `${haunting.scariness * 10}%` }}
          />
        </div>
        <span className={`text-sm font-semibold ${tone.text}`}>
          {haunting.scariness}/10 · {tone.word}
        </span>
      </div>

      <blockquote className="mt-5 border-l-2 border-[var(--color-gold)] pl-4 font-display text-[17px] italic leading-relaxed text-[#d9d2bf]">
        “{haunting.quote}”
      </blockquote>

      <p className="mt-4 text-[15px] leading-relaxed text-[var(--color-ash)]">{haunting.explanation}</p>
    </article>
  );
}
