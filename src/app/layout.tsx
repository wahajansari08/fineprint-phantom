import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FinePrint Phantom — Summon the clauses hiding in the fine print',
  description:
    'Paste a Terms of Service or privacy policy and a Mastra agent powered by an open-weight model extracts the scariest clauses — with verbatim quotes, plain-English explanations, and a Haunt Score.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
