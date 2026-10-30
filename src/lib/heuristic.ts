// Heuristic analysis engine — the MOCK provider.
//
// When no GROQ_API_KEY is configured (or a live call fails), FinePrint Phantom
// still analyzes the actual document the user supplied: it sentence-splits the
// text and scores sentences against a library of clause patterns (data sale,
// arbitration, perpetual licenses, retention, and so on). The quotes it
// returns are always verbatim from the user's own document — the heuristic
// never invents a clause. The live model writes better explanations; the
// heuristic is the honest offline stand-in, and the UI labels it Demo mode.

import type { Haunting, HauntingCategory } from './types';

interface ClauseRule {
  category: HauntingCategory;
  title: string;
  explanation: string;
  base: number; // base scariness before pattern-strength adjustment
  patterns: RegExp[];
}

const RULES: ClauseRule[] = [
  {
    category: 'data-selling',
    title: 'The Data Merchant',
    explanation:
      'The company reserves the right to sell or trade your personal information to third parties for their own marketing. Your data is part of the product being sold.',
    base: 9,
    patterns: [/\bsell\b[^.]{0,80}\b(personal (information|data)|your (information|data))\b/i, /\bsale of your\b/i, /\bsell or share\b/i],
  },
  {
    category: 'data-sharing',
    title: 'The Open Door',
    explanation:
      'Your information is shared broadly with partners, affiliates, or advertisers — often for purposes you would not guess from the product you signed up for.',
    base: 7,
    patterns: [/\bshare\b[^.]{0,60}\b(third parties|partners|advertisers|affiliates)\b/i, /\bdisclose\b[^.]{0,60}\bthird part/i],
  },
  {
    category: 'tracking',
    title: 'The Watcher in the Walls',
    explanation:
      'You are tracked across sites, apps, or devices — not just inside this service — and that trail is combined into a profile about you.',
    base: 8,
    patterns: [/\btrack\b[^.]{0,80}\b(across|other (websites|sites|apps|devices))\b/i, /device fingerprinting/i, /cross-context/i, /\bpixels?\b[^.]{0,60}\btrack/i],
  },
  {
    category: 'arbitration',
    title: 'The Locked Courtroom',
    explanation:
      'You give up your right to sue in court or join a class action. Disputes go to private arbitration the company chooses — a forum that historically favors the company.',
    base: 9,
    patterns: [/binding (individual )?arbitration/i, /\barbitration\b[^.]{0,100}\bwaive\b/i, /class action/i, /waive[^.]{0,60}jury/i],
  },
  {
    category: 'auto-renewal',
    title: 'The Velvet Trap',
    explanation:
      'The subscription renews and charges you automatically — trials convert to paid plans silently, and the burden of remembering to cancel is entirely yours.',
    base: 7,
    patterns: [/automatically renew/i, /free trials? convert/i, /charged[^.]{0,60}unless you cancel/i, /auto-?renew/i],
  },
  {
    category: 'payment',
    title: 'The Empty Refund',
    explanation:
      'Payments are effectively one-way: partial periods, mistakes, and unused time are not refunded, even when the service changes or disappears.',
    base: 6,
    patterns: [/no refunds?\b/i, /refunds? (will not|shall not|are not) be (provided|issued|given)/i, /non-?refundable/i],
  },
  {
    category: 'content-ownership',
    title: 'The Soul Clause',
    explanation:
      'Content you create or upload becomes theirs to use — broadly, forever, for anything, including ads — and the license can survive you deleting it or closing your account.',
    base: 9,
    patterns: [/perpetual[^.]{0,80}(license|right)/i, /irrevocable[^.]{0,80}license/i, /you grant[^.]{0,120}(worldwide|perpetual|royalty-free)/i, /survives termination/i],
  },
  {
    category: 'unilateral-changes',
    title: 'The Shifting Floor',
    explanation:
      'The company can change the terms, prices, or the product itself at any time — without telling you — and simply continuing to use the service counts as agreeing.',
    base: 8,
    patterns: [/change these terms[^.]{0,80}at any time/i, /without notice/i, /continued use[^.]{0,80}(acceptance|constitutes)/i, /in our sole discretion/i],
  },
  {
    category: 'termination',
    title: 'The Trapdoor',
    explanation:
      'Your account — and everything you bought or stored in it — can be taken away at any time, for any reason or none, with no refund and no appeal.',
    base: 8,
    patterns: [/terminate[^.]{0,80}(at any time|for any reason)/i, /for any reason or for no reason/i, /suspend[^.]{0,60}terminate/i],
  },
  {
    category: 'liability',
    title: 'The Vanishing Shield',
    explanation:
      'If something goes wrong, the company\'s responsibility is capped at a token amount while yours is not — and you may even owe them for claims connected to your use.',
    base: 7,
    patterns: [/liability[^.]{0,80}shall not exceed/i, /not exceed[^.]{0,40}\$\s?\d+/i, /indemnify/i, /no circumstances[^.]{0,60}liable/i],
  },
  {
    category: 'retention',
    title: 'The Thing That Never Leaves',
    explanation:
      'Deleting your account does not delete your data. Copies linger in backups and analytics systems indefinitely, long after you think you have left.',
    base: 8,
    patterns: [/retain[^.]{0,80}indefinitely/i, /after (you )?delete/i, /retention/i, /backups[^.]{0,80}(indefinitely|forever)/i],
  },
];

function splitSentences(text: string): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  const parts = clean.match(/[^.!?]{40,600}[.!?]+["')\]]*\s*/g) ?? [clean];
  return parts.map((s) => s.trim()).filter((s) => s.length >= 30);
}

/** Score one sentence against one rule; 0 when it does not match. */
function matchStrength(sentence: string, rule: ClauseRule): number {
  let hits = 0;
  for (const p of rule.patterns) if (p.test(sentence)) hits++;
  return hits;
}

export function heuristicAnalyze(text: string): Haunting[] {
  const sentences = splitSentences(text);
  const byCategory = new Map<HauntingCategory, Haunting>();

  for (const sentence of sentences) {
    for (const rule of RULES) {
      const hits = matchStrength(sentence, rule);
      if (hits === 0) continue;
      const scariness = Math.min(10, rule.base + (hits > 1 ? 1 : 0));
      const existing = byCategory.get(rule.category);
      // Keep the strongest (and, on ties, the most complete) quote per category.
      if (!existing || scariness > existing.scariness ||
          (scariness === existing.scariness && sentence.length > existing.quote.length)) {
        byCategory.set(rule.category, {
          title: rule.title,
          category: rule.category,
          quote: sentence.length > 480 ? sentence.slice(0, 477).trimEnd() + '…' : sentence,
          explanation: rule.explanation,
          scariness,
        });
      }
    }
  }

  return [...byCategory.values()]
    .sort((a, b) => b.scariness - a.scariness)
    .slice(0, 10);
}
