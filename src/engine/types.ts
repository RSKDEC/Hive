export type Color = 'w' | 'b';

/** Creature types. The first five are the base set; newt, dragonfly and otter are expansions. */
export type Bug = 'turtle' | 'snail' | 'frog' | 'crab' | 'minnow' | 'newt' | 'dragonfly' | 'otter';

/** Axial coordinate key "q,r". */
export type Hex = string;

export interface Piece {
  id: string; // e.g. "w-frog-2"
  color: Color;
  bug: Bug;
}

/** Each occupied cell holds a stack of pieces, bottom → top. */
export type Board = Map<Hex, Piece[]>;

export interface GameConfig {
  newt: boolean;
  dragonfly: boolean;
  otter: boolean;
}

export type Action =
  | { type: 'place'; bug: Bug; to: Hex }
  | { type: 'move'; from: Hex; to: Hex }
  /** Otter (or a Newt copying one) at `by` lifts the tile at `from` over itself to `to`. */
  | { type: 'throw'; by: Hex; from: Hex; to: Hex }
  | { type: 'pass' };

export type EndReason = 'surround' | 'resign' | 'agreement';

export interface GameResult {
  winner: Color | 'draw';
  reason: EndReason;
}

export interface LastMove {
  pieceId: string;
  color: Color; // player who acted
  kind: 'place' | 'move' | 'throw';
  from?: Hex;
  to: Hex;
}

export interface GameState {
  config: GameConfig;
  board: Board;
  hands: Record<Color, Record<Bug, number>>;
  turn: Color;
  /** Number of turns taken so far (including passes). */
  ply: number;
  history: Action[];
  last: LastMove | null;
  result: GameResult | null;
}

export type Validation = { ok: true } | { ok: false; reason: string };
