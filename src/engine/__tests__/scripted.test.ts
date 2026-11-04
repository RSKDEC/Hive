import { expect, it } from 'vitest';
import { applyAction, createGame } from '..';
import { SCRIPTED_WIN } from './scripted-game';

it('plays a complete scripted game to a win', () => {
  let s = createGame();
  SCRIPTED_WIN.forEach((a, i) => {
    expect(s.result, `move ${i + 1}`).toBeNull();
    s = applyAction(s, a);
  });
  expect(s.result).toEqual({ winner: 'w', reason: 'surround' });
});
