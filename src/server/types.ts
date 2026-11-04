import type { Action, Color, GameConfig, GameResult } from '@/engine';

export type GameStatus = 'waiting' | 'active' | 'finished';

export interface Seat {
  color: Color;
  nickname: string;
  secretHash: string;
  joinedAt: string;
}

export interface Offer {
  kind: 'undo' | 'draw';
  by: Color;
  revision: number;
}

/** Everything the server persists about one game. */
export interface GameRecord {
  id: string;
  config: GameConfig;
  actions: Action[];
  ending: GameResult | null;
  status: GameStatus;
  turn: Color;
  winner: Color | 'draw' | null;
  resultReason: GameResult['reason'] | null;
  revision: number;
  offer: Offer | null;
  rematchId: string | null;
  players: Partial<Record<Color, Seat>>;
  createdAt: string;
  updatedAt: string;
}

/** Mutable fields written by a commit. */
export type GamePatch = Pick<GameRecord, 'actions' | 'ending' | 'status' | 'turn' | 'winner' | 'resultReason' | 'offer' | 'rematchId'>;

export interface MoveLog {
  ply: number;
  color: Color;
  action: Action;
}

export interface GameStore {
  readonly kind: 'memory' | 'supabase';
  create(rec: GameRecord): Promise<void>;
  get(id: string): Promise<GameRecord | null>;
  /** Atomically seats a player if the seat is free. Returns false if already taken. */
  claimSeat(id: string, seat: Seat): Promise<boolean>;
  /** Optimistic-concurrency commit: applies only if the stored revision equals `expected`. Returns the new record, or null on conflict. */
  commit(id: string, expected: number, patch: GamePatch, moves: MoveLog[]): Promise<GameRecord | null>;
}

/** What clients see. Never includes secret hashes. */
export interface GameView {
  id: string;
  config: GameConfig;
  actions: Action[];
  ending: GameResult | null;
  status: GameStatus;
  turn: Color;
  winner: Color | 'draw' | null;
  revision: number;
  offer: Offer | null;
  rematchId: string | null;
  players: Partial<Record<Color, { nickname: string }>>;
  you: Color | null;
  updatedAt: string;
}

export type ActRequest =
  | { kind: 'action'; revision: number; action: Action }
  | { kind: 'resign' }
  | { kind: 'offer'; offer: 'undo' | 'draw' }
  | { kind: 'respond'; accept: boolean }
  | { kind: 'cancel-offer' }
  | { kind: 'rematch' };

export class ServiceError extends Error {
  constructor(public status: number, message: string, public view?: GameView) {
    super(message);
  }
}
