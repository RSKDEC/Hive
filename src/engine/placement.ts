import type { Board, Bug, Color, GameState, Hex } from './types';
import { ORIGIN, neighbors } from './coordinates';
import { controlledBy, perimeter } from './board';

export const turnNumber = (s: GameState): number => Math.floor(s.ply / 2) + 1; // 1-based, per player
export const pharaohPlaced = (s: GameState, c: Color): boolean => s.hands[c].pharaoh === 0;

function hasPieceOnBoard(b: Board, c: Color): boolean {
  for (const st of b.values()) if (st.some((p) => p.color === c)) return true;
  return false;
}

/** Empty cells where colour `c` may introduce a new tile (ignores which bug). */
export function placementCells(b: Board, c: Color): Hex[] {
  if (b.size === 0) return [ORIGIN];
  if (!hasPieceOnBoard(b, c)) return perimeter(b); // second player's first tile
  const out: Hex[] = [];
  for (const cell of perimeter(b)) {
    let touchesOwn = false;
    let touchesOther = false;
    for (const n of neighbors(cell)) {
      const owner = controlledBy(b, n);
      if (owner === c) touchesOwn = true;
      else if (owner) { touchesOther = true; break; }
    }
    if (touchesOwn && !touchesOther) out.push(cell);
  }
  return out;
}

/** Why `bug` can't be placed this turn, or null if it can (somewhere). */
export function placementBlockReason(s: GameState, bug: Bug): string | null {
  const c = s.turn;
  if (!(bug in s.hands[c]) || s.hands[c][bug] <= 0) return 'You have no more of those tiles.';
  const n = turnNumber(s);
  if (bug === 'pharaoh' && n === 1) return 'The Pharaoh can’t be your very first tile.';
  if (bug !== 'pharaoh' && n === 4 && !pharaohPlaced(s, c)) return 'Your Pharaoh must be placed by your 4th turn — place it now.';
  return null;
}

export function getLegalPlacements(s: GameState, bug: Bug): Hex[] {
  if (s.result || placementBlockReason(s, bug)) return [];
  return placementCells(s.board, s.turn);
}
