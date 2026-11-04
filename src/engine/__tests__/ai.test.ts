import { describe, expect, it } from 'vitest';
import { applyAction, createGame, validateAction, FULL_CONFIG, articulationPoints, canLift } from '..';
import { chooseAction, type AiLevel } from '../ai';
import { position } from './helpers';

describe('computer opponent', () => {
  for (const level of ['easy', 'medium', 'hard'] as AiLevel[]) {
    it(`${level} plays only legal moves`, () => {
      let s = createGame(FULL_CONFIG);
      for (let i = 0; i < 16 && !s.result; i++) {
        const a = chooseAction(s, level, { timeMs: 150 });
        expect(validateAction(s, a)).toEqual({ ok: true });
        s = applyAction(s, a);
      }
    });
  }

  it('takes an immediate win', () => {
    const s = position({ '0,0': 'bT', '1,0': 'wT', '1,-1': 'wF', '0,-1': 'wF', '-1,0': 'wC', '-1,1': 'wC', '1,1': 'wM' });
    for (const level of ['easy', 'medium', 'hard'] as AiLevel[]) {
      expect(applyAction(s, chooseAction(s, level, { timeMs: 200 })).result?.winner).toBe('w');
    }
  });

  it('medium and hard block a one-move threat', () => {
    // Black to move; White threatens Minnow 1,1 → 0,1 completing the surround of the black Turtle at 0,0.
    const s = position({ '0,0': 'bT', '1,0': 'wT', '1,-1': 'wF', '0,-1': 'wF', '-1,0': 'wC', '-1,1': 'bC', '1,1': 'wM', '-1,2': 'bM' }, { turn: 'b' });
    for (const level of ['medium', 'hard'] as AiLevel[]) {
      const after = applyAction(s, chooseAction(s, level, { timeMs: 500 }));
      // White must not have an immediate win now.
      const v = validateAction(after, { type: 'move', from: '1,1', to: '0,1' });
      const wins = v.ok && applyAction(after, { type: 'move', from: '1,1', to: '0,1' }).result?.winner === 'w';
      expect(wins).toBe(false);
    }
  });
});

describe('articulation points agree with canLift', () => {
  it('on a branching pond', () => {
    const s = position({ '0,0': 'wT', '1,0': 'bT', '2,0': 'bF', '-1,0': 'wF', '-1,1': 'wC', '1,-1': 'bC' });
    const ap = articulationPoints(s.board);
    for (const h of s.board.keys()) expect(ap.has(h)).toBe(!canLift(s.board, h));
  });
});
