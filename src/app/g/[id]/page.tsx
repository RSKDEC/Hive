'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameScreen } from '@/components/GameScreen';
import { PieceIcon } from '@/components/PieceArt';
import { SetupShell } from '@/components/Setup';
import { applyAction, COLOR_NAMES, configLabel, deserialize, other, type Action, type Color, type GameState } from '@/engine';
import { api } from '@/lib/api';
import { subscribeToGame } from '@/lib/realtime-client';
import { saves } from '@/lib/saves';
import { useMounted } from '@/lib/use-mounted';
import { useSelection } from '@/store/selection';
import { useSettings } from '@/store/settings';
import type { GameView } from '@/server/types';

export default function OnlineGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <OnlineGame key={id} id={id} />;
}

function OnlineGame({ id }: { id: string }) {
  const router = useRouter();
  const say = useSelection((s) => s.say);
  const [view, setView] = useState<GameView | null>(null);
  const [missing, setMissing] = useState(false);
  const [connected, setConnected] = useState(true);
  const [live, setLive] = useState(false);
  const [optimistic, setOptimistic] = useState<GameState | null>(null);
  const [sending, setSending] = useState(false);
  const viewRef = useRef<GameView | null>(null);
  viewRef.current = view;

  const accept = useCallback((g: GameView | null | undefined) => {
    if (!g) return;
    const cur = viewRef.current;
    if (cur && g.revision < cur.revision) return; // never go backwards
    setView(g);
    const opp = g.you ? g.players[other(g.you)]?.nickname ?? null : null;
    if (g.you) saves.rememberOnline({ id: g.id, opponent: opp, you: g.you, status: g.status, updatedAt: Date.now() });
  }, []);

  const load = useCallback(async () => {
    const res = await api.get(id);
    if (res.ok) { setConnected(true); accept(res.game); }
    else if (res.status === 404) setMissing(true);
    else if (res.status === 0) setConnected(false);
  }, [id, accept]);

  // Initial load, realtime notifications, and polling as a safety net.
  useEffect(() => {
    load();
    const unsub = subscribeToGame(id, (rev) => { if (!viewRef.current || rev > viewRef.current.revision) load(); }, setLive);
    const onWake = () => load();
    window.addEventListener('online', onWake);
    window.addEventListener('focus', onWake);
    document.addEventListener('visibilitychange', onWake);
    return () => {
      unsub();
      window.removeEventListener('online', onWake);
      window.removeEventListener('focus', onWake);
      document.removeEventListener('visibilitychange', onWake);
    };
  }, [id, load]);

  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, live ? 10000 : 2500);
    return () => clearInterval(t);
  }, [live, load]);

  const state = useMemo(() => {
    if (!view) return null;
    try { return deserialize({ v: 1, config: view.config, actions: view.actions, ending: view.ending }); } catch { return null; }
  }, [view]);

  const submit = useCallback(async (a: Action) => {
    const v = viewRef.current;
    if (!v || !state || sending) return;
    try { setOptimistic(applyAction(state, a)); } catch (e) { say((e as Error).message); return; }
    setSending(true);
    let res = await api.move(id, v.revision, a);
    for (let attempt = 1; !res.ok && res.status === 0 && attempt <= 4; attempt++) {
      setConnected(false);
      await new Promise((r) => setTimeout(r, 800 * attempt));
      res = await api.move(id, v.revision, a);
    }
    setSending(false);
    setOptimistic(null);
    if (res.ok) { setConnected(true); accept(res.game); return; }
    if (res.game) accept(res.game);
    say(res.status === 0 ? 'Couldn’t reach the server. Check your connection and try again.' : res.error ?? 'Move rejected.');
    if (res.status !== 0) setConnected(true);
  }, [id, state, sending, accept, say]);

  const act = useCallback(async (req: Parameters<typeof api.act>[1]) => {
    const res = await api.act(id, req);
    if (res.game) accept(res.game);
    if (!res.ok) say(res.error ?? 'That didn’t work.');
    return res;
  }, [id, accept, say]);

  if (missing) {
    return (
      <SetupShell title="Game not found" subtitle="The link may be mistyped, or the game was removed.">
        <Link href="/online" className="btn btn-primary w-full">Start a new online game</Link>
      </SetupShell>
    );
  }
  if (!view || !state) {
    return <main className="board-felt grid min-h-dvh place-items-center text-muted" aria-busy>Loading game…</main>;
  }

  const freeSeat = !view.players.w || !view.players.b;
  if (!view.you && view.status === 'waiting' && freeSeat) return <JoinCard view={view} onJoined={accept} />;
  if (view.you && view.status === 'waiting') return <WaitingCard view={view} />;

  const names: Record<Color, string> = { w: view.players.w?.nickname ?? 'Sun', b: view.players.b?.nickname ?? 'Moon' };
  const me = view.you;
  const opp = me ? other(me) : null;
  const shown = optimistic ?? state;
  const offer = view.offer;
  const myMoves = me ? state.history.filter((_, i) => (i % 2 === 0 ? 'w' : 'b') === me).length : 0;

  const banner = (
    <>
      {!me ? <Pill>You’re watching this game</Pill> : null}
      {!connected ? <Pill tone="warn">Reconnecting…</Pill> : null}
      {offer && me && offer.by !== me && !state.result ? (
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-paper px-4 py-2.5 text-sm shadow-lg" role="alert">
          <span>{names[offer.by]} {offer.kind === 'undo' ? 'asks to take back their last move.' : 'offers a draw.'}</span>
          <button className="btn min-h-0 px-3 py-1.5 text-sm btn-primary" onClick={() => act({ kind: 'respond', accept: true })} data-testid="accept-offer">{offer.kind === 'undo' ? 'Allow' : 'Accept'}</button>
          <button className="btn min-h-0 px-3 py-1.5 text-sm" onClick={() => act({ kind: 'respond', accept: false })}>Decline</button>
        </div>
      ) : null}
      {offer && me && offer.by === me && !state.result ? (
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-paper px-4 py-2 text-sm shadow">
          <span>Waiting for {names[other(me)]} to answer your {offer.kind === 'undo' ? 'take-back request' : 'draw offer'}…</span>
          <button className="btn min-h-0 px-3 py-1 text-sm" onClick={() => act({ kind: 'cancel-offer' })}>Cancel</button>
        </div>
      ) : null}
      {state.result && view.rematchId ? (
        <Link href={`/g/${view.rematchId}`} className="pointer-events-auto btn btn-gold shadow-lg" data-testid="go-rematch">Rematch ready — play again →</Link>
      ) : null}
    </>
  );

  const statusOverride = state.result
    ? undefined
    : !me
      ? `Watching · ${names[state.turn]}’s turn`
      : state.turn === me
        ? sending ? 'Sending…' : 'Your turn'
        : `Waiting for ${names[state.turn]}…`;

  return (
    <GameScreen
      ctl={{
        mode: 'online',
        state: shown,
        names,
        controls: me && !sending ? [me] : [],
        bottom: me ?? 'w',
        submit,
        busy: sending,
        statusOverride,
        banner,
        tags: me && opp ? { [me]: '(you)' } : undefined,
        undo: me ? { label: 'Ask to take back', disabled: !!offer || myMoves === 0 || !!state.result, onClick: () => act({ kind: 'offer', offer: 'undo' }).then((r) => r.ok && say('Take-back request sent.')) } : undefined,
        onDraw: me ? { label: 'Offer a draw', disabled: !!offer, onClick: () => act({ kind: 'offer', offer: 'draw' }).then((r) => r.ok && say('Draw offer sent.')) } : undefined,
        onResign: me ? () => act({ kind: 'resign' }) : undefined,
        onPlayAgain: me && state.result ? {
          label: view.rematchId ? 'Go to rematch' : 'Rematch',
          onClick: async () => {
            const res = view.rematchId ? { ok: true, game: view } : await act({ kind: 'rematch' });
            const next = res.game?.rematchId;
            if (res.ok && next) router.push(`/g/${next}`);
          },
        } : undefined,
      }}
    />
  );
}

function Pill({ children, tone }: { children: React.ReactNode; tone?: 'warn' }) {
  return <div className={`rounded-full px-4 py-1.5 text-sm shadow-sm ${tone === 'warn' ? 'bg-terracotta text-white' : 'bg-paper/90'}`}>{children}</div>;
}

function JoinCard({ view, onJoined }: { view: GameView; onJoined: (g: GameView | null) => void }) {
  const mounted = useMounted();
  const { nickname, setNickname } = useSettings();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const host = view.players.w ?? view.players.b;
  const seat: Color = view.players.w ? 'b' : 'w';
  const join = async () => {
    if (!nickname.trim()) { setError('Please enter your nickname.'); return; }
    setBusy(true);
    const res = await api.join(view.id, nickname.trim());
    setBusy(false);
    if (res.game) onJoined(res.game);
    if (!res.ok) setError(res.error ?? 'Could not join.');
  };
  return (
    <SetupShell title={`${host?.nickname ?? 'Someone'} invited you to play`} subtitle={`A game of Oasis · ${configLabel(view.config)} tiles`}>
      <div className="flex items-center gap-3 rounded-2xl bg-ivory/60 p-3">
        <PieceIcon bug="pharaoh" color={seat} size={44} />
        <p className="text-sm">You’ll play <b>{COLOR_NAMES[seat]}</b>{seat === 'w' ? ' and move first' : ''}. New to the game? The board shows every legal move for you.</p>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold uppercase tracking-wide text-muted">Your nickname</span>
        <input className="field" value={mounted ? nickname : ''} onChange={(e) => setNickname(e.target.value)} placeholder="e.g. Auntie Sara" maxLength={20} onKeyDown={(e) => e.key === 'Enter' && join()} data-testid="nickname" />
      </label>
      {error ? <p className="text-sm font-medium text-terracotta" role="alert">{error}</p> : null}
      <button className="btn btn-primary w-full" disabled={busy} onClick={join} data-testid="join-game">{busy ? 'Joining…' : 'Join game'}</button>
      <Link href="/rules" className="block text-center text-sm text-muted underline">How to play</Link>
    </SetupShell>
  );
}

function WaitingCard({ view }: { view: GameView }) {
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState('');
  useEffect(() => setLink(`${location.origin}/g/${view.id}`), [view.id]);
  const me = view.you!;
  const message = `Come play Oasis with me! ${link}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* select fallback below */ }
  };
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: 'Oasis', text: 'Come play Oasis with me!', url: link }); } catch { /* cancelled */ } }
    else copy();
  };
  return (
    <SetupShell title="Invite your opponent" subtitle="Send this private link. The game starts as soon as they join.">
      <div className="rounded-2xl border border-dashed border-gold bg-gold/10 p-3">
        <input readOnly value={link} className="w-full bg-transparent text-center font-mono text-sm outline-none" onFocus={(e) => e.target.select()} aria-label="Invite link" data-testid="invite-link" />
      </div>
      <div className="grid gap-2.5 sm:grid-cols-3">
        <a className="btn btn-gold" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">WhatsApp</a>
        <button className="btn" onClick={share}>Share…</button>
        <button className="btn" onClick={copy}>{copied ? 'Copied!' : 'Copy link'}</button>
      </div>
      <div className="flex items-center gap-3 rounded-2xl bg-ivory/60 p-3 text-sm">
        <span className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-moss opacity-60" /><span className="relative inline-flex h-3 w-3 rounded-full bg-moss" /></span>
        <span>Waiting for someone to join… You’re playing <b>{COLOR_NAMES[me]}</b> · {configLabel(view.config)} tiles.</span>
      </div>
      <p className="text-xs text-muted">Only the first person to open the link gets the seat. Anyone else who opens it can only watch.</p>
    </SetupShell>
  );
}
