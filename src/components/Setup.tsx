'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { BASIC_CONFIG, BUGS, FULL_CONFIG, type GameConfig } from '@/engine';
import { PieceIcon } from './PieceArt';

export function SetupShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="board-felt flex min-h-dvh items-start justify-center px-4 py-6 sm:items-center sm:py-10">
      <div className="card w-full max-w-lg p-6 sm:p-8">
        <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">← Home</Link>
        <h1 className="font-display text-3xl font-semibold">{title}</h1>
        {subtitle ? <p className="mt-1 text-muted">{subtitle}</p> : null}
        <div className="mt-6 space-y-6">{children}</div>
      </div>
    </main>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{label}</div>
      {children}
    </div>
  );
}

export function RulesetPicker({ value, onChange }: { value: GameConfig; onChange: (c: GameConfig) => void }) {
  const isBasic = !value.newt && !value.dragonfly && !value.otter;
  const isFull = value.newt && value.dragonfly && value.otter;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="chip text-left" aria-pressed={isBasic} onClick={() => onChange(BASIC_CONFIG)}>
          <div className="font-semibold">Basic</div>
          <div className="text-xs opacity-75">11 tiles each · best to learn</div>
        </button>
        <button type="button" className="chip text-left" aria-pressed={isFull} onClick={() => onChange(FULL_CONFIG)}>
          <div className="font-semibold">Full</div>
          <div className="text-xs opacity-75">14 tiles · all three extras</div>
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(['newt', 'dragonfly', 'otter'] as const).map((b) => (
          <button key={b} type="button" className="chip flex items-center gap-2 py-1.5 pl-1.5" aria-pressed={value[b]} onClick={() => onChange({ ...value, [b]: !value[b] })} title={BUGS[b].short}>
            <PieceIcon bug={b} color="w" size={28} />
            {BUGS[b].name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: Array<{ value: T; label: ReactNode }>; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-2">
      {options.map((o) => (
        <button key={o.value} type="button" className="chip flex-1" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}
