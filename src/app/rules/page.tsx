import Link from 'next/link';
import { RulesGuide } from '@/components/RulesGuide';

export const metadata = { title: 'How to play — Pondlife' };

export default function RulesPage() {
  return (
    <main className="min-h-dvh bg-paper px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-muted hover:text-ink">← Home</Link>
        <h1 className="mt-3 font-display text-4xl font-semibold">How to play</h1>
        <p className="mt-2 text-muted">Everything you need to know in five minutes. The game highlights every legal move for you, so you can learn as you play.</p>
        <div className="mt-8"><RulesGuide /></div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/local" className="btn btn-primary">Try a game on this device</Link>
          <Link href="/computer" className="btn">Practise against the computer</Link>
        </div>
      </div>
    </main>
  );
}
