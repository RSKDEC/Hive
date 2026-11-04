'use client';

import { BUGS, COLOR_NAMES, surroundCount, type Bug, type Color, type GameState } from '@/engine';
import { PieceIcon } from './PieceArt';

interface Props {
  state: GameState;
  color: Color;
  name: string;
  active: boolean;
  selectedBug: Bug | null;
  enabled: boolean;
  forcedPharaoh: boolean;
  onPick: (bug: Bug) => void;
  position: 'top' | 'bottom';
  large?: boolean;
  tag?: string;
}

export function PlayerPanel({ state, color, name, active, selectedBug, enabled, forcedPharaoh, onPick, position, large, tag }: Props) {
  const hand = state.hands[color];
  const bugs = Object.keys(hand) as Bug[];
  const surrounded = surroundCount(state.board, color);
  const iconSize = large ? 60 : position === 'top' ? 40 : 50;
  return (
    <section
      aria-label={`${COLOR_NAMES[color]} player`}
      data-color={color}
      className={`flex min-w-0 flex-col gap-2 px-3 py-2 lg:h-full lg:gap-4 lg:px-4 lg:py-5 ${active ? 'bg-gold/10' : ''} transition-colors`}
    >
      <div className="flex items-center gap-2.5">
        <span className={`h-4 w-4 shrink-0 rounded-full border-2 ${color === 'w' ? 'border-[#B8975E] bg-[#F2E3C4]' : 'border-[#5C5560] bg-[#302C33]'}`} aria-hidden />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate font-semibold">
            {name}
            {tag ? <span className="ml-1.5 text-xs font-normal text-muted">{tag}</span> : null}
          </div>
          <div className="text-xs text-muted">{COLOR_NAMES[color]}{active ? ' · to move' : ''}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1" title={`Pharaoh surrounded on ${surrounded} of 6 sides`} aria-label={`Pharaoh surrounded on ${surrounded} of 6 sides`}>
          <span className="text-xs text-muted max-sm:hidden">Pharaoh</span>
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className={`h-2 w-2 rounded-full ${i < surrounded ? (surrounded >= 5 ? 'bg-terracotta' : 'bg-ink/70') : 'bg-line'}`} />
          ))}
        </div>
      </div>
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:grid lg:grid-cols-3 lg:overflow-visible">
        {bugs.map((bug) => {
          const n = hand[bug];
          const sel = selectedBug === bug;
          const dim = n === 0 || (forcedPharaoh && bug !== 'pharaoh');
          return (
            <button
              key={bug}
              type="button"
              data-bug={bug}
              disabled={!enabled || n === 0}
              onClick={() => onPick(bug)}
              aria-pressed={sel}
              aria-label={`${BUGS[bug].name}, ${n} left`}
              title={`${BUGS[bug].name} — ${BUGS[bug].short}`}
              className={`relative flex shrink-0 flex-col items-center rounded-2xl p-0.5 transition lg:w-full lg:py-1.5 ${sel ? '-translate-y-1 bg-gold/25 ring-2 ring-gold' : enabled && n ? 'hover:-translate-y-0.5 hover:bg-ink/5' : ''} ${dim ? 'opacity-30' : ''} ${forcedPharaoh && bug === 'pharaoh' && enabled ? 'animate-nudge' : ''} disabled:cursor-default`}
            >
              <PieceIcon bug={bug} color={color} size={iconSize} />
              <span className="absolute -right-0.5 bottom-0 grid lg:bottom-6 lg:right-2 h-5 min-w-5 place-items-center rounded-full bg-charcoal px-1 text-[11px] font-bold text-ivory ring-2 ring-paper">{n}</span>
              <span className="hidden text-center text-[11px] text-muted lg:block">{BUGS[bug].name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
