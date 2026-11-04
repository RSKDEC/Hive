import type { Action, Bug, Color, GameConfig, GameResult, GameState, Hex, Validation } from './types';
import { BASIC_CONFIG, BUGS, bugsInPlay, other } from './pieces';
import { liftFrom, topPiece } from './board';
import { canLift } from './connectivity';
import { destinationsFor } from './movement';
import { getLegalPlacements, placementBlockReason, placementCells, turnNumber, turtlePlaced } from './placement';
import { getLiftOptions, hasLiftAbility, isResting, liftBlockReason } from './expansions';
import { checkSurround } from './winner';

export function createGame(config: GameConfig = BASIC_CONFIG): GameState {
  const hand = () => {
    const h = {} as Record<Bug, number>;
    for (const bug of bugsInPlay(config)) h[bug] = BUGS[bug].count;
    return h;
  };
  return { config: { ...config }, board: new Map(), hands: { w: hand(), b: hand() }, turn: 'w', ply: 0, history: [], last: null, result: null };
}

// --- Movement of pieces already on the board ---------------------------------------------

/** Why the player to move can't move the top tile at `from`, or null if it may be able to. */
export function moveBlockReason(s: GameState, from: Hex): string | null {
  if (s.result) return 'The game is over.';
  const st = s.board.get(from);
  if (!st) return 'There is no tile there.';
  const top = st[st.length - 1];
  if (top.color !== s.turn) {
    if (st.some((p) => p.color === s.turn)) return 'That tile is trapped underneath — only the top tile of a stack can move.';
    return 'That tile belongs to the other player.';
  }
  if (!turtlePlaced(s, s.turn)) {
    return turnNumber(s) === 4 ? 'Your Turtle must be placed this turn.' : 'Place your Turtle before moving tiles.';
  }
  if (isResting(s, top.id)) return 'That tile was just lifted by an Otter and must rest this turn.';
  if (!canLift(s.board, from)) return 'Moving that tile would split the pond (One Pond rule).';
  return null;
}

/** Legal destinations for the top tile at `from` (empty if it can't move). */
export function getLegalMoves(s: GameState, from: Hex): Hex[] {
  if (moveBlockReason(s, from)) return [];
  const piece = topPiece(s.board, from)!;
  const lifted = liftFrom(s.board, from);
  const dests = destinationsFor(lifted, from, piece.bug);
  dests.delete(from);
  return [...dests];
}

export function getLegalMovesForPiece(s: GameState, pieceId: string): Hex[] {
  for (const [k, st] of s.board) if (st[st.length - 1].id === pieceId) return getLegalMoves(s, k);
  return [];
}

// --- All actions ------------------------------------------------------------------------------

export function getLegalActions(s: GameState): Action[] {
  if (s.result) return [];
  const out: Action[] = [];
  const cells = placementCells(s.board, s.turn);
  for (const bug of Object.keys(s.hands[s.turn]) as Bug[]) {
    if (placementBlockReason(s, bug)) continue;
    for (const to of cells) out.push({ type: 'place', bug, to });
  }
  if (turtlePlaced(s, s.turn)) {
    for (const [from, st] of s.board) {
      if (st[st.length - 1].color !== s.turn) continue;
      for (const to of getLegalMoves(s, from)) out.push({ type: 'move', from, to });
      if (hasLiftAbility(s, from)) {
        for (const [target, drops] of getLiftOptions(s, from)) for (const to of drops) out.push({ type: 'throw', by: from, from: target, to });
      }
    }
  }
  if (out.length === 0) out.push({ type: 'pass' });
  return out;
}

export function hasAnyMove(s: GameState): boolean {
  const a = getLegalActions(s);
  return !(a.length === 1 && a[0].type === 'pass');
}

export function validateAction(s: GameState, a: Action): Validation {
  const no = (reason: string): Validation => ({ ok: false, reason });
  if (s.result) return no('The game is over.');
  if (!a || typeof a !== 'object') return no('Unknown action.');
  switch (a.type) {
    case 'place': {
      if (!(a.bug in BUGS)) return no('Unknown creature.');
      if (!(a.bug in s.hands[s.turn])) return no('That creature is not used in this game.');
      const why = placementBlockReason(s, a.bug);
      if (why) return no(why);
      if (!getLegalPlacements(s, a.bug).includes(a.to)) {
        if (s.board.has(a.to)) return no('New tiles can’t be placed on top of other tiles.');
        return no(s.board.size === 0 ? 'The first tile goes in the centre.' : 'New tiles must touch your own colour and must not touch the other colour.');
      }
      return { ok: true };
    }
    case 'move': {
      const why = moveBlockReason(s, a.from);
      if (why) return no(why);
      if (!getLegalMoves(s, a.from).includes(a.to)) {
        const bug = topPiece(s.board, a.from)!.bug;
        return no(`The ${BUGS[bug].name} can’t move there. ${BUGS[bug].short}`);
      }
      return { ok: true };
    }
    case 'throw': {
      if (!turtlePlaced(s, s.turn)) return no('Place your Turtle before moving tiles.');
      if (!hasLiftAbility(s, a.by)) return no('Only an Otter (or a Newt touching one) can lift tiles.');
      const why = liftBlockReason(s, a.by, a.from);
      if (why) return no(why);
      const drops = getLiftOptions(s, a.by).get(a.from) ?? [];
      if (!drops.includes(a.to)) return no('The lifted tile can’t be set down there.');
      return { ok: true };
    }
    case 'pass':
      return hasAnyMove(s) ? no('You can only pass when you have no legal move.') : { ok: true };
    default:
      return no('Unknown action.');
  }
}

/** Returns the new state after `a`. Throws if the action is illegal. Never mutates `s`. */
export function applyAction(s: GameState, a: Action): GameState {
  const v = validateAction(s, a);
  if (!v.ok) throw new Error(v.reason);
  return applyUnchecked(s, a);
}

/** Applies a known-legal action (used by the AI search for speed). */
export function applyUnchecked(s: GameState, a: Action): GameState {
  const c = s.turn;
  const board = new Map(s.board);
  const hands = { w: { ...s.hands.w }, b: { ...s.hands.b } };
  let last = s.last;
  if (a.type === 'place') {
    const n = BUGS[a.bug].count - hands[c][a.bug] + 1;
    hands[c][a.bug]--;
    const piece = { id: `${c}-${a.bug}-${n}`, color: c, bug: a.bug };
    board.set(a.to, [piece]);
    last = { pieceId: piece.id, color: c, kind: 'place', to: a.to };
  } else if (a.type === 'move' || a.type === 'throw') {
    const src = board.get(a.from)!.slice();
    const piece = src.pop()!;
    if (src.length) board.set(a.from, src); else board.delete(a.from);
    board.set(a.to, [...(board.get(a.to) ?? []), piece]);
    last = { pieceId: piece.id, color: c, kind: a.type, from: a.from, to: a.to };
  } else {
    last = null; // a pass ends any "just moved" / "resting" effects
  }
  return {
    config: s.config, board, hands, turn: other(c), ply: s.ply + 1,
    history: [...s.history, a], last, result: checkSurround(board),
  };
}

/** Ends the game by resignation or agreement. */
export function endGame(s: GameState, result: GameResult): GameState {
  if (s.result) return s;
  return { ...s, result };
}

export function resign(s: GameState, loser: Color): GameState {
  return endGame(s, { winner: other(loser), reason: 'resign' });
}

export function checkGameResult(s: GameState): GameResult | null {
  return s.result ?? checkSurround(s.board);
}
