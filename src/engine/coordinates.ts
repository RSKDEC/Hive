import type { Hex } from './types';

/** Axial directions, clockwise starting east (pointy-top layout). */
export const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1],
];

export const ORIGIN: Hex = '0,0';

export const hex = (q: number, r: number): Hex => `${q},${r}`;

export function parseHex(h: Hex): [number, number] {
  const i = h.indexOf(',');
  return [Number(h.slice(0, i)), Number(h.slice(i + 1))];
}

/** Third cube coordinate. */
export const cubeS = (q: number, r: number) => -q - r;

export function neighbor(h: Hex, dir: number): Hex {
  const [q, r] = parseHex(h);
  const d = DIRECTIONS[((dir % 6) + 6) % 6];
  return hex(q + d[0], r + d[1]);
}

export function neighbors(h: Hex): Hex[] {
  const [q, r] = parseHex(h);
  return DIRECTIONS.map(([dq, dr]) => hex(q + dq, r + dr));
}

/** Direction index from a to b if adjacent, otherwise -1. */
export function directionTo(a: Hex, b: Hex): number {
  const [q1, r1] = parseHex(a);
  const [q2, r2] = parseHex(b);
  return DIRECTIONS.findIndex(([dq, dr]) => q1 + dq === q2 && r1 + dr === r2);
}

export const isAdjacent = (a: Hex, b: Hex) => directionTo(a, b) !== -1;

export function distance(a: Hex, b: Hex): number {
  const [q1, r1] = parseHex(a);
  const [q2, r2] = parseHex(b);
  return (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs(cubeS(q1, r1) - cubeS(q2, r2))) / 2;
}

/** Pixel centre for a pointy-top hex of the given radius. */
export function toPixel(h: Hex, size: number): [number, number] {
  const [q, r] = parseHex(h);
  return [size * Math.sqrt(3) * (q + r / 2), size * 1.5 * r];
}
