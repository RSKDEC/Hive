'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PieceIcon } from '@/components/PieceArt';
import { Modal, SettingsPanel } from '@/components/ui';
import { saves, type OnlineEntry } from '@/lib/saves';
import { useMounted } from '@/lib/use-mounted';
import { useSettings } from '@/store/settings';
import type { Bug, Color } from '@/engine';

interface Resumable { href: string; title: string; detail: string }

export default function Home() {
  const mounted = useMounted();
  const { nickname, setNickname } = useSettings();
  const [resume, setResume] = useState<Resumable[]>([]);
  const [showResume, setShowResume] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const list: Resumable[] = [];
    const local = saves.loadLocal();
    if (local && !local.state.result && local.state.history.length) list.push({ href: '/local?resume=1', title: 'Game on this device', detail: `${local.names.w} vs ${local.names.b} · move ${local.state.history.length + 1}` });
    const ai = saves.loadAi();
    if (ai && !ai.state.result && ai.state.history.length) list.push({ href: '/computer?resume=1', title: 'Game vs computer', detail: `${ai.level} · move ${ai.state.history.length + 1}` });
    for (const g of saves.onlineGames().filter((e: OnlineEntry) => e.status !== 'finished').slice(0, 4)) {
      list.push({ href: `/g/${g.id}`, title: g.opponent ? `Online vs ${g.opponent}` : 'Online game (waiting)', detail: new Date(g.updatedAt).toLocaleDateString() });
    }
    setResume(list);
  }, []);

  return (
    <main className="board-felt relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <button className="btn-icon absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))]" onClick={() => setShowSettings(true)} aria-label="Settings" title="Settings">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
      </button>

      <div className="w-full max-w-md">
        <Logo />
        <h1 className="mt-4 text-center font-display text-5xl font-semibold tracking-tight sm:text-6xl">Pondlife</h1>
        <p className="mx-auto mt-2 max-w-xs text-center text-muted">A tile game of tactics for two. Surround the other Turtle before yours is caught.</p>

        <div className="card mt-8 p-5 sm:p-6">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold uppercase tracking-wide text-muted">Your nickname</span>
            <input
              className="field"
              value={mounted ? nickname : ''}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. Grandpa"
              maxLength={20}
              autoComplete="nickname"
            />
          </label>
          <nav className="mt-5 grid gap-2.5">
            <Link href="/online" className="btn btn-primary justify-between">
              <span>Play Online</span><span className="text-sm font-normal opacity-75">send a link</span>
            </Link>
            <Link href="/local" className="btn justify-between">
              <span>Play on One Device</span><span className="text-sm font-normal text-muted">pass &amp; play</span>
            </Link>
            <Link href="/computer" className="btn justify-between">
              <span>Play Computer</span><span className="text-sm font-normal text-muted">3 levels</span>
            </Link>
            <div className="grid grid-cols-2 gap-2.5">
              <Link href="/rules" className="btn">How to Play</Link>
              <button className="btn" disabled={!resume.length} onClick={() => setShowResume(true)}>
                Resume{resume.length ? ` (${resume.length})` : ''}
              </button>
            </div>
          </nav>
        </div>
        <p className="mt-6 text-center text-xs text-muted">No account needed. Your games stay on your devices.</p>
      </div>

      <Modal open={showResume} onClose={() => setShowResume(false)} title="Resume a game">
        <div className="grid gap-2">
          {resume.map((r) => (
            <Link key={r.href} href={r.href} className="btn flex-col items-start gap-0 text-left">
              <span>{r.title}</span>
              <span className="text-sm font-normal text-muted">{r.detail}</span>
            </Link>
          ))}
        </div>
      </Modal>
      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Settings">
        <SettingsPanel />
      </Modal>
    </main>
  );
}

function Logo() {
  const tiles: Array<[Bug, Color, number, number]> = [
    ['frog', 'b', -46, -14], ['turtle', 'w', 0, 12], ['crab', 'b', 46, -14], ['snail', 'w', -46, 38], ['minnow', 'b', 46, 38],
  ];
  return (
    <div className="relative mx-auto h-40 w-56" aria-hidden>
      {tiles.map(([bug, color, x, y], i) => (
        <div key={i} className="absolute left-1/2 top-1/2" style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y - 12}px))` }}>
          <PieceIcon bug={bug} color={color} size={i === 1 ? 70 : 56} />
        </div>
      ))}
    </div>
  );
}
