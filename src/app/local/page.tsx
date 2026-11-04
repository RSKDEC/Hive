'use client';

import { useCallback, useEffect, useState } from 'react';
import { GameScreen } from '@/components/GameScreen';
import { Field, RulesetPicker, SetupShell } from '@/components/Setup';
import { applyAction, BASIC_CONFIG, createGame, endGame, resign, undoTurns, type Action, type Color, type GameConfig, type GameState } from '@/engine';
import { saves } from '@/lib/saves';
import { useSelection } from '@/store/selection';
import { useSettings } from '@/store/settings';

export default function LocalPage() {
  const nickname = useSettings((s) => s.nickname);
  const say = useSelection((s) => s.say);
  const [game, setGame] = useState<{ state: GameState; names: Record<Color, string> } | null>(null);
  const [config, setConfig] = useState<GameConfig>(BASIC_CONFIG);
  const [names, setNames] = useState<Record<Color, string>>({ w: '', b: '' });
  const [saved, setSaved] = useState<ReturnType<typeof saves.loadLocal>>(null);

  useEffect(() => {
    const s = saves.loadLocal();
    setSaved(s && !s.state.result ? s : null);
    if (s && new URLSearchParams(location.search).has('resume')) setGame({ state: s.state, names: s.names });
    setNames((n) => ({ ...n, w: n.w || nickname }));
  }, [nickname]);

  const update = useCallback((state: GameState, nm: Record<Color, string>) => {
    setGame({ state, names: nm });
    saves.saveLocal(state, nm);
  }, []);

  if (!game) {
    const start = () => {
      const nm = { w: names.w.trim() || 'Sun player', b: names.b.trim() || 'Moon player' };
      update(createGame(config), nm);
    };
    return (
      <SetupShell title="Play on one device" subtitle="Take turns on the same phone, tablet or computer. Works offline.">
        {saved ? (
          <button className="btn btn-gold w-full" onClick={() => setGame({ state: saved.state, names: saved.names })}>
            Continue {saved.names.w} vs {saved.names.b} (move {saved.state.history.length + 1})
          </button>
        ) : null}
        <Field label="Players">
          <div className="grid gap-2">
            <label className="flex items-center gap-3"><span className="h-5 w-5 shrink-0 rounded-full border-2 border-[#B9A57F] bg-[#F4ECDD]" /><input className="field" placeholder="Sun (goes first)" value={names.w} maxLength={20} onChange={(e) => setNames({ ...names, w: e.target.value })} /></label>
            <label className="flex items-center gap-3"><span className="h-5 w-5 shrink-0 rounded-full bg-[#34302C]" /><input className="field" placeholder="Moon" value={names.b} maxLength={20} onChange={(e) => setNames({ ...names, b: e.target.value })} /></label>
          </div>
        </Field>
        <Field label="Tiles"><RulesetPicker value={config} onChange={setConfig} /></Field>
        <button className="btn btn-primary w-full" onClick={start} data-testid="start-local">Start game</button>
      </SetupShell>
    );
  }

  const { state, names: nm } = game;
  const submit = (a: Action) => {
    try { update(applyAction(state, a), nm); } catch (e) { say((e as Error).message); }
  };
  const undoable = state.history.some((a) => a.type !== 'pass');
  return (
    <GameScreen
      ctl={{
        mode: 'local',
        state,
        names: nm,
        controls: ['w', 'b'],
        bottom: state.result ? 'w' : state.turn,
        submit,
        undo: {
          label: 'Take back',
          disabled: !undoable,
          onClick: () => {
            let n = 1;
            while (state.history.length > n && state.history[state.history.length - n].type === 'pass') n++;
            update(undoTurns(state, n), nm);
          },
        },
        onResign: () => update(resign(state, state.turn), nm),
        onDraw: { label: 'Agree to a draw', onClick: () => update(endGame(state, { winner: 'draw', reason: 'agreement' }), nm) },
        onPlayAgain: { label: 'New game', onClick: () => update(createGame(state.config), nm) },
      }}
    />
  );
}
