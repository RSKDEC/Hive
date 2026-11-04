import type { Action } from '../types';

/** A short complete Basic game in which Sun surrounds Moon's Pharaoh on move 11. Shared by unit and browser tests. */
export const SCRIPTED_WIN: Action[] = [
  { type: 'place', bug: 'jerboa', to: '0,0' },
  { type: 'place', bug: 'jerboa', to: '1,0' },
  { type: 'place', bug: 'pharaoh', to: '-1,0' },
  { type: 'place', bug: 'pharaoh', to: '2,0' },
  { type: 'place', bug: 'camel', to: '-1,1' },
  { type: 'place', bug: 'cat', to: '3,0' },
  { type: 'place', bug: 'camel', to: '-2,1' },
  { type: 'place', bug: 'cat', to: '3,-1' },
  { type: 'move', from: '-1,1', to: '2,1' },
  { type: 'place', bug: 'scorpion', to: '2,-1' },
  { type: 'move', from: '-2,1', to: '1,1' },
];
