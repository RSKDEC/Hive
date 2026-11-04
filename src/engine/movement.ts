import type { Board, Bug, Hex } from './types';
import { neighbor, neighbors, parseHex, hex, DIRECTIONS } from './coordinates';
import { height, topPiece } from './board';
import { slides, canClimbStep } from './sliding';

/**
 * Destinations for a creature of type `bug` that has been lifted from `from`.
 * `b` is the board *without* the moving piece. One-pond and ownership checks happen elsewhere.
 */
export function destinationsFor(b: Board, from: Hex, bug: Bug): Set<Hex> {
  switch (bug) {
    case 'turtle':
    case 'otter':
      return new Set(height(b, from) === 0 ? slides(b, from) : []);
    case 'snail':
      return snailMoves(b, from);
    case 'frog':
      return frogMoves(b, from);
    case 'crab':
      return crabMoves(b, from);
    case 'minnow':
      return minnowMoves(b, from);
    case 'dragonfly':
      return dragonflyMoves(b, from);
    case 'newt':
      return newtMoves(b, from);
  }
}

function snailMoves(b: Board, from: Hex): Set<Hex> {
  const out = new Set<Hex>();
  for (let d = 0; d < 6; d++) if (canClimbStep(b, from, d)) out.add(neighbor(from, d));
  return out;
}

function frogMoves(b: Board, from: Hex): Set<Hex> {
  const out = new Set<Hex>();
  const [q, r] = parseHex(from);
  for (const [dq, dr] of DIRECTIONS) {
    let x = q + dq, y = r + dr;
    if (!b.has(hex(x, y))) continue; // must jump over at least one tile
    while (b.has(hex(x, y))) { x += dq; y += dr; }
    out.add(hex(x, y));
  }
  return out;
}

function crabMoves(b: Board, from: Hex): Set<Hex> {
  const out = new Set<Hex>();
  const walk = (cur: Hex, visited: Hex[]) => {
    if (visited.length === 4) { out.add(cur); return; }
    for (const n of slides(b, cur)) if (!visited.includes(n)) walk(n, [...visited, n]);
  };
  if (height(b, from) === 0) walk(from, [from]);
  return out;
}

function minnowMoves(b: Board, from: Hex): Set<Hex> {
  const seen = new Set<Hex>([from]);
  if (height(b, from) > 0) return new Set();
  const queue: Hex[] = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const n of slides(b, cur)) if (!seen.has(n)) { seen.add(n); queue.push(n); }
  }
  seen.delete(from);
  return seen;
}

function dragonflyMoves(b: Board, from: Hex): Set<Hex> {
  const out = new Set<Hex>();
  for (let d1 = 0; d1 < 6; d1++) {
    const a = neighbor(from, d1);
    if (!b.has(a) || !canClimbStep(b, from, d1)) continue;
    for (let d2 = 0; d2 < 6; d2++) {
      const c = neighbor(a, d2);
      if (c === from || !b.has(c) || !canClimbStep(b, a, d2)) continue;
      for (let d3 = 0; d3 < 6; d3++) {
        const e = neighbor(c, d3);
        if (e === from || b.has(e) || !canClimbStep(b, c, d3)) continue;
        out.add(e);
      }
    }
  }
  return out;
}

/** Creature types a ground-level Newt at `from` can currently copy. */
export function newtCopies(b: Board, from: Hex): Bug[] {
  const out = new Set<Bug>();
  for (const n of neighbors(from)) {
    const t = topPiece(b, n);
    if (t && t.bug !== 'newt') out.add(t.bug);
  }
  return [...out];
}

function newtMoves(b: Board, from: Hex): Set<Hex> {
  // Up on the pond, a Newt acts as a Snail until it climbs down.
  if (height(b, from) > 0) return snailMoves(b, from);
  const out = new Set<Hex>();
  for (const bug of newtCopies(b, from)) for (const d of destinationsFor(b, from, bug)) out.add(d);
  return out;
}
