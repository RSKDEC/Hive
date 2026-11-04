import { beforeEach, describe, expect, it } from 'vitest';
import { GameService, withAutoPass } from '../game-service';
import { position } from '@/engine/__tests__/helpers';
import { MemoryStore } from '../memory-store';
import { ServiceError, type GameView } from '../types';
import { applyAction, BASIC_CONFIG, type Action } from '@/engine';

const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const C = 'c'.repeat(40);

let store: MemoryStore;
let svc: GameService;

async function expectError(p: Promise<unknown>, status: number): Promise<ServiceError> {
  try { await p; } catch (e) { expect(e).toBeInstanceOf(ServiceError); expect((e as ServiceError).status).toBe(status); return e as ServiceError; }
  throw new Error('expected an error');
}

async function startGame(): Promise<{ id: string; white: string; black: string }> {
  const g = await svc.create({ nickname: 'Ana', config: BASIC_CONFIG, color: 'w', secret: A });
  await svc.join(g.id, { nickname: 'Ben', secret: B });
  return { id: g.id, white: A, black: B };
}

async function play(id: string, secret: string, action: Action): Promise<GameView> {
  const v = await svc.view(id, secret);
  return svc.act(id, secret, { kind: 'action', revision: v.revision, action });
}

beforeEach(() => {
  store = new MemoryStore();
  svc = new GameService(store);
});

describe('seats and identity', () => {
  it('creates a waiting game, then activates when the second player joins', async () => {
    const g = await svc.create({ nickname: 'Ana', config: BASIC_CONFIG, color: 'w', secret: A });
    expect(g.status).toBe('waiting');
    expect(g.you).toBe('w');
    const joined = await svc.join(g.id, { nickname: 'Ben', secret: B });
    expect(joined.you).toBe('b');
    expect(joined.status).toBe('active');
    expect(JSON.stringify(joined)).not.toContain('secret');
  });

  it('a third person cannot take a seat and only spectates', async () => {
    const { id } = await startGame();
    await expectError(svc.join(id, { nickname: 'Eve', secret: C }), 403);
    const view = await svc.view(id, C);
    expect(view.you).toBeNull();
    await expectError(svc.act(id, C, { kind: 'action', revision: view.revision, action: { type: 'place', bug: 'frog', to: '0,0' } }), 403);
    await expectError(svc.act(id, C, { kind: 'resign' }), 403);
  });

  it('rejoining with the same secret returns the same seat (refresh / reconnect)', async () => {
    const { id } = await startGame();
    expect((await svc.join(id, { nickname: 'whatever', secret: B })).you).toBe('b');
    expect((await svc.view(id, A)).you).toBe('w');
  });

  it('rejects malformed ids and secrets', async () => {
    await expectError(svc.view('../etc', A), 404);
    await expectError(svc.create({ nickname: 'x', config: {}, secret: 'short' }), 400);
  });
});

describe('moves', () => {
  it('enforces turn order and rules on the server', async () => {
    const { id } = await startGame();
    await expectError(play(id, B, { type: 'place', bug: 'frog', to: '0,0' }), 409); // not black's turn
    const illegal = await expectError(play(id, A, { type: 'place', bug: 'turtle', to: '0,0' }), 422);
    expect(illegal.message).toMatch(/first tile/);
    const v = await play(id, A, { type: 'place', bug: 'frog', to: '0,0' });
    expect(v.turn).toBe('b');
    expect(v.revision).toBe(2);
    expect(store.moves.get(id)!.length).toBe(1);
  });

  it('rejects malformed actions', async () => {
    const { id } = await startGame();
    const v = await svc.view(id, A);
    await expectError(svc.act(id, A, { kind: 'action', revision: v.revision, action: { type: 'teleport' } as never }), 400);
  });

  it('only one of two concurrent submissions on the same revision wins', async () => {
    const { id } = await startGame();
    const v = await svc.view(id, A);
    const results = await Promise.allSettled([
      svc.act(id, A, { kind: 'action', revision: v.revision, action: { type: 'place', bug: 'frog', to: '0,0' } }),
      svc.act(id, A, { kind: 'action', revision: v.revision, action: { type: 'place', bug: 'snail', to: '0,0' } }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect((await svc.view(id, A)).actions).toHaveLength(1);
  });

  it('a duplicate retry of the same move is idempotent', async () => {
    const { id } = await startGame();
    const v = await svc.view(id, A);
    const req = { kind: 'action' as const, revision: v.revision, action: { type: 'place' as const, bug: 'frog' as const, to: '0,0' } };
    await svc.act(id, A, req);
    const again = await svc.act(id, A, req);
    expect(again.actions).toHaveLength(1);
  });

  it('a stale client gets a 409 with the current state to resynchronise', async () => {
    const { id } = await startGame();
    const stale = await svc.view(id, B);
    await play(id, A, { type: 'place', bug: 'frog', to: '0,0' });
    const err = await expectError(svc.act(id, B, { kind: 'action', revision: stale.revision, action: { type: 'place', bug: 'frog', to: '1,0' } }), 409);
    expect(err.view!.actions).toHaveLength(1);
    // After resync the same move succeeds.
    expect((await play(id, B, { type: 'place', bug: 'frog', to: '1,0' })).actions).toHaveLength(2);
  });
});

describe('offers, resignation and rematch', () => {
  it('undo requires the opponent’s acceptance', async () => {
    const { id } = await startGame();
    await play(id, A, { type: 'place', bug: 'frog', to: '0,0' });
    await play(id, B, { type: 'place', bug: 'frog', to: '1,0' });
    let v = await svc.act(id, A, { kind: 'offer', offer: 'undo' });
    expect(v.offer).toMatchObject({ kind: 'undo', by: 'w' });
    await expectError(svc.act(id, A, { kind: 'respond', accept: true }), 409); // can't accept your own request
    v = await svc.act(id, B, { kind: 'respond', accept: true });
    expect(v.actions).toHaveLength(0); // black's reply and white's move both rewound
    expect(v.turn).toBe('w');
  });

  it('declined offers leave the game unchanged', async () => {
    const { id } = await startGame();
    await play(id, A, { type: 'place', bug: 'frog', to: '0,0' });
    await svc.act(id, B, { kind: 'offer', offer: 'draw' });
    const v = await svc.act(id, A, { kind: 'respond', accept: false });
    expect(v.offer).toBeNull();
    expect(v.status).toBe('active');
  });

  it('agreed draws and resignations end the game and block further moves', async () => {
    const { id } = await startGame();
    await svc.act(id, A, { kind: 'offer', offer: 'draw' });
    const v = await svc.act(id, B, { kind: 'respond', accept: true });
    expect(v.status).toBe('finished');
    expect(v.winner).toBe('draw');
    await expectError(play(id, A, { type: 'place', bug: 'frog', to: '0,0' }), 409);

    const g2 = await startGame();
    const r = await svc.act(g2.id, B, { kind: 'resign' });
    expect(r.winner).toBe('w');
  });

  it('rematch creates one new game with colours swapped', async () => {
    const { id } = await startGame();
    await svc.act(id, B, { kind: 'resign' });
    const [r1, r2] = await Promise.all([svc.act(id, A, { kind: 'rematch' }), svc.act(id, B, { kind: 'rematch' })]);
    const finalId = (await svc.view(id, A)).rematchId!;
    expect(finalId).toBeTruthy();
    expect([r1.rematchId, r2.rematchId]).toContain(finalId);
    const next = await svc.view(finalId, A);
    expect(next.you).toBe('b');
    expect(next.status).toBe('active');
    expect((await svc.view(finalId, B)).you).toBe('w');
  });
});

describe('automatic pass', () => {
  it('inserts a pass when the next player cannot act', () => {
    const stuck = { '0,0': 'bT', '1,0': 'wT', '1,-1': 'wF', '0,-1': 'wF', '-1,0': 'wC', '-1,1': 'wC', '1,1': 'wM' };
    const s = applyAction(position(stuck), { type: 'move', from: '1,1', to: '2,0' });
    expect(s.turn).toBe('b');
    const after = withAutoPass(s);
    expect(after.turn).toBe('w');
    expect(after.history.at(-1)).toEqual({ type: 'pass' });
    expect(withAutoPass(after)).toBe(after); // white can move: nothing inserted
  });
});
