import { createGame, FULL_CONFIG, getLegalMoves, getLiftOptions, type Action, type Board, type Bug, type Color, type GameState, type Hex } from '@/engine';

const CODES: Record<string, Bug> = { T: 'turtle', S: 'snail', F: 'frog', C: 'crab', M: 'minnow', N: 'newt', D: 'dragonfly', O: 'otter' };

/** Builds a mid-game position from compact codes, e.g. { '0,0': 'wT', '1,0': 'bF wS' }. */
export function buildPosition(cells: Record<Hex, string>, turn: Color = 'w'): GameState {
  const s = createGame(FULL_CONFIG);
  const board: Board = new Map();
  const used: Record<string, number> = {};
  for (const [h, codes] of Object.entries(cells)) {
    board.set(h, codes.split(' ').map((code) => {
      const color = code[0] as Color;
      const bug = CODES[code[1]];
      const n = (used[color + bug] = (used[color + bug] ?? 0) + 1);
      s.hands[color][bug] = Math.max(0, s.hands[color][bug] - 1);
      return { id: `${color}-${bug}-${n}`, color, bug };
    }));
  }
  return { ...s, board, turn, ply: turn === 'w' ? 20 : 21 };
}

export interface Demo { state: GameState; piece: Hex; actions: Action[] }

const SETUPS: Record<Bug, { cells: Record<Hex, string>; piece: Hex }> = {
  turtle: { cells: { '-1,0': 'wT', '0,0': 'bF', '1,0': 'bT', '0,-1': 'wC' }, piece: '-1,0' },
  snail: { cells: { '-1,0': 'wS', '0,0': 'bT', '1,0': 'wT', '0,-1': 'bF' }, piece: '-1,0' },
  frog: { cells: { '-1,0': 'wF', '0,0': 'wT', '1,0': 'bT', '2,0': 'bF', '0,1': 'bC' }, piece: '-1,0' },
  crab: { cells: { '-1,0': 'wC', '0,0': 'wT', '1,0': 'bT', '1,-1': 'bF' }, piece: '-1,0' },
  minnow: { cells: { '-1,0': 'wM', '0,0': 'wT', '1,0': 'bT', '1,-1': 'bF' }, piece: '-1,0' },
  newt: { cells: { '-1,0': 'wN', '0,0': 'wF', '1,0': 'bT', '0,-1': 'wT' }, piece: '-1,0' },
  dragonfly: { cells: { '-1,0': 'wD', '0,0': 'wT', '1,0': 'bT', '2,0': 'bF' }, piece: '-1,0' },
  otter: { cells: { '-1,0': 'bT', '0,0': 'wO', '1,0': 'wT', '1,-1': 'bF' }, piece: '0,0' },
};

export function demoFor(bug: Bug): Demo {
  const { cells, piece } = SETUPS[bug];
  const state = buildPosition(cells);
  let actions: Action[] = getLegalMoves(state, piece).map((to) => ({ type: 'move', from: piece, to }));
  if (bug === 'otter') {
    const lifts = getLiftOptions(state, piece);
    const throws: Action[] = [];
    for (const [from, drops] of lifts) for (const to of drops) throws.push({ type: 'throw', by: piece, from, to });
    actions = [...throws.slice(0, 3), ...actions];
  }
  return { state, piece, actions: actions.slice(0, 6) };
}
