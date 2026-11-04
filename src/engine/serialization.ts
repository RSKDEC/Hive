import type { Action, GameConfig, GameResult, GameState } from './types';
import { applyAction, createGame, endGame } from './game-state';
import { normalizeConfig } from './pieces';

export interface SerializedGame {
  v: 1;
  config: GameConfig;
  actions: Action[];
  /** Set when the game ended by resignation or agreement (surrounds are re-derived). */
  ending?: GameResult | null;
}

export function serialize(s: GameState): SerializedGame {
  return {
    v: 1,
    config: s.config,
    actions: s.history,
    ending: s.result && s.result.reason !== 'surround' ? s.result : null,
  };
}

/** Rebuilds a game by replaying (and re-validating) every action. Throws on corrupt data. */
export function deserialize(data: SerializedGame): GameState {
  let s = createGame(normalizeConfig(data.config));
  for (const a of data.actions ?? []) s = applyAction(s, a);
  if (data.ending) s = endGame(s, data.ending);
  return s;
}

export function replay(config: GameConfig, actions: Action[]): GameState {
  return deserialize({ v: 1, config, actions });
}

/** Removes the last `n` turns. */
export function undoTurns(s: GameState, n: number): GameState {
  return replay(s.config, s.history.slice(0, Math.max(0, s.history.length - n)));
}

export function actionKey(a: Action): string {
  switch (a.type) {
    case 'place': return `place:${a.bug}:${a.to}`;
    case 'move': return `move:${a.from}:${a.to}`;
    case 'throw': return `throw:${a.by}:${a.from}:${a.to}`;
    default: return 'pass';
  }
}

/** Light structural validation for untrusted JSON (the rules check happens in validateAction). */
export function parseAction(input: unknown): Action | null {
  if (!input || typeof input !== 'object') return null;
  const o = input as Record<string, unknown>;
  const isHex = (v: unknown): v is string => typeof v === 'string' && /^-?\d{1,3},-?\d{1,3}$/.test(v);
  switch (o.type) {
    case 'place': return typeof o.bug === 'string' && isHex(o.to) ? { type: 'place', bug: o.bug as never, to: o.to } : null;
    case 'move': return isHex(o.from) && isHex(o.to) ? { type: 'move', from: o.from, to: o.to } : null;
    case 'throw': return isHex(o.by) && isHex(o.from) && isHex(o.to) ? { type: 'throw', by: o.by, from: o.from, to: o.to } : null;
    case 'pass': return { type: 'pass' };
    default: return null;
  }
}
