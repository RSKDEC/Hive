import type { Action } from '../types';

/** A short complete Basic game in which Sun surrounds Moon's Turtle on move 11. Shared by unit and browser tests. */
export const SCRIPTED_WIN: Action[] = [
  { type: 'place', bug: 'frog', to: '0,0' },
  { type: 'place', bug: 'frog', to: '1,0' },
  { type: 'place', bug: 'turtle', to: '-1,0' },
  { type: 'place', bug: 'turtle', to: '2,0' },
  { type: 'place', bug: 'minnow', to: '-1,1' },
  { type: 'place', bug: 'snail', to: '3,0' },
  { type: 'place', bug: 'minnow', to: '-2,1' },
  { type: 'place', bug: 'snail', to: '3,-1' },
  { type: 'move', from: '-1,1', to: '2,1' },
  { type: 'place', bug: 'crab', to: '2,-1' },
  { type: 'move', from: '-2,1', to: '1,1' },
];
