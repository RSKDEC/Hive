import type { Board, Hex } from './types';
import { neighbors } from './coordinates';
import { height } from './board';

/** True when all occupied cells form a single connected group. */
export function isConnected(b: Board): boolean {
  const first = b.keys().next();
  if (first.done) return true;
  const seen = new Set<Hex>([first.value]);
  const stack: Hex[] = [first.value];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const n of neighbors(cur)) if (b.has(n) && !seen.has(n)) { seen.add(n); stack.push(n); }
  }
  return seen.size === b.size;
}

/**
 * Cells whose removal (of the whole ground cell) would split the oasis — articulation points.
 * Linear-time (Tarjan), used for fast "pinned" checks.
 */
export function articulationPoints(b: Board): Set<Hex> {
  const out = new Set<Hex>();
  const disc = new Map<Hex, number>();
  const low = new Map<Hex, number>();
  let t = 0;
  const start = b.keys().next();
  if (start.done) return out;
  // Iterative DFS to avoid deep recursion.
  type Frame = { v: Hex; parent: Hex | null; ns: Hex[]; i: number; children: number };
  const stack: Frame[] = [];
  const push = (v: Hex, parent: Hex | null) => {
    disc.set(v, t); low.set(v, t); t++;
    stack.push({ v, parent, ns: neighbors(v).filter((n) => b.has(n)), i: 0, children: 0 });
  };
  push(start.value, null);
  while (stack.length) {
    const f = stack[stack.length - 1];
    if (f.i < f.ns.length) {
      const w = f.ns[f.i++];
      if (!disc.has(w)) { f.children++; push(w, f.v); }
      else if (w !== f.parent) low.set(f.v, Math.min(low.get(f.v)!, disc.get(w)!));
    } else {
      stack.pop();
      const p = stack[stack.length - 1];
      if (p) {
        low.set(p.v, Math.min(low.get(p.v)!, low.get(f.v)!));
        if (p.parent !== null && low.get(f.v)! >= disc.get(p.v)!) out.add(p.v);
      } else if (f.children > 1) out.add(f.v);
    }
  }
  return out;
}

/** One Oasis rule: can the top piece at `h` be picked up without splitting the oasis? */
export function canLift(b: Board, h: Hex): boolean {
  if (height(b, h) > 1) return true; // something stays behind underneath
  if (!b.has(h)) return false;
  const rest = new Map(b);
  rest.delete(h);
  return isConnected(rest);
}
