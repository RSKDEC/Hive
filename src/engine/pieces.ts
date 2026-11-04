import type { Bug, Color, GameConfig } from './types';

export interface BugInfo {
  name: string;
  count: number;
  expansion: boolean;
  /** One-line summary for trays and tooltips. */
  short: string;
  /** Fuller explanation for the rules guide. */
  long: string;
}

export const BUGS: Record<Bug, BugInfo> = {
  turtle: {
    name: 'Turtle', count: 1, expansion: false,
    short: 'Moves 1 space. Protect it!',
    long: 'Moves one space by sliding. If your Turtle is surrounded on all six sides, you lose. It must be placed by your 4th turn, and no tile of yours may move until it is in play. It cannot be your very first tile.',
  },
  snail: {
    name: 'Snail', count: 2, expansion: false,
    short: 'Moves 1 space and can climb on top.',
    long: 'Moves one space in any direction, including up onto other tiles and across the top of the pond. A tile with a Snail on it is trapped, and the stack belongs to the Snail’s owner. Snails cannot squeeze between two taller stacks.',
  },
  frog: {
    name: 'Frog', count: 3, expansion: false,
    short: 'Jumps in a straight line over tiles.',
    long: 'Jumps in a straight line over one or more touching tiles and lands in the first empty space. It must jump over at least one tile, and gaps cannot stop or block it.',
  },
  crab: {
    name: 'Crab', count: 2, expansion: false,
    short: 'Scuttles exactly 3 spaces around the edge.',
    long: 'Slides exactly three spaces around the edge of the pond — no more, no less — without going back over a space in the same move.',
  },
  minnow: {
    name: 'Minnow', count: 3, expansion: false,
    short: 'Swims any distance around the edge.',
    long: 'Slides any number of spaces around the outside of the pond. It cannot squeeze through narrow gaps or enter enclosed pools.',
  },
  newt: {
    name: 'Newt', count: 1, expansion: true,
    short: 'Copies the creatures it touches.',
    long: 'Moves like any creature it is touching (of either colour). Touching only another Newt gives it no move. Once it climbs on top of the pond it moves like a Snail until it comes back down. Touching an Otter lets it use the Otter’s lift too.',
  },
  dragonfly: {
    name: 'Dragonfly', count: 1, expansion: true,
    short: '2 steps over the top, then 1 down.',
    long: 'Moves exactly three spaces: two steps across the top of the pond, then one step down into an empty space. It cannot end on top of a tile.',
  },
  otter: {
    name: 'Otter', count: 1, expansion: true,
    short: 'Moves 1 space, or lifts a neighbour over itself.',
    long: 'Either moves one space like the Turtle, or lifts an adjacent single tile (of either colour) over itself into another empty space next to it. It cannot lift a stacked tile, a tile the opponent just moved, or a tile whose removal would split the pond. A tile that was lifted cannot move on the following turn.',
  },
};

export const BASE_BUGS: Bug[] = ['turtle', 'snail', 'frog', 'crab', 'minnow'];
export const ALL_BUGS: Bug[] = ['turtle', 'snail', 'frog', 'crab', 'minnow', 'newt', 'dragonfly', 'otter'];

export const COLOR_NAMES: Record<Color, string> = { w: 'Sun', b: 'Moon' };
export const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');

export const BASIC_CONFIG: GameConfig = { newt: false, dragonfly: false, otter: false };
export const FULL_CONFIG: GameConfig = { newt: true, dragonfly: true, otter: true };

export function bugsInPlay(config: GameConfig): Bug[] {
  return ALL_BUGS.filter((b) => !BUGS[b].expansion || config[b as keyof GameConfig]);
}

export function configLabel(config: GameConfig): string {
  const extras = (['newt', 'dragonfly', 'otter'] as const).filter((k) => config[k]);
  if (extras.length === 0) return 'Basic';
  if (extras.length === 3) return 'Full';
  return 'Basic + ' + extras.map((e) => BUGS[e].name).join(', ');
}

export function normalizeConfig(input: unknown): GameConfig {
  const o = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  return { newt: o.newt === true, dragonfly: o.dragonfly === true, otter: o.otter === true };
}
