import type { GameState, Hex } from './types';
import { neighbor, neighbors, directionTo } from './coordinates';
import { height, liftFrom, topPiece } from './board';
import { canLift } from './connectivity';
import { flankHeights } from './sliding';

/** Can the gate between `from` and its neighbour `to` be crossed by a piece travelling at height? */
function gateOpen(b: Parameters<typeof height>[0], from: Hex, to: Hex): boolean {
  const d = directionTo(from, to);
  const [h1, h2] = flankHeights(b, from, d);
  return Math.min(h1, h2) <= Math.max(height(b, from), height(b, to));
}

/** The piece that was lifted by an Otter last turn can't move or act this turn. */
export function isResting(s: GameState, pieceId: string): boolean {
  return s.last?.kind === 'throw' && s.last.pieceId === pieceId;
}

/** Can the top piece at `by` (owned by the player to move) use the Otter's lift? */
export function hasLiftAbility(s: GameState, by: Hex): boolean {
  const p = topPiece(s.board, by);
  if (!p || p.color !== s.turn || height(s.board, by) !== 1 || isResting(s, p.id)) return false;
  if (p.bug === 'otter') return true;
  if (p.bug === 'newt') return neighbors(by).some((n) => topPiece(s.board, n)?.bug === 'otter');
  return false;
}

/** Why the tile at `from` can't be lifted by `by`, or null. Assumes hasLiftAbility(by). */
export function liftBlockReason(s: GameState, by: Hex, from: Hex): string | null {
  const b = s.board;
  if (directionTo(by, from) === -1) return 'The Otter can only lift a tile right next to it.';
  const t = topPiece(b, from);
  if (!t) return 'There is no tile there.';
  if (height(b, from) > 1) return 'Stacked tiles can’t be lifted.';
  if (s.last && s.last.kind !== 'place' && s.last.pieceId === t.id) return 'That tile just moved, so it can’t be lifted this turn.';
  if (!canLift(b, from)) return 'Lifting that tile would split the pond.';
  if (!gateOpen(liftFrom(b, from), from, by)) return 'That tile is wedged in too tightly to be lifted.';
  return null;
}

/** For an Otter-capable piece at `by`: map of liftable neighbour → empty cells it can be set down on. */
export function getLiftOptions(s: GameState, by: Hex): Map<Hex, Hex[]> {
  const out = new Map<Hex, Hex[]>();
  if (!hasLiftAbility(s, by)) return out;
  for (const from of neighbors(by)) {
    if (!s.board.has(from) || liftBlockReason(s, by, from)) continue;
    const lifted = liftFrom(s.board, from);
    const drops: Hex[] = [];
    for (let d = 0; d < 6; d++) {
      const to = neighbor(by, d);
      if (to === from || lifted.has(to)) continue;
      if (gateOpen(lifted, by, to)) drops.push(to);
    }
    if (drops.length) out.set(from, drops);
  }
  return out;
}
