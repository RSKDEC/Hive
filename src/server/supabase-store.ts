import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Color } from '@/engine';
import type { GamePatch, GameRecord, GameStore, MoveLog, Seat } from './types';

interface GameRow {
  id: string;
  config: GameRecord['config'];
  actions: GameRecord['actions'];
  ending: GameRecord['ending'];
  status: GameRecord['status'];
  turn: Color;
  winner: GameRecord['winner'];
  result_reason: GameRecord['resultReason'];
  revision: number;
  offer: GameRecord['offer'];
  rematch_id: string | null;
  created_at: string;
  updated_at: string;
}

interface PlayerRow {
  game_id: string;
  color: Color;
  nickname: string;
  secret_hash: string;
  joined_at: string;
}

function patchToRow(p: GamePatch) {
  return {
    actions: p.actions, ending: p.ending, status: p.status, turn: p.turn, winner: p.winner,
    result_reason: p.resultReason, offer: p.offer, rematch_id: p.rematchId,
  };
}

function toRecord(g: GameRow, players: PlayerRow[]): GameRecord {
  const seats: GameRecord['players'] = {};
  for (const p of players) seats[p.color] = { color: p.color, nickname: p.nickname, secretHash: p.secret_hash, joinedAt: p.joined_at };
  return {
    id: g.id, config: g.config, actions: g.actions ?? [], ending: g.ending ?? null, status: g.status, turn: g.turn,
    winner: g.winner, resultReason: g.result_reason, revision: g.revision, offer: g.offer ?? null, rematchId: g.rematch_id,
    players: seats, createdAt: g.created_at, updatedAt: g.updated_at,
  };
}

/**
 * Postgres-backed store. Uses the service-role key on the server only; the tables have RLS enabled
 * with no policies, so browsers can never read or write them directly.
 */
export class SupabaseStore implements GameStore {
  readonly kind = 'supabase' as const;
  private db: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    this.db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  async create(rec: GameRecord) {
    const { error } = await this.db.from('games').insert({
      id: rec.id, config: rec.config, revision: rec.revision, created_at: rec.createdAt, updated_at: rec.updatedAt, ...patchToRow(rec),
    });
    if (error) throw new Error('create game: ' + error.message);
    for (const seat of Object.values(rec.players)) {
      if (seat && !(await this.claimSeat(rec.id, seat))) throw new Error('seat conflict on create');
    }
  }

  async get(id: string) {
    const [g, p] = await Promise.all([
      this.db.from('games').select('*').eq('id', id).maybeSingle<GameRow>(),
      this.db.from('players').select('*').eq('game_id', id).returns<PlayerRow[]>(),
    ]);
    if (g.error) throw new Error('load game: ' + g.error.message);
    if (p.error) throw new Error('load players: ' + p.error.message);
    return g.data ? toRecord(g.data, p.data ?? []) : null;
  }

  async claimSeat(id: string, seat: Seat) {
    const { error } = await this.db.from('players').insert({
      game_id: id, color: seat.color, nickname: seat.nickname, secret_hash: seat.secretHash, joined_at: seat.joinedAt,
    });
    if (!error) return true;
    if (error.code === '23505') return false; // unique violation: seat already taken
    throw new Error('claim seat: ' + error.message);
  }

  async commit(id: string, expected: number, patch: GamePatch, moves: MoveLog[]) {
    const { data, error } = await this.db.rpc('commit_game', {
      p_id: id, p_expected: expected, p_patch: patchToRow(patch), p_moves: moves,
    });
    if (error) throw new Error('commit: ' + error.message);
    const rows = (data ?? []) as GameRow[];
    if (!rows.length) return null;
    const players = await this.db.from('players').select('*').eq('game_id', id).returns<PlayerRow[]>();
    return toRecord(rows[0], players.data ?? []);
  }
}
