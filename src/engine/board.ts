import type { Board, Color, Hex, Piece } from './types';
import { neighbors } from './coordinates';

export const height = (b: Board, h: Hex): number => b.get(h)?.length ?? 0;
export const occupied = (b: Board, h: Hex): boolean => b.has(h);

export function topPiece(b: Board, h: Hex): Piece | null {
  const s = b.get(h);
  return s && s.length ? s[s.length - 1] : null;
}

export function cloneBoard(b: Board): Board {
  const out: Board = new Map();
  for (const [k, s] of b) out.set(k, s.slice());
  return out;
}

/** A copy of the board with the top piece at `h` removed (as if picked up). */
export function liftFrom(b: Board, h: Hex): Board {
  const out = new Map(b);
  const s = b.get(h);
  if (!s) return out;
  if (s.length <= 1) out.delete(h);
  else out.set(h, s.slice(0, -1));
  return out;
}

export function controlledBy(b: Board, h: Hex): Color | null {
  return topPiece(b, h)?.color ?? null;
}

/** Empty cells touching the oasis. */
export function perimeter(b: Board): Hex[] {
  const out = new Set<Hex>();
  for (const k of b.keys()) for (const n of neighbors(k)) if (!b.has(n)) out.add(n);
  return [...out];
}

export function findPiece(b: Board, id: string): { hex: Hex; level: number } | null {
  for (const [k, s] of b) {
    const i = s.findIndex((p) => p.id === id);
    if (i >= 0) return { hex: k, level: i };
  }
  return null;
}

/** Every piece on the board with its position and stack level (0 = ground). */
export function allPieces(b: Board): Array<Piece & { hex: Hex; level: number }> {
  const out: Array<Piece & { hex: Hex; level: number }> = [];
  for (const [k, s] of b) s.forEach((p, level) => out.push({ ...p, hex: k, level }));
  return out;
}
