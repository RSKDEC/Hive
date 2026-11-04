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
  pharaoh: {
    name: 'Pharaoh', count: 1, expansion: false,
    short: 'Moves 1 space. Protect it!',
    long: 'Moves one space by sliding. If your Pharaoh is surrounded on all six sides, you lose. It must be placed by your 4th turn, and no tile of yours may move until it is in play. It cannot be your very first tile.',
  },
  cat: {
    name: 'Cat', count: 2, expansion: false,
    short: 'Moves 1 space and can climb on top.',
    long: 'Moves one space in any direction, including up onto other tiles and across the top of the oasis. A tile with a Cat on it is trapped, and the stack belongs to the Cat’s owner. Cats cannot squeeze between two taller stacks.',
  },
  jerboa: {
    name: 'Jerboa', count: 3, expansion: false,
    short: 'Hops in a straight line over tiles.',
    long: 'Hops in a straight line over one or more touching tiles and lands in the first empty space. It must jump over at least one tile, and gaps cannot stop or block it.',
  },
  scorpion: {
    name: 'Scorpion', count: 2, expansion: false,
    short: 'Scuttles exactly 3 spaces around the edge.',
    long: 'Slides exactly three spaces around the edge of the oasis — no more, no less — without going back over a space in the same move.',
  },
  camel: {
    name: 'Camel', count: 3, expansion: false,
    short: 'Treks any distance around the edge.',
    long: 'Slides any number of spaces around the outside of the oasis. It cannot squeeze through narrow gaps or enter enclosed hollows.',
  },
  chameleon: {
    name: 'Chameleon', count: 1, expansion: true,
    short: 'Copies the creatures it touches.',
    long: 'Moves like any creature it is touching (of either colour). Touching only another Chameleon gives it no move. Once it climbs on top of the oasis it moves like a Cat until it comes back down. Touching an Ibis lets it use the Ibis’s lift too.',
  },
  falcon: {
    name: 'Falcon', count: 1, expansion: true,
    short: 'Flies 2 steps over the top, then lands.',
    long: 'Moves exactly three spaces: two steps flying across the top of the oasis, then one step down into an empty space. It cannot end on top of a tile.',
  },
  ibis: {
    name: 'Ibis', count: 1, expansion: true,
    short: 'Moves 1 space, or carries a neighbour over itself.',
    long: 'Either moves one space like the Pharaoh, or lifts an adjacent single tile (of either colour) over itself into another empty space next to it. It cannot lift a stacked tile, a tile the opponent just moved, or a tile whose removal would split the oasis. A tile that was lifted cannot move on the following turn.',
  },
};

export const BASE_BUGS: Bug[] = ['pharaoh', 'cat', 'jerboa', 'scorpion', 'camel'];
export const ALL_BUGS: Bug[] = ['pharaoh', 'cat', 'jerboa', 'scorpion', 'camel', 'chameleon', 'falcon', 'ibis'];

export const COLOR_NAMES: Record<Color, string> = { w: 'Sun', b: 'Moon' };
export const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');

export const BASIC_CONFIG: GameConfig = { chameleon: false, falcon: false, ibis: false };
export const FULL_CONFIG: GameConfig = { chameleon: true, falcon: true, ibis: true };

export function bugsInPlay(config: GameConfig): Bug[] {
  return ALL_BUGS.filter((b) => !BUGS[b].expansion || config[b as keyof GameConfig]);
}

export function configLabel(config: GameConfig): string {
  const extras = (['chameleon', 'falcon', 'ibis'] as const).filter((k) => config[k]);
  if (extras.length === 0) return 'Basic';
  if (extras.length === 3) return 'Full';
  return 'Basic + ' + extras.map((e) => BUGS[e].name).join(', ');
}

export function normalizeConfig(input: unknown): GameConfig {
  const o = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  return { chameleon: o.chameleon === true, falcon: o.falcon === true, ibis: o.ibis === true };
}
