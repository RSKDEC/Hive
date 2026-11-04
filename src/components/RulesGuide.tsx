'use client';

import { useEffect, useMemo, useState } from 'react';
import { applyUnchecked, BASE_BUGS, BUGS, FULL_CONFIG, getLegalMoves, getLiftOptions, type Bug, type GameConfig } from '@/engine';
import { demoFor } from '@/lib/demo';
import { useAnimationsOn } from '@/store/settings';
import { Board } from './Board';
import { PieceIcon } from './PieceArt';

/** Looping demonstration of a creature's movement, computed by the real rules engine. */
export function MovementDemo({ bug }: { bug: Bug }) {
  const demo = useMemo(() => demoFor(bug), [bug]);
  const animate = useAnimationsOn();
  const [step, setStep] = useState(0); // even = start position, odd = after action (step-1)/2
  useEffect(() => {
    if (!demo.actions.length) return;
    const t = setInterval(() => setStep((s) => (s + 1) % (demo.actions.length * 2)), 1300);
    return () => clearInterval(t);
  }, [demo]);
  const frame = useMemo(() => {
    const cells = new Set(demo.state.board.keys());
    for (const a of demo.actions) if (a.type !== 'pass') cells.add(a.to);
    return [...cells];
  }, [demo]);
  const showingMove = step % 2 === 1;
  const action = demo.actions[Math.floor(step / 2)];
  const state = showingMove && action ? applyUnchecked(demo.state, action) : demo.state;
  const targets = showingMove ? [] : bug === 'otter' && action?.type === 'throw'
    ? getLiftOptions(demo.state, demo.piece).get(action.from) ?? []
    : getLegalMoves(demo.state, demo.piece);
  return (
    <div className="board-felt h-48 overflow-hidden rounded-2xl sm:h-52" aria-hidden>
      <Board
        state={state}
        selected={showingMove ? null : demo.piece}
        liftFrom={!showingMove && action?.type === 'throw' ? action.from : null}
        targets={targets}
        fitKey="demo"
        frame={frame}
        interactive={false}
        animate={animate}
        label={`${BUGS[bug].name} movement example`}
      />
    </div>
  );
}

export function RulesGuide({ config = FULL_CONFIG, compact }: { config?: GameConfig; compact?: boolean }) {
  const bugs: Bug[] = [...BASE_BUGS, ...(['newt', 'dragonfly', 'otter'] as const).filter((b) => config[b] || !compact)];
  return (
    <div className="space-y-6 text-[15px] leading-relaxed">
      <section>
        <h3 className="mb-1 font-display text-xl font-semibold">The goal</h3>
        <p>Surround the other player’s <b>Turtle</b> on all six sides. Tiles of <i>either</i> colour count. If both Turtles are surrounded by the same move, the game is a draw.</p>
      </section>
      <section>
        <h3 className="mb-1 font-display text-xl font-semibold">Your turn</h3>
        <p>Sun always goes first. On each turn, do one thing: <b>place</b> a new tile from your tray, or <b>move</b> one of your tiles already in the pond. There is no board — the tiles themselves make the pond.</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li><b>Placing:</b> a new tile must touch at least one tile of your colour and must not touch any of the other colour. (The first two tiles of the game are the exception: the second one goes next to the first.) A stack counts as the colour of its top tile.</li>
          <li><b>Turtle deadline:</b> the Turtle can’t be your first tile, but it must be placed by your 4th turn. Until it is, you can’t move any tiles.</li>
          <li><b>One Pond:</b> all tiles must stay joined in one group, even while a tile is moving. A tile whose removal would split the pond can’t move.</li>
          <li><b>Room to slide:</b> creatures that slide can’t squeeze through a gap between two tiles, and must stay in contact with the pond as they go.</li>
          <li><b>Stacks:</b> Snails (and Newts copying them) can climb on top. A covered tile can’t move, and new tiles can’t be placed on top.</li>
          <li>If you have no legal move, your turn is skipped automatically.</li>
        </ul>
      </section>
      <section>
        <h3 className="mb-3 font-display text-xl font-semibold">The creatures</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {bugs.map((bug) => (
            <article key={bug} className="rounded-3xl border border-line bg-ivory/50 p-3">
              <div className="mb-2 flex items-center gap-3">
                <PieceIcon bug={bug} color="w" size={44} />
                <div>
                  <h4 className="font-display text-lg font-semibold leading-tight">{BUGS[bug].name} <span className="text-sm font-normal text-muted">×{BUGS[bug].count}{BUGS[bug].expansion ? ' · expansion' : ''}</span></h4>
                  <p className="text-sm text-muted">{BUGS[bug].short}</p>
                </div>
              </div>
              <MovementDemo bug={bug} />
              <p className="mt-2 text-sm">{BUGS[bug].long}</p>
            </article>
          ))}
        </div>
      </section>
      <section>
        <h3 className="mb-1 font-display text-xl font-semibold">Tips for new players</h3>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Get your Turtle out early and keep an open space next to it.</li>
          <li>Minnows are powerful: they can reach almost anywhere and pin enemy tiles in place.</li>
          <li>A Snail sitting on the enemy Turtle stops it from moving.</li>
          <li>Tap any tile to see what it does. Gold outlines show every legal spot.</li>
        </ul>
      </section>
    </div>
  );
}
