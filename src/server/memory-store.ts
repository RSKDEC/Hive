import type { GamePatch, GameRecord, GameStore, MoveLog, Seat } from './types';

/**
 * In-process store for local development, tests and single-server self-hosting.
 * Not suitable for serverless deployments (each instance would have its own memory).
 */
export class MemoryStore implements GameStore {
  readonly kind = 'memory' as const;
  private games = new Map<string, GameRecord>();
  readonly moves = new Map<string, Array<MoveLog & { revision: number }>>();

  async create(rec: GameRecord) {
    if (this.games.has(rec.id)) throw new Error('duplicate id');
    this.games.set(rec.id, structuredClone(rec));
  }

  async get(id: string) {
    const g = this.games.get(id);
    return g ? structuredClone(g) : null;
  }

  async claimSeat(id: string, seat: Seat) {
    const g = this.games.get(id);
    if (!g || g.players[seat.color]) return false;
    g.players[seat.color] = { ...seat };
    return true;
  }

  async commit(id: string, expected: number, patch: GamePatch, moves: MoveLog[]) {
    // JS is single-threaded and there is no await between the check and the write, so this is atomic.
    const g = this.games.get(id);
    if (!g || g.revision !== expected) return null;
    Object.assign(g, structuredClone(patch));
    g.revision = expected + 1;
    g.updatedAt = new Date().toISOString();
    const log = this.moves.get(id) ?? [];
    for (const m of moves) log.push({ ...m, revision: g.revision });
    this.moves.set(id, log);
    return structuredClone(g);
  }
}
