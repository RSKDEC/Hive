'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GameScreen } from '@/components/GameScreen';
import { Field, RulesetPicker, Segmented, SetupShell } from '@/components/Setup';
import { applyAction, BASIC_CONFIG, createGame, other, resign, serialize, undoTurns, validateAction, type Action, type Color, type GameConfig, type GameState } from '@/engine';
import { chooseAction, type AiLevel } from '@/engine/ai';
import { saves } from '@/lib/saves';
import { useSelection } from '@/store/selection';
import { useSettings } from '@/store/settings';

const LEVELS: Array<{ value: AiLevel; label: string }> = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

/** Asks the AI (in a Web Worker when available) for a move. */
function useAiPlayer() {
  const worker = useRef<Worker | null>(null);
  const seq = useRef(0);
  useEffect(() => {
    try { worker.current = new Worker(new URL('../../lib/ai.worker.ts', import.meta.url)); } catch { worker.current = null; }
    return () => worker.current?.terminate();
  }, []);
  return useCallback((state: GameState, level: AiLevel): Promise<Action> => {
    const id = ++seq.current;
    const w = worker.current;
    const fallback = () => new Promise<Action>((res) => setTimeout(() => res(chooseAction(state, level, { timeMs: 1200 })), 30));
    if (!w) return fallback();
    return new Promise<Action>((resolve) => {
      const onMsg = (e: MessageEvent) => {
        if (e.data?.id !== id) return;
        w.removeEventListener('message', onMsg);
        if (e.data.action) resolve(e.data.action); else fallback().then(resolve);
      };
      w.addEventListener('message', onMsg);
      w.postMessage({ id, game: serialize(state), level });
    });
  }, []);
}

export default function ComputerPage() {
  const nickname = useSettings((s) => s.nickname);
  const say = useSelection((s) => s.say);
  const think = useAiPlayer();
  const [game, setGame] = useState<{ state: GameState; human: Color; level: AiLevel } | null>(null);
  const [config, setConfig] = useState<GameConfig>(BASIC_CONFIG);
  const [level, setLevel] = useState<AiLevel>('easy');
  const [human, setHuman] = useState<Color | 'random'>('w');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<ReturnType<typeof saves.loadAi>>(null);
  const token = useRef(0);

  useEffect(() => {
    const s = saves.loadAi();
    setSaved(s && !s.state.result ? s : null);
    if (s && !s.state.result && new URLSearchParams(location.search).has('resume')) setGame({ state: s.state, human: s.human, level: s.level });
  }, []);

  const update = useCallback((g: { state: GameState; human: Color; level: AiLevel }) => {
    setGame(g);
    saves.saveAi(g.state, g.human, g.level);
  }, []);

  // Computer's turn.
  useEffect(() => {
    if (!game || game.state.result || game.state.turn === game.human) return;
    const my = ++token.current;
    setBusy(true);
    const started = Date.now();
    think(game.state, game.level).then((a) => {
      const delay = Math.max(0, 600 - (Date.now() - started)); // a short, natural pause
      setTimeout(() => {
        if (token.current !== my) return; // position changed (undo / new game)
        setBusy(false);
        if (validateAction(game.state, a).ok) update({ ...game, state: applyAction(game.state, a) });
      }, delay);
    });
    return () => { token.current++; setBusy(false); };
  }, [game, think, update]);

  if (!game) {
    const start = () => {
      const h: Color = human === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : human;
      update({ state: createGame(config), human: h, level });
    };
    return (
      <SetupShell title="Play the computer" subtitle="A patient opponent for practice. It follows exactly the same rules.">
        {saved ? <button className="btn btn-gold w-full" onClick={() => setGame({ state: saved.state, human: saved.human, level: saved.level })}>Continue saved game (move {saved.state.history.length + 1})</button> : null}
        <Field label="Difficulty"><Segmented value={level} options={LEVELS} onChange={setLevel} /></Field>
        <Field label="You play">
          <Segmented<Color | 'random'> value={human} onChange={setHuman} options={[{ value: 'w', label: 'Sun (first)' }, { value: 'b', label: 'Moon' }, { value: 'random', label: 'Random' }]} />
        </Field>
        <Field label="Tiles"><RulesetPicker value={config} onChange={setConfig} /></Field>
        <button className="btn btn-primary w-full" onClick={start} data-testid="start-ai">Start game</button>
      </SetupShell>
    );
  }

  const { state } = game;
  const aiName = `Computer (${game.level})`;
  const names: Record<Color, string> = { [game.human]: nickname || 'You', [other(game.human)]: aiName } as Record<Color, string>;
  // Undo back to the human's previous turn (skipping the computer's reply).
  const humanMoves = state.history.filter((_, i) => (i % 2 === 0 ? 'w' : 'b') === game.human).length;
  return (
    <GameScreen
      ctl={{
        mode: 'ai',
        state,
        names,
        controls: [game.human],
        bottom: game.human,
        busy,
        submit: (a) => { try { update({ ...game, state: applyAction(state, a) }); } catch (e) { say((e as Error).message); } },
        undo: {
          label: 'Take back',
          disabled: humanMoves === 0,
          onClick: () => {
            let s = state;
            do { s = undoTurns(s, 1); } while (s.history.length && s.turn !== game.human);
            update({ ...game, state: s });
          },
        },
        onResign: () => update({ ...game, state: resign(state, game.human) }),
        onPlayAgain: { label: 'Play again', onClick: () => update({ ...game, state: createGame(state.config) }) },
        tags: { [other(game.human)]: '🤖' },
      }}
    />
  );
}
