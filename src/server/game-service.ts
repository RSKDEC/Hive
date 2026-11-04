import {
  actionKey, applyAction, deserialize, endGame, getLegalActions, normalizeConfig, other, parseAction, validateAction,
  type Color, type GameState,
} from '@/engine';
import { cleanNickname, hashSecret, isValidSecret, newGameId } from './identity';
import { publishUpdate } from './realtime';
import { ServiceError, type ActRequest, type GamePatch, type GameRecord, type GameStore, type GameView, type MoveLog } from './types';

export function toView(rec: GameRecord, you: Color | null): GameView {
  const players: GameView['players'] = {};
  for (const c of ['w', 'b'] as Color[]) { const p = rec.players[c]; if (p) players[c] = { nickname: p.nickname }; }
  return {
    id: rec.id, config: rec.config, actions: rec.actions, ending: rec.ending, status: rec.status, turn: rec.turn,
    winner: rec.winner, revision: rec.revision, offer: rec.offer, rematchId: rec.rematchId, players, you, updatedAt: rec.updatedAt,
  };
}

function seatOf(rec: GameRecord, secret: string | null): Color | null {
  if (!secret || !isValidSecret(secret)) return null;
  const h = hashSecret(secret);
  for (const c of ['w', 'b'] as Color[]) if (rec.players[c]?.secretHash === h) return c;
  return null;
}

function stateOf(rec: GameRecord): GameState {
  return deserialize({ v: 1, config: rec.config, actions: rec.actions, ending: rec.ending });
}

function patchFrom(rec: GameRecord, s: GameState, extra: Partial<GamePatch> = {}): GamePatch {
  const bothSeated = !!(rec.players.w && rec.players.b);
  return {
    actions: s.history,
    ending: s.result && s.result.reason !== 'surround' ? s.result : null,
    status: s.result ? 'finished' : bothSeated ? 'active' : 'waiting',
    turn: s.turn,
    winner: s.result?.winner ?? null,
    resultReason: s.result?.reason ?? null,
    offer: null,
    rematchId: rec.rematchId,
    ...extra,
  };
}

/** After a turn, skip the next player automatically if they have no legal action. */
export function withAutoPass(s: GameState): GameState {
  if (s.result) return s;
  const next = getLegalActions(s);
  return next.length === 1 && next[0].type === 'pass' ? applyAction(s, { type: 'pass' }) : s;
}

export class GameService {
  constructor(private store: GameStore) {}

  private async load(id: string): Promise<GameRecord> {
    if (typeof id !== 'string' || !/^[A-Za-z0-9]{6,32}$/.test(id)) throw new ServiceError(404, 'Game not found.');
    const rec = await this.store.get(id);
    if (!rec) throw new ServiceError(404, 'Game not found.');
    return rec;
  }

  private async commit(rec: GameRecord, patch: GamePatch, moves: MoveLog[]): Promise<GameRecord> {
    const next = await this.store.commit(rec.id, rec.revision, patch, moves);
    if (!next) {
      const fresh = await this.store.get(rec.id);
      throw new ServiceError(409, 'The game changed — refreshing.', fresh ? toView(fresh, null) : undefined);
    }
    await publishUpdate(rec.id, { revision: next.revision });
    return next;
  }

  async create(input: { nickname: unknown; config: unknown; color?: unknown; secret: string | null }): Promise<GameView> {
    if (!isValidSecret(input.secret)) throw new ServiceError(400, 'Missing player identity.');
    const nickname = cleanNickname(input.nickname);
    if (!nickname) throw new ServiceError(400, 'Please enter a nickname.');
    const color: Color = input.color === 'w' || input.color === 'b' ? input.color : Math.random() < 0.5 ? 'w' : 'b';
    const now = new Date().toISOString();
    const rec: GameRecord = {
      id: newGameId(), config: normalizeConfig(input.config), actions: [], ending: null, status: 'waiting', turn: 'w',
      winner: null, resultReason: null, revision: 0, offer: null, rematchId: null,
      players: { [color]: { color, nickname, secretHash: hashSecret(input.secret), joinedAt: now } }, createdAt: now, updatedAt: now,
    };
    await this.store.create(rec);
    return toView(rec, color);
  }

  async view(id: string, secret: string | null): Promise<GameView> {
    const rec = await this.load(id);
    return toView(rec, seatOf(rec, secret));
  }

  /** Takes the free seat. Seated players get their view back; a full game makes the caller a spectator (403). */
  async join(id: string, input: { nickname: unknown; secret: string | null }): Promise<GameView> {
    if (!isValidSecret(input.secret)) throw new ServiceError(400, 'Missing player identity.');
    let rec = await this.load(id);
    const mine = seatOf(rec, input.secret);
    if (mine) return toView(rec, mine);
    const nickname = cleanNickname(input.nickname);
    if (!nickname) throw new ServiceError(400, 'Please enter a nickname.');
    const free = (['w', 'b'] as Color[]).find((c) => !rec.players[c]);
    if (!free) throw new ServiceError(403, 'This game already has two players. You can watch.', toView(rec, null));
    const ok = await this.store.claimSeat(id, { color: free, nickname, secretHash: hashSecret(input.secret), joinedAt: new Date().toISOString() });
    if (!ok) throw new ServiceError(403, 'Someone else just took that seat. You can watch.', toView((await this.store.get(id))!, null));
    // Activate the game (retry a few times in case of a concurrent commit).
    for (let i = 0; i < 5; i++) {
      rec = await this.load(id);
      if (rec.status !== 'waiting') break;
      const next = await this.store.commit(id, rec.revision, patchFrom(rec, stateOf(rec), { offer: rec.offer }), []);
      if (next) { rec = next; await publishUpdate(id, { revision: next.revision }); break; }
    }
    return toView(rec, free);
  }

  async act(id: string, secret: string | null, req: ActRequest): Promise<GameView> {
    const rec = await this.load(id);
    const me = seatOf(rec, secret);
    if (!me) throw new ServiceError(403, 'Only the two players can do that.', toView(rec, null));
    const view = (r: GameRecord) => toView(r, me);

    if (req?.kind === 'rematch') return this.rematch(rec, me);
    if (rec.status === 'waiting') throw new ServiceError(409, 'Waiting for the other player to join.', view(rec));
    if (rec.status === 'finished') throw new ServiceError(409, 'The game is over.', view(rec));
    const state = stateOf(rec);

    switch (req?.kind) {
      case 'action': {
        const action = parseAction(req.action);
        if (!action) throw new ServiceError(400, 'Malformed move.');
        if (req.revision !== rec.revision) {
          // A retried submission that already went through: answer with the current state.
          const lastIdx = rec.actions.length - 1;
          const prev = rec.actions[lastIdx];
          if (req.revision === rec.revision - 1 && prev && actionKey(prev) === actionKey(action)) return view(rec);
          throw new ServiceError(409, 'Your board was out of date — it has been refreshed.', view(rec));
        }
        if (state.turn !== me) throw new ServiceError(409, 'It isn’t your turn.', view(rec));
        const v = validateAction(state, action);
        if (!v.ok) throw new ServiceError(422, v.reason, view(rec));
        const after = applyAction(state, action);
        const moves: MoveLog[] = [{ ply: state.ply, color: me, action }];
        const final = withAutoPass(after);
        if (final !== after) moves.push({ ply: after.ply, color: after.turn, action: { type: 'pass' } });
        return view(await this.commit(rec, patchFrom(rec, final), moves));
      }
      case 'resign':
        return view(await this.commit(rec, patchFrom(rec, endGame(state, { winner: other(me), reason: 'resign' })), []));
      case 'offer': {
        if (req.offer !== 'undo' && req.offer !== 'draw') throw new ServiceError(400, 'Unknown offer.');
        if (req.offer === 'undo' && !state.history.some((_, i) => (i % 2 === 0 ? 'w' : 'b') === me)) throw new ServiceError(422, 'You have no move to take back.', view(rec));
        if (rec.offer) throw new ServiceError(409, 'There is already a pending request.', view(rec));
        return view(await this.commit(rec, { ...patchFrom(rec, state), offer: { kind: req.offer, by: me, revision: rec.revision } }, []));
      }
      case 'cancel-offer':
        if (!rec.offer || rec.offer.by !== me) throw new ServiceError(409, 'No request to cancel.', view(rec));
        return view(await this.commit(rec, patchFrom(rec, state), []));
      case 'respond': {
        const offer = rec.offer;
        if (!offer || offer.by === me) throw new ServiceError(409, 'There is nothing to answer.', view(rec));
        if (!req.accept) return view(await this.commit(rec, patchFrom(rec, state), []));
        if (offer.kind === 'draw') return view(await this.commit(rec, patchFrom(rec, endGame(state, { winner: 'draw', reason: 'agreement' })), []));
        // Undo: rewind until it is the requester's turn again, removing their last move.
        let actions = rec.actions.slice();
        const moverOf = (i: number): Color => (i % 2 === 0 ? 'w' : 'b');
        while (actions.length && moverOf(actions.length - 1) !== offer.by) actions.pop();
        actions.pop();
        const rewound = deserialize({ v: 1, config: rec.config, actions });
        return view(await this.commit(rec, patchFrom(rec, rewound), []));
      }
      default:
        throw new ServiceError(400, 'Unknown request.');
    }
  }

  private async rematch(rec: GameRecord, me: Color): Promise<GameView> {
    if (rec.status !== 'finished') throw new ServiceError(409, 'Finish this game first.', toView(rec, me));
    if (rec.rematchId) return toView(rec, me);
    const now = new Date().toISOString();
    const players: GameRecord['players'] = {};
    for (const c of ['w', 'b'] as Color[]) {
      const seat = rec.players[c]!;
      players[other(c)] = { ...seat, color: other(c), joinedAt: now }; // swap colours
    }
    const next: GameRecord = {
      id: newGameId(), config: rec.config, actions: [], ending: null, status: 'active', turn: 'w', winner: null, resultReason: null,
      revision: 0, offer: null, rematchId: null, players, createdAt: now, updatedAt: now,
    };
    await this.store.create(next);
    const state = stateOf(rec);
    const updated = await this.store.commit(rec.id, rec.revision, { ...patchFrom(rec, state), rematchId: next.id }, []);
    if (!updated) {
      const fresh = await this.load(rec.id); // the other player won the race; use their rematch
      return toView(fresh, me);
    }
    await publishUpdate(rec.id, { revision: updated.revision });
    return toView(updated, me);
  }
}
