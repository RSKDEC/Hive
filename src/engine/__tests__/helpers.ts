import { createGame, FULL_CONFIG, type Board, type Bug, type Color, type GameConfig, type GameState, type Hex } from '..';

const CODES: Record<string, Bug> = { T: 'turtle', S: 'snail', F: 'frog', C: 'crab', M: 'minnow', N: 'newt', D: 'dragonfly', O: 'otter' };

/**
 * Builds a mid-game position. `cells` maps hex → stack codes bottom→top, e.g. { '0,0': 'wT', '1,0': 'bF wS' }.
 * Hands are reduced to match. `ply` defaults to 20 so opening rules don't apply.
 */
export function position(cells: Record<Hex, string>, opts: { turn?: Color; ply?: number; config?: GameConfig } = {}): GameState {
  const s = createGame(opts.config ?? FULL_CONFIG);
  const board: Board = new Map();
  const used: Record<string, number> = {};
  for (const [h, codes] of Object.entries(cells)) {
    const stack = codes.trim().split(/\s+/).map((code) => {
      const color = code[0] as Color;
      const bug = CODES[code[1]];
      const n = (used[color + bug] = (used[color + bug] ?? 0) + 1);
      s.hands[color][bug]--;
      if (s.hands[color][bug] < 0) throw new Error('too many ' + code);
      return { id: `${color}-${bug}-${n}`, color, bug };
    });
    board.set(h, stack);
  }
  return { ...s, board, turn: opts.turn ?? 'w', ply: opts.ply ?? (opts.turn === 'b' ? 21 : 20) };
}

export const sorted = (xs: Iterable<string>) => [...xs].sort();
