import type { Board, Color, GameResult } from './types';
import { neighbors } from './coordinates';

/** How many of the six spaces around colour `c`'s Turtle are occupied (0 if not placed). */
export function surroundCount(b: Board, c: Color): number {
  for (const [k, s] of b) {
    if (s.some((p) => p.bug === 'turtle' && p.color === c)) return neighbors(k).filter((n) => b.has(n)).length;
  }
  return 0;
}

export function checkSurround(b: Board): GameResult | null {
  const wLost = surroundCount(b, 'w') === 6;
  const bLost = surroundCount(b, 'b') === 6;
  if (wLost && bLost) return { winner: 'draw', reason: 'surround' };
  if (wLost) return { winner: 'b', reason: 'surround' };
  if (bLost) return { winner: 'w', reason: 'surround' };
  return null;
}
