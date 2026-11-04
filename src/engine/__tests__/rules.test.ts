import { describe, expect, it } from 'vitest';
import {
  applyAction, BASIC_CONFIG, createGame, getLegalActions, getLegalMoves, getLegalPlacements, getLiftOptions,
  validateAction, neighbors, type Action, type GameState,
} from '..';
import { position, sorted } from './helpers';

const place = (bug: Action & { type: 'place' } extends infer _ ? any : never, to: string): Action => ({ type: 'place', bug, to });
const move = (from: string, to: string): Action => ({ type: 'move', from, to });
const play = (s: GameState, ...as: Action[]) => as.reduce(applyAction, s);
const reason = (s: GameState, a: Action) => { const v = validateAction(s, a); return v.ok ? null : v.reason; };

describe('opening', () => {
  it('first tile goes at the origin and cannot be the Turtle', () => {
    const s = createGame();
    expect(getLegalPlacements(s, 'frog')).toEqual(['0,0']);
    expect(getLegalPlacements(s, 'turtle')).toEqual([]);
    expect(reason(s, place('turtle', '0,0'))).toMatch(/first tile/);
  });

  it('second player places next to the first tile but not their Turtle', () => {
    const s = play(createGame(), place('frog', '0,0'));
    expect(sorted(getLegalPlacements(s, 'snail'))).toEqual(sorted(neighbors('0,0')));
    expect(getLegalPlacements(s, 'turtle')).toEqual([]);
  });

  it('later tiles must touch own colour and not the opponent', () => {
    const s = play(createGame(), place('frog', '0,0'), place('frog', '1,0'));
    const cells = getLegalPlacements(s, 'snail');
    expect(sorted(cells)).toEqual(sorted(['-1,0', '-1,1', '0,-1']));
    expect(reason(s, place('snail', '1,-1'))).toMatch(/must not touch/);
    expect(reason(s, place('snail', '1,0'))).toMatch(/on top/);
  });

  it('a stack belongs to the colour of its top tile when placing', () => {
    const own = position({ '0,0': 'wT', '1,0': 'bF wS', '-1,0': 'bT' });
    expect(getLegalPlacements(own, 'frog')).toContain('2,0');
    const theirs = position({ '0,0': 'wT', '1,0': 'wF bS', '-1,0': 'bT' });
    expect(getLegalPlacements(theirs, 'frog')).not.toContain('2,0');
  });
});

describe('turtle placement deadline', () => {
  const opening = [place('frog', '0,0'), place('frog', '1,0'), place('crab', '-1,0'), place('crab', '2,0'), place('minnow', '-2,0'), place('minnow', '3,0')];

  it('forces the Turtle on the 4th turn', () => {
    const s = play(createGame(BASIC_CONFIG), ...opening);
    const actions = getLegalActions(s);
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.every((a) => a.type === 'place' && a.bug === 'turtle')).toBe(true);
    expect(reason(s, place('snail', '-3,0'))).toMatch(/4th turn/);
  });

  it('no tile may move until the Turtle is placed', () => {
    const s = play(createGame(BASIC_CONFIG), ...opening.slice(0, 4));
    expect(getLegalMoves(s, '-1,0')).toEqual([]);
    expect(reason(s, move('-1,0', '-1,1'))).toMatch(/Place your Turtle/);
    expect(getLegalActions(s).some((a) => a.type === 'move')).toBe(false);
  });
});

describe('one pond', () => {
  it('a tile that bridges two groups is pinned', () => {
    const s = position({ '-1,0': 'wF', '0,0': 'wT', '1,0': 'bT', '2,0': 'bF' });
    expect(getLegalMoves(s, '0,0')).toEqual([]);
    expect(reason(s, move('0,0', '0,1'))).toMatch(/split the pond/);
  });

  it('a tile on top of a stack can always be lifted', () => {
    const s = position({ '-1,0': 'wF', '0,0': 'bT wS', '1,0': 'wT' });
    expect(getLegalMoves(s, '0,0').length).toBeGreaterThan(0);
  });

  it('moves never leave the pond disconnected', () => {
    const s = position({ '0,0': 'wT', '1,0': 'bT', '-1,0': 'wM' });
    for (const to of getLegalMoves(s, '-1,0')) {
      const next = applyAction(s, move('-1,0', to));
      expect(next.board.size).toBe(3);
    }
  });
});

describe('freedom to move', () => {
  // A pocket at 0,0 open only through a narrow gap at 0,1.
  const pocket = { '1,0': 'wT', '1,-1': 'bF', '0,-1': 'bF', '-1,0': 'bT', '-1,1': 'bF', '1,1': 'wM' };

  it('sliding creatures cannot squeeze through a narrow gap', () => {
    const s = position(pocket);
    const dests = getLegalMoves(s, '1,1');
    expect(dests).toContain('0,1');
    expect(dests).not.toContain('0,0');
  });

  it('the Turtle cannot slide out of a gated spot', () => {
    const s = position({ '0,0': 'wT', '1,0': 'bF', '1,-1': 'bC', '0,-1': 'bT', '-1,0': 'bF', '-1,1': 'bM' });
    // Only 0,1 is empty, but both its flanks (1,0) and (-1,1) are occupied.
    expect(getLegalMoves(s, '0,0')).toEqual([]);
  });

  it('a sliding move must stay in contact with the pond', () => {
    const s = position({ '0,0': 'wT', '1,0': 'bT' });
    expect(sorted(getLegalMoves(s, '0,0'))).toEqual(sorted(['1,-1', '0,1']));
  });
});

describe('creatures', () => {
  it('Turtle moves exactly one space', () => {
    const s = position({ '0,0': 'wT', '1,0': 'bT', '2,0': 'bF' });
    expect(sorted(getLegalMoves(s, '0,0'))).toEqual(sorted(['1,-1', '0,1']));
  });

  it('Snail climbs on, travels across and climbs down', () => {
    const s = position({ '-1,0': 'wS', '0,0': 'wT', '1,0': 'bT' });
    expect(getLegalMoves(s, '-1,0')).toContain('0,0');
    const up = applyAction(s, move('-1,0', '0,0'));
    expect(up.board.get('0,0')!.map((p) => p.bug)).toEqual(['turtle', 'snail']);
    const s2 = { ...up, turn: 'w' as const };
    const fromTop = getLegalMoves(s2, '0,0');
    expect(fromTop).toContain('1,0'); // across the top
    expect(fromTop).toContain('-1,0'); // back down
    expect(fromTop.length).toBe(6);
  });

  it('a covered tile cannot move, and the stack belongs to the top tile', () => {
    const s = position({ '0,0': 'wT bS', '1,0': 'bT', '-1,0': 'wF' });
    expect(reason(s, move('0,0', '0,1'))).toMatch(/trapped/);
    expect(getLegalActions(s).some((a) => a.type === 'move' && a.from === '0,0')).toBe(false);
  });

  it('Snail cannot pass between two taller stacks', () => {
    const blocked = position({ '0,0': 'bF wS', '1,0': 'bC', '0,1': 'bM wT', '1,-1': 'bT bS' });
    expect(getLegalMoves(blocked, '0,0')).not.toContain('1,0');
    const open = position({ '0,0': 'bF wS', '1,0': 'bC wS', '0,1': 'bM wT', '1,-1': 'bT bS' });
    expect(getLegalMoves(open, '0,0')).toContain('1,0');
  });

  it('Snail on the ground is gated like everyone else', () => {
    const s = position({ '1,0': 'wT', '1,-1': 'bF', '0,-1': 'bF', '-1,0': 'bT', '-1,1': 'bF', '0,1': 'wS' });
    const d = getLegalMoves(s, '0,1');
    expect(d).not.toContain('0,0');
    expect(d).toContain('1,0');
  });

  it('Frog jumps over a continuous line and lands in the first gap', () => {
    const s = position({ '-1,0': 'wF', '0,0': 'wT', '1,0': 'bT', '2,0': 'bF' });
    expect(getLegalMoves(s, '-1,0')).toEqual(['3,0']);
  });

  it('Frog cannot move to an adjacent empty space', () => {
    const s = position({ '-1,0': 'wF', '0,0': 'wT', '1,0': 'bT' });
    expect(getLegalMoves(s, '-1,0')).not.toContain('-1,1');
  });

  it('Crab moves exactly three spaces without backtracking', () => {
    const s = position({ '-1,0': 'wC', '0,0': 'wT', '1,0': 'bT' });
    expect(sorted(getLegalMoves(s, '-1,0'))).toEqual(sorted(['1,1', '2,-1']));
  });

  it('Minnow reaches every reachable edge space but not enclosed pools', () => {
    const s = position({ '-1,0': 'wM', '0,0': 'wT', '1,0': 'bT' });
    expect(getLegalMoves(s, '-1,0').length).toBe(7);
    const pocket = position({ '1,0': 'wT', '1,-1': 'bF', '0,-1': 'bF', '-1,0': 'bT', '-1,1': 'bF', '1,1': 'wM' });
    expect(getLegalMoves(pocket, '1,1')).not.toContain('0,0');
  });
});

describe('expansion creatures', () => {
  it('Newt copies the creatures it touches', () => {
    const s = position({ '-1,0': 'wN', '0,0': 'wF', '1,0': 'bT', '1,-1': 'wT' });
    expect(getLegalMoves(s, '-1,0')).toContain('2,0');
  });

  it('Newt touching only a Newt has no moves', () => {
    const s = position({ '-1,0': 'wN', '0,0': 'bN', '1,0': 'bT', '2,0': 'wT' });
    expect(getLegalMoves(s, '-1,0')).toEqual([]);
  });

  it('Newt on top of the pond moves like a Snail', () => {
    const s = position({ '0,0': 'bF wN', '1,0': 'bT', '-1,0': 'wT' });
    expect(getLegalMoves(s, '0,0').length).toBe(6);
  });

  it('Newt copying a Snail can climb', () => {
    const s = position({ '-1,0': 'wN', '0,0': 'wS', '1,0': 'bT', '0,-1': 'wT' });
    expect(getLegalMoves(s, '-1,0')).toContain('0,0');
  });

  it('Dragonfly moves two over the top then one down', () => {
    const s = position({ '-1,0': 'wD', '0,0': 'wT', '1,0': 'bT', '2,0': 'bF' });
    expect(sorted(getLegalMoves(s, '-1,0'))).toEqual(sorted(['2,-1', '1,-1', '0,1', '1,1']));
  });

  it('Dragonfly cannot end on top of a tile or where it started', () => {
    const s = position({ '-1,0': 'wD', '0,0': 'wT', '1,0': 'bT' });
    const d = getLegalMoves(s, '-1,0');
    for (const h of d) expect(s.board.has(h)).toBe(false);
    expect(d).not.toContain('-1,0');
  });

  describe('Otter', () => {
    const base = { '-1,0': 'bT', '0,0': 'wO', '1,0': 'wT' };

    it('lifts an adjacent tile over itself into an empty neighbouring space', () => {
      const s = position(base);
      const opts = getLiftOptions(s, '0,0');
      expect(sorted(opts.get('-1,0')!)).toEqual(sorted(['1,-1', '0,-1', '-1,1', '0,1']));
      const after = applyAction(s, { type: 'throw', by: '0,0', from: '-1,0', to: '0,1' });
      expect(after.board.get('0,1')![0].bug).toBe('turtle');
    });

    it('also moves one space like the Turtle', () => {
      const s = position({ '-1,0': 'bT', '0,0': 'wT', '1,0': 'wO' });
      expect(sorted(getLegalMoves(s, '1,0'))).toEqual(sorted(['1,-1', '0,1']));
    });

    it('a lifted tile must rest on the next turn', () => {
      const s = position(base);
      const after = applyAction(s, { type: 'throw', by: '0,0', from: '-1,0', to: '0,1' });
      expect(after.turn).toBe('b');
      expect(validateAction(after, move('0,1', '-1,1'))).toMatchObject({ ok: false, reason: expect.stringMatching(/rest/) });
    });

    it('cannot lift the tile the opponent just moved', () => {
      const s = position({ ...base, '-2,1': 'bM' }, { turn: 'b' });
      const moved = applyAction(s, move('-2,1', '-1,1'));
      expect(getLiftOptions(moved, '0,0').has('-1,1')).toBe(false);
      expect(getLiftOptions(moved, '0,0').has('-1,0')).toBe(true);
    });

    it('cannot lift a stacked tile or one whose removal splits the pond', () => {
      const stacked = position({ '-1,0': 'bT bS', '0,0': 'wO', '1,0': 'wT' });
      expect(getLiftOptions(stacked, '0,0').has('-1,0')).toBe(false);
      const bridge = position({ '-2,0': 'bF', '-1,0': 'bT', '0,0': 'wO', '1,0': 'wT' });
      expect(getLiftOptions(bridge, '0,0').has('-1,0')).toBe(false);
    });

    it('cannot lift through a gate of taller stacks', () => {
      // Flanks of -1,0 → 0,0 are -1,1 and 0,-1: both height 2.
      const s = position({ '-1,0': 'bF', '0,0': 'wO', '1,0': 'wT', '-1,1': 'bC bS', '0,-1': 'bT wS', '-2,1': 'bM' });
      expect(getLiftOptions(s, '0,0').has('-1,0')).toBe(false);
    });

    it('a Newt touching an Otter can lift too, and an Otter under a Snail cannot', () => {
      const s = position({ '-1,0': 'bT', '0,0': 'wN', '1,0': 'bO', '1,-1': 'wT' });
      expect(getLiftOptions(s, '0,0').size).toBeGreaterThan(0);
      const covered = position({ '-1,0': 'bT', '0,0': 'wO bS', '1,0': 'wT' });
      expect(getLiftOptions({ ...covered, turn: 'w' }, '0,0').size).toBe(0);
    });
  });
});

describe('passing and game end', () => {
  // Black's Turtle at the centre with five white tiles around it: no move, no placement.
  const stuck = { '0,0': 'bT', '1,0': 'wT', '1,-1': 'wF', '0,-1': 'wF', '-1,0': 'wC', '-1,1': 'wC' };

  it('passing is the only option when a player has no legal action', () => {
    const s = position(stuck, { turn: 'b' });
    expect(getLegalActions(s)).toEqual([{ type: 'pass' }]);
    const after = applyAction(s, { type: 'pass' });
    expect(after.turn).toBe('w');
    expect(validateAction(after, { type: 'pass' }).ok).toBe(false);
  });

  it('surrounding the Turtle wins', () => {
    const s = position({ ...stuck, '1,1': 'wM' });
    const after = applyAction(s, move('1,1', '0,1'));
    expect(after.result).toEqual({ winner: 'w', reason: 'surround' });
    expect(getLegalActions(after)).toEqual([]);
    expect(validateAction(after, { type: 'pass' }).ok).toBe(false);
  });

  it('surrounding both Turtles at once is a draw', () => {
    const s = position({ ...stuck, '2,0': 'bF', '2,-1': 'bF', '1,1': 'bF', '0,2': 'wM', '0,3': 'wF' });
    const after = applyAction(s, move('0,3', '0,1'));
    expect(after.result).toEqual({ winner: 'draw', reason: 'surround' });
  });
});
