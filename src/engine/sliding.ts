import type { Board, Hex } from './types';
import { neighbor } from './coordinates';
import { height } from './board';

/** Heights of the two cells flanking the step from `from` in direction `dir`. */
export function flankHeights(b: Board, from: Hex, dir: number): [number, number] {
  return [height(b, neighbor(from, dir - 1)), height(b, neighbor(from, dir + 1))];
}

/**
 * Ground-level slide (Freedom to Move). The destination must be empty, exactly one of the two
 * flanking cells must be occupied: none would mean losing contact with the oasis while sliding,
 * both would mean the gap is too narrow to pass.
 * `b` must already have the moving piece lifted.
 */
export function canSlide(b: Board, from: Hex, dir: number): boolean {
  const to = neighbor(from, dir);
  if (b.has(to)) return false;
  const [h1, h2] = flankHeights(b, from, dir);
  return (h1 > 0) !== (h2 > 0);
}

/** All single ground-level slides from `from` (moving piece already lifted). */
export function slides(b: Board, from: Hex): Hex[] {
  const out: Hex[] = [];
  for (let d = 0; d < 6; d++) if (canSlide(b, from, d)) out.push(neighbor(from, d));
  return out;
}

/**
 * Height-aware step used by climbing creatures. A creature currently resting on a stack of
 * height `hFrom` (moving piece already lifted) may step in direction `dir` unless both flanking
 * stacks are taller than both the starting and destination stacks. A move entirely at ground
 * level additionally needs contact with the oasis.
 */
export function canClimbStep(b: Board, from: Hex, dir: number): boolean {
  const to = neighbor(from, dir);
  const hFrom = height(b, from);
  const hTo = height(b, to);
  const [h1, h2] = flankHeights(b, from, dir);
  if (Math.min(h1, h2) > Math.max(hFrom, hTo)) return false;
  if (Math.max(hFrom, hTo, h1, h2) === 0) return false;
  return true;
}
