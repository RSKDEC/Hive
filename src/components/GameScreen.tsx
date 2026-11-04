'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  applyUnchecked, BUGS, COLOR_NAMES, configLabel, createGame, describeAction, getLegalActions, getLegalMoves,
  getLegalPlacements, getLiftOptions, hasLiftAbility, moveBlockReason, other, placementBlockReason, topPiece,
  turnNumber, pharaohPlaced, type Action, type Bug, type Color, type GameState, type Hex,
} from '@/engine';
import { useSelection } from '@/store/selection';
import { useAnimationsOn, useSettings } from '@/store/settings';
import { Board } from './Board';
import { PlayerPanel } from './PlayerPanel';
import { Confirm, Modal, SettingsPanel, Toast } from './ui';
import { RulesGuide } from './RulesGuide';
import { PieceIcon } from './PieceArt';

export interface GameController {
  mode: 'local' | 'ai' | 'online';
  state: GameState;
  names: Record<Color, string>;
  /** Colours this device may play right now (both for pass-and-play). Empty for spectators. */
  controls: Color[];
  /** Colour shown at the bottom / left. */
  bottom: Color;
  submit: (a: Action) => void;
  busy?: boolean;
  statusOverride?: string;
  banner?: ReactNode;
  undo?: { label: string; disabled?: boolean; onClick: () => void };
  onResign?: () => void;
  onDraw?: { label: string; onClick: () => void; disabled?: boolean };
  onPlayAgain?: { label: string; onClick: () => void };
  endExtra?: ReactNode;
  tags?: Partial<Record<Color, string>>;
}

export function GameScreen({ ctl }: { ctl: GameController }) {
  const { state, names, controls } = ctl;
  const { selection, select, clear, say, choice, setChoice } = useSelection();
  const settings = useSettings();
  const animate = useAnimationsOn();
  const [panel, setPanel] = useState<null | 'menu' | 'rules' | 'history' | 'end'>(null);
  const [confirm, setConfirm] = useState<null | 'resign' | 'draw'>(null);
  const [recenter, setRecenter] = useState(0);
  const myTurn = !state.result && controls.includes(state.turn) && !ctl.busy;

  // Reset selection whenever the position changes.
  useEffect(() => { clear(); }, [state.history.length, state.turn, clear]);

  // Show the end-of-game dialog once.
  useEffect(() => { if (state.result) setPanel('end'); }, [state.result]);

  // Automatic pass for human players on this device (the server does this for online games).
  useEffect(() => {
    if (ctl.mode === 'online' || !myTurn) return;
    const acts = getLegalActions(state);
    if (acts.length === 1 && acts[0].type === 'pass') {
      say(`${names[state.turn]} has no legal move and must pass.`);
      const t = setTimeout(() => ctl.submit({ type: 'pass' }), 1600);
      return () => clearTimeout(t);
    }
  }, [state, myTurn, ctl, names, say]);

  // --- Derived highlights -----------------------------------------------------------------------
  const { targets, liftSources, liftFrom, selectedHex } = useMemo(() => {
    const empty = { targets: [] as Hex[], liftSources: [] as Hex[], liftFrom: null as Hex | null, selectedHex: null as Hex | null };
    if (!selection || !myTurn) return empty;
    if (selection.kind === 'hand') return { ...empty, targets: getLegalPlacements(state, selection.bug) };
    if (selection.kind === 'board') {
      const lift = hasLiftAbility(state, selection.hex) && pharaohPlaced(state, state.turn) ? [...getLiftOptions(state, selection.hex).keys()] : [];
      return { ...empty, selectedHex: selection.hex, targets: getLegalMoves(state, selection.hex), liftSources: lift };
    }
    return { ...empty, selectedHex: selection.by, liftFrom: selection.from, targets: getLiftOptions(state, selection.by).get(selection.from) ?? [] };
  }, [selection, state, myTurn]);

  const last = state.history.length ? lastMoveOf(state) : null;

  // --- Input ----------------------------------------------------------------------------------------
  const pickHand = (bug: Bug) => {
    if (!myTurn) return;
    if (selection?.kind === 'hand' && selection.bug === bug) return clear();
    const why = placementBlockReason(state, bug);
    if (why) { say(why); return; }
    select({ kind: 'hand', bug });
    if (settings.hints) say(`${BUGS[bug].name}: ${BUGS[bug].short} Tap a highlighted space to place it.`);
  };

  const tap = (h: Hex) => {
    if (!myTurn) {
      const p = topPiece(state.board, h);
      if (p) say(`${COLOR_NAMES[p.color]} ${BUGS[p.bug].name}: ${BUGS[p.bug].short}`);
      else if (!state.result && controls.length) say(`It’s ${names[state.turn]}’s turn.`);
      return;
    }
    if (selection?.kind === 'hand' && targets.includes(h)) return ctl.submit({ type: 'place', bug: selection.bug, to: h });
    if (selection?.kind === 'lift') {
      if (targets.includes(h)) return ctl.submit({ type: 'throw', by: selection.by, from: selection.from, to: h });
      if (h === selection.from) return select({ kind: 'board', hex: selection.by });
    }
    if (selection?.kind === 'board') {
      const isMove = targets.includes(h);
      const isLift = liftSources.includes(h);
      if (isMove && isLift) return setChoice({ hex: h, by: selection.hex });
      if (isMove) return ctl.submit({ type: 'move', from: selection.hex, to: h });
      if (isLift) {
        select({ kind: 'lift', by: selection.hex, from: h });
        if (settings.hints) say('Now tap where to set the lifted tile down.');
        return;
      }
      if (h === selection.hex) return clear();
    }
    const p = topPiece(state.board, h);
    if (!p) {
      if (selection) {
        say(selection.kind === 'hand' ? 'You can’t place there. New tiles must touch your colour and not the other colour.' : 'It can’t move there.');
      }
      return clear();
    }
    if (p.color !== state.turn) {
      say(`${COLOR_NAMES[p.color]} ${BUGS[p.bug].name}: ${BUGS[p.bug].short}`);
      return clear();
    }
    const why = moveBlockReason(state, h);
    const moves = why ? [] : getLegalMoves(state, h);
    const lifts = hasLiftAbility(state, h) && pharaohPlaced(state, state.turn) ? getLiftOptions(state, h).size : 0;
    select({ kind: 'board', hex: h });
    if (why) say(why);
    else if (!moves.length && !lifts) say(`This ${BUGS[p.bug].name} has nowhere to go right now.`);
    else if (settings.hints) say(`${BUGS[p.bug].name}: ${BUGS[p.bug].short}${lifts ? ' Teal marks show tiles it can lift.' : ''}`);
  };

  // --- Text -----------------------------------------------------------------------------------------
  const resultText = state.result
    ? state.result.winner === 'draw'
      ? 'It’s a draw!'
      : `${names[state.result.winner]} wins!`
    : null;
  const status =
    ctl.statusOverride ??
    resultText ??
    (controls.length === 1 && controls[0] === state.turn ? 'Your turn' : controls.length === 1 ? `${names[state.turn]}’s turn` : `${names[state.turn]}’s turn`);

  const forced = !state.result && turnNumber(state) === 4 && !pharaohPlaced(state, state.turn);
  const hint = settings.hints && myTurn && !selection
    ? forced
      ? 'Your Pharaoh must be placed this turn.'
      : state.board.size === 0
        ? 'Pick a creature from your tray to start the oasis. (The Pharaoh can’t go first.)'
        : 'Tap a creature in your tray to place it, or one of yours on the board to move it.'
    : null;

  const topColor = other(ctl.bottom);
  const panelProps = (c: Color) => ({
    state, color: c, name: names[c], active: !state.result && state.turn === c,
    selectedBug: selection?.kind === 'hand' && state.turn === c ? selection.bug : null,
    enabled: myTurn && state.turn === c, forcedPharaoh: forced && state.turn === c, onPick: pickHand,
    large: settings.familyMode, tag: ctl.tags?.[c],
  });

  return (
    <div className="grid h-dvh grid-cols-[minmax(0,1fr)] grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden bg-paper text-ink lg:grid-cols-[280px_minmax(0,1fr)_280px] lg:grid-rows-[auto_minmax(0,1fr)]">
      {/* Header */}
      <header className="flex items-center gap-1 sm:gap-2 border-b border-line bg-paper/95 px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] lg:col-span-3 lg:px-4">
        <Link href="/" className="btn-icon" aria-label="Home" title="Home">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 11 12 4l9 7M5 10v10h14V10" strokeLinejoin="round" /></svg>
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <div className="truncate font-display text-lg font-semibold leading-tight" data-testid="status">
            {!state.result && <span className={`mr-2 inline-block h-3 w-3 rounded-full align-middle ${state.turn === 'w' ? 'border border-[#B8975E] bg-[#F2E3C4]' : 'bg-[#302C33]'}`} />}
            {status}
          </div>
          <div className="truncate text-xs text-muted">{configLabel(state.config)} · move {state.history.length + (state.result ? 0 : 1)}</div>
        </div>
        {ctl.undo ? (
          <button className="btn-icon" onClick={ctl.undo.onClick} disabled={ctl.undo.disabled} title={ctl.undo.label} aria-label={ctl.undo.label}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        ) : null}
        <button className="btn-icon" onClick={() => setRecenter((n) => n + 1)} title="Recentre" aria-label="Recentre board">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeLinecap="round" /></svg>
        </button>
        <button className="btn-icon max-sm:hidden" onClick={() => setPanel('history')} title="Move history" aria-label="Move history">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" /></svg>
        </button>
        <button className="btn-icon" onClick={() => setPanel('rules')} title="How to play" aria-label="How to play">?</button>
        <button className="btn-icon" onClick={() => setPanel('menu')} title="Menu" aria-label="Menu">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" /></svg>
        </button>
      </header>

      {/* Opponent / top player */}
      <div className="border-b border-line lg:col-start-3 lg:row-start-2 lg:border-b-0 lg:border-l">
        <PlayerPanel {...panelProps(topColor)} position="top" />
      </div>

      {/* Board */}
      <main className="board-felt relative min-h-0 overflow-hidden lg:col-start-2 lg:row-start-2">
        <Board
          state={state}
          selected={selectedHex}
          targets={targets}
          liftSources={selection?.kind === 'board' ? liftSources : []}
          liftFrom={liftFrom}
          lastMove={last}
          onTap={tap}
          fitKey={state.history.length}
          recenter={recenter}
          large={settings.familyMode}
          animate={animate}
          label={`Game board. ${status}`}
        />
        <div className="pointer-events-none absolute inset-x-0 top-2 flex flex-col items-center gap-2 px-3">
          {ctl.banner}
          {hint ? <div className="rounded-full bg-paper/90 px-4 py-1.5 text-center text-sm text-ink shadow-sm">{hint}</div> : null}
          {ctl.busy && ctl.mode === 'ai' ? <div className="rounded-full bg-paper/90 px-4 py-1.5 text-sm shadow-sm">Thinking…</div> : null}
        </div>
        {choice ? (
          <div className="absolute inset-x-0 bottom-16 z-10 flex justify-center gap-2">
            <button className="btn btn-primary shadow-lg" onClick={() => { setChoice(null); ctl.submit({ type: 'move', from: choice.by, to: choice.hex }); }}>Climb onto it</button>
            <button className="btn shadow-lg" onClick={() => { select({ kind: 'lift', by: choice.by, from: choice.hex }); }}>Lift it</button>
          </div>
        ) : null}
        <Toast />
      </main>

      {/* This device's player / bottom */}
      <div className="border-t border-line pb-[env(safe-area-inset-bottom)] lg:col-start-1 lg:row-start-2 lg:border-r lg:border-t-0">
        <PlayerPanel {...panelProps(ctl.bottom)} position="bottom" />
      </div>

      {/* Panels */}
      <Modal open={panel === 'menu'} onClose={() => setPanel(null)} title="Game menu">
        <div className="grid gap-2.5">
          <button className="btn" onClick={() => setPanel('history')}>Move history</button>
          <button className="btn" onClick={() => setPanel('rules')}>How to play</button>
          {ctl.undo ? <button className="btn" disabled={ctl.undo.disabled} onClick={() => { setPanel(null); ctl.undo!.onClick(); }}>{ctl.undo.label}</button> : null}
          {ctl.onDraw && !state.result ? <button className="btn" disabled={ctl.onDraw.disabled} onClick={() => { setPanel(null); setConfirm('draw'); }}>{ctl.onDraw.label}</button> : null}
          {ctl.onResign && !state.result ? <button className="btn text-terracotta" onClick={() => { setPanel(null); setConfirm('resign'); }}>Resign</button> : null}
          {ctl.onPlayAgain ? <button className="btn" onClick={() => { setPanel(null); ctl.onPlayAgain!.onClick(); }}>{ctl.onPlayAgain.label}</button> : null}
          <Link className="btn text-center" href="/">Back to home</Link>
        </div>
        <h3 className="mb-1 mt-6 font-display text-lg font-semibold">Settings</h3>
        <SettingsPanel />
      </Modal>

      <Modal open={panel === 'rules'} onClose={() => setPanel(null)} title="How to play" wide>
        <RulesGuide config={state.config} compact />
      </Modal>

      <Modal open={panel === 'history'} onClose={() => setPanel(null)} title="Move history">
        <History state={state} names={names} />
      </Modal>

      <Modal open={panel === 'end' && !!state.result} onClose={() => setPanel(null)}>
        <div className="text-center" data-testid="game-over">
          <Celebration winner={state.result?.winner ?? null} animate={animate} />
          <h2 className="font-display text-3xl font-semibold">{resultText}</h2>
          <p className="mt-2 text-muted">
            {state.result?.reason === 'surround' && state.result.winner !== 'draw' && `${names[other(state.result.winner as Color)]}’s Pharaoh was surrounded.`}
            {state.result?.reason === 'surround' && state.result.winner === 'draw' && 'Both Pharaohs were surrounded at the same time.'}
            {state.result?.reason === 'resign' && state.result.winner !== 'draw' && `${names[other(state.result.winner as Color)]} resigned.`}
            {state.result?.reason === 'agreement' && 'Both players agreed to a draw.'}
          </p>
          <div className="mt-6 grid gap-2.5">
            {ctl.endExtra}
            {ctl.onPlayAgain ? <button className="btn btn-primary" onClick={() => { setPanel(null); ctl.onPlayAgain!.onClick(); }}>{ctl.onPlayAgain.label}</button> : null}
            <button className="btn" onClick={() => setPanel(null)}>Look at the board</button>
            <Link className="btn text-center" href="/">Home</Link>
          </div>
        </div>
      </Modal>

      <Confirm open={confirm === 'resign'} text="Resign this game? Your opponent will win." yes="Resign" onYes={() => { setConfirm(null); ctl.onResign?.(); }} onNo={() => setConfirm(null)} />
      <Confirm open={confirm === 'draw'} text={ctl.mode === 'online' ? 'Offer your opponent a draw?' : 'End the game as a draw?'} yes={ctl.mode === 'online' ? 'Offer draw' : 'Draw'} onYes={() => { setConfirm(null); ctl.onDraw?.onClick(); }} onNo={() => setConfirm(null)} />
    </div>
  );
}

function lastMoveOf(s: GameState): { from?: Hex; to: Hex } | null {
  for (let i = s.history.length - 1; i >= 0; i--) {
    const a = s.history[i];
    if (a.type === 'place') return { to: a.to };
    if (a.type === 'move' || a.type === 'throw') return { from: a.from, to: a.to };
  }
  return null;
}

function History({ state, names }: { state: GameState; names: Record<Color, string> }) {
  const rows = useMemo(() => {
    let s = createGame(state.config);
    return state.history.map((a, i) => {
      const text = describeAction(s, a).replace(/^(Sun|Moon)/, (m) => names[m === 'Sun' ? 'w' : 'b']);
      const color = s.turn;
      const bug: Bug | null = a.type === 'place' ? a.bug : a.type === 'pass' ? null : topPiece(s.board, a.from)?.bug ?? null;
      s = applyUnchecked(s, a);
      return { i, text, color, bug };
    });
  }, [state.history, state.config, names]);
  if (!rows.length) return <p className="text-muted">No moves yet.</p>;
  return (
    <ol className="grid gap-1.5">
      {rows.map((r) => (
        <li key={r.i} className="flex items-center gap-3 rounded-xl bg-ivory/60 px-3 py-1.5">
          <span className="w-6 text-right text-sm tabular-nums text-muted">{r.i + 1}</span>
          {r.bug ? <PieceIcon bug={r.bug} color={r.color} size={28} /> : <span className="w-7" />}
          <span>{r.text}</span>
        </li>
      ))}
    </ol>
  );
}

function Celebration({ winner, animate }: { winner: Color | 'draw' | null; animate: boolean }) {
  if (!winner) return null;
  const bits = Array.from({ length: animate ? 18 : 0 }, (_, i) => i);
  return (
    <div className="relative mx-auto mb-3 h-24 w-24">
      {winner === 'draw' ? (
        <div className="flex h-full items-center justify-center gap-1"><PieceIcon bug="pharaoh" color="w" size={44} /><PieceIcon bug="pharaoh" color="b" size={44} /></div>
      ) : (
        <div className="flex h-full items-center justify-center"><PieceIcon bug="pharaoh" color={winner} size={84} /></div>
      )}
      {bits.map((i) => (
        <span
          key={i}
          className="confetti"
          style={{ '--a': `${(i / bits.length) * 360}deg`, '--d': `${60 + (i % 3) * 18}px`, background: ['#C9A24B', '#6F8B4F', '#C0643F'][i % 3] } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
