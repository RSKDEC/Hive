import type { Action, GameState } from './types';
import { BUGS, COLOR_NAMES } from './pieces';
import { topPiece } from './board';

/** Plain-language description of `a`, played from position `before`. */
export function describeAction(before: GameState, a: Action): string {
  const who = COLOR_NAMES[before.turn];
  switch (a.type) {
    case 'place':
      return `${who} placed ${/^[AEIOU]/.test(BUGS[a.bug].name) ? 'an' : 'a'} ${BUGS[a.bug].name}`;
    case 'move': {
      const p = topPiece(before.board, a.from);
      const onto = topPiece(before.board, a.to);
      const name = p ? BUGS[p.bug].name : 'tile';
      return onto ? `${who} ${name} climbed onto ${COLOR_NAMES[onto.color]} ${BUGS[onto.bug].name}` : `${who} moved ${name}`;
    }
    case 'throw': {
      const by = topPiece(before.board, a.by);
      const p = topPiece(before.board, a.from);
      return `${who} ${by ? BUGS[by.bug].name : 'Ibis'} lifted ${p ? `${COLOR_NAMES[p.color]} ${BUGS[p.bug].name}` : 'a tile'}`;
    }
    case 'pass':
      return `${who} had no move and passed`;
  }
}
