import { describe, expect, it } from 'vitest';
import {
  applyAction, createGame, deserialize, FULL_CONFIG, BASIC_CONFIG, getLegalActions, isConnected, parseAction,
  serialize, validateAction, actionKey, undoTurns, resign,
} from '..';

// Small deterministic PRNG so failures are reproducible.
function rng(seed: number) {
  return () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
}

describe('random play invariants', () => {
  for (const [label, config] of [['basic', BASIC_CONFIG], ['full', FULL_CONFIG]] as const) {
    it(`keeps the oasis connected and replays identically (${label})`, () => {
      const rand = rng(label === 'basic' ? 7 : 42);
      for (let g = 0; g < 25; g++) {
        let s = createGame(config);
        for (let i = 0; i < 120 && !s.result; i++) {
          const actions = getLegalActions(s);
          const keys = new Set(actions.map(actionKey));
          expect(keys.size).toBe(actions.length); // no duplicates
          const a = actions[Math.floor(rand() * actions.length)];
          expect(validateAction(s, a)).toEqual({ ok: true });
          s = applyAction(s, a);
          expect(isConnected(s.board)).toBe(true);
          const pieces = [...s.board.values()].flat().length;
          const inHand = Object.values(s.hands.w).concat(Object.values(s.hands.b)).reduce((x, y) => x + y, 0);
          expect(pieces + inHand).toBe(config === FULL_CONFIG ? 28 : 22);
        }
        const copy = deserialize(JSON.parse(JSON.stringify(serialize(s))));
        expect([...copy.board.entries()]).toEqual([...s.board.entries()]);
        expect(copy.result).toEqual(s.result);
      }
    });
  }
});

describe('serialization', () => {
  it('round-trips resignations', () => {
    let s = createGame();
    s = applyAction(s, { type: 'place', bug: 'jerboa', to: '0,0' });
    s = resign(s, 'b');
    const back = deserialize(serialize(s));
    expect(back.result).toEqual({ winner: 'w', reason: 'resign' });
  });

  it('rejects tampered histories', () => {
    const bad = { v: 1 as const, config: BASIC_CONFIG, actions: [{ type: 'place' as const, bug: 'pharaoh' as const, to: '0,0' }] };
    expect(() => deserialize(bad)).toThrow();
  });

  it('parses only well-formed actions', () => {
    expect(parseAction({ type: 'move', from: '0,0', to: '1,0' })).toEqual({ type: 'move', from: '0,0', to: '1,0' });
    expect(parseAction({ type: 'move', from: '0,0' })).toBeNull();
    expect(parseAction({ type: 'move', from: 'x', to: '1,0' })).toBeNull();
    expect(parseAction('pass')).toBeNull();
    expect(parseAction({ type: 'drop table' })).toBeNull();
  });

  it('undo rewinds turns', () => {
    let s = createGame();
    s = applyAction(s, { type: 'place', bug: 'jerboa', to: '0,0' });
    s = applyAction(s, { type: 'place', bug: 'jerboa', to: '1,0' });
    const u = undoTurns(s, 1);
    expect(u.turn).toBe('b');
    expect(u.board.size).toBe(1);
  });
});
