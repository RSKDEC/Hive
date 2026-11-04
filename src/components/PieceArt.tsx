import type { Bug, Color } from '@/engine';

/** Accent colour per creature (muted gold / green / terracotta family). */
export const ACCENT: Record<Bug, string> = {
  turtle: '#C9A24B',
  snail: '#C0643F',
  frog: '#6F8B4F',
  crab: '#B4533A',
  minnow: '#5B8A90',
  newt: '#D08A3C',
  dragonfly: '#4F8378',
  otter: '#8C6A4B',
};

export const TILE = {
  w: { face: '#F4ECDD', faceHi: '#FBF6EC', side: '#C9B898', edge: '#B9A57F', ink: '#2B2825', soft: '#E6DBC6' },
  b: { face: '#34302C', faceHi: '#423D38', side: '#151311', edge: '#5A534B', ink: '#F1E9DA', soft: '#4A443E' },
} as const;

/**
 * Original creature illustrations in a 100×100 box, centred on (50,50).
 * `ink` is the line colour (dark on light tiles, light on dark tiles).
 */
export function PieceArt({ bug, color, size = 100 }: { bug: Bug; color: Color; size?: number }) {
  const ink = TILE[color].ink;
  const soft = TILE[color].soft;
  const a = ACCENT[bug];
  const sw = 3.2;
  const common = { stroke: ink, strokeWidth: sw, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  const s = size / 100;
  return (
    <g transform={`scale(${s}) translate(-50 -50)`}>
      {ART[bug]({ ink, soft, a, common })}
    </g>
  );
}

type ArtProps = { ink: string; soft: string; a: string; common: Record<string, unknown> };

const ART: Record<Bug, (p: ArtProps) => React.ReactNode> = {
  turtle: ({ ink, a, common, soft }) => (
    <>
      <ellipse cx="29" cy="34" rx="9" ry="6" transform="rotate(-35 29 34)" fill={soft} {...common} />
      <ellipse cx="71" cy="34" rx="9" ry="6" transform="rotate(35 71 34)" fill={soft} {...common} />
      <ellipse cx="31" cy="72" rx="8" ry="5.5" transform="rotate(35 31 72)" fill={soft} {...common} />
      <ellipse cx="69" cy="72" rx="8" ry="5.5" transform="rotate(-35 69 72)" fill={soft} {...common} />
      <path d="M50 82 l-4 8 h8 z" fill={soft} {...common} />
      <circle cx="50" cy="19" r="8.5" fill={soft} {...common} />
      <circle cx="46.5" cy="17" r="1.6" fill={ink} />
      <circle cx="53.5" cy="17" r="1.6" fill={ink} />
      <ellipse cx="50" cy="53" rx="23" ry="27" fill={a} {...common} />
      <path d="M50 41 l9 5 v11 l-9 5 l-9 -5 v-11 z" fill="none" {...common} />
      <path d="M50 26 v15 M59 46 l12 -6 M59 57 l12 6 M50 62 v17 M41 57 l-12 6 M41 46 l-12 -6" fill="none" {...common} strokeWidth={2.4} />
    </>
  ),
  snail: ({ ink, a, common, soft }) => (
    <>
      <path d="M14 74 C 22 66, 30 70, 40 70 L 80 70 C 88 70, 90 78, 84 80 L 22 80 C 16 80, 12 78, 14 74 Z" fill={soft} {...common} />
      <path d="M22 72 L 16 50 M27 71 L 26 48" fill="none" {...common} />
      <circle cx="16" cy="48" r="3" fill={ink} />
      <circle cx="26" cy="46" r="3" fill={ink} />
      <circle cx="58" cy="48" r="24" fill={a} {...common} />
      <path d="M58 48 m0 -4 a4 4 0 1 1 -4 4 a8 8 0 0 1 8 -8 a12 12 0 0 1 12 12 a16 16 0 0 1 -16 16 a20 20 0 0 1 -20 -20" fill="none" {...common} />
    </>
  ),
  frog: ({ ink, a, common, soft }) => (
    <>
      <path d="M28 58 C 12 60, 10 78, 22 84 L 32 80 M72 58 C 88 60, 90 78, 78 84 L 68 80" fill="none" {...common} />
      <path d="M32 40 L 18 34 M68 40 L 82 34" fill="none" {...common} />
      <ellipse cx="50" cy="56" rx="24" ry="26" fill={a} {...common} />
      <circle cx="38" cy="30" r="9" fill={soft} {...common} />
      <circle cx="62" cy="30" r="9" fill={soft} {...common} />
      <circle cx="38" cy="30" r="3.6" fill={ink} />
      <circle cx="62" cy="30" r="3.6" fill={ink} />
      <path d="M40 46 Q 50 52 60 46" fill="none" {...common} />
      <circle cx="44" cy="64" r="3" fill={soft} />
      <circle cx="56" cy="70" r="2.4" fill={soft} />
      <circle cx="52" cy="60" r="2" fill={soft} />
    </>
  ),
  crab: ({ ink, a, common, soft }) => (
    <>
      <path d="M28 62 L 12 70 M28 68 L 14 80 M72 62 L 88 70 M72 68 L 86 80" fill="none" {...common} />
      <path d="M32 50 L 22 34 M68 50 L 78 34" fill="none" {...common} />
      <path d="M22 34 C 10 30, 12 14, 24 16 L 22 26 L 30 22 C 32 30, 28 34, 22 34 Z" fill={a} {...common} />
      <path d="M78 34 C 90 30, 88 14, 76 16 L 78 26 L 70 22 C 68 30, 72 34, 78 34 Z" fill={a} {...common} />
      <ellipse cx="50" cy="60" rx="25" ry="18" fill={a} {...common} />
      <path d="M44 44 V 36 M56 44 V 36" fill="none" {...common} />
      <circle cx="44" cy="34" r="3.4" fill={soft} {...common} strokeWidth={2} />
      <circle cx="56" cy="34" r="3.4" fill={soft} {...common} strokeWidth={2} />
      <path d="M40 64 Q 50 70 60 64" fill="none" {...common} strokeWidth={2.4} />
      <circle cx="50" cy="56" r="0.1" fill={ink} />
    </>
  ),
  minnow: ({ ink, a, common, soft }) => (
    <>
      <path d="M72 50 L 90 34 L 88 66 Z" fill={soft} {...common} />
      <path d="M12 50 C 22 30, 52 26, 74 50 C 52 74, 22 70, 12 50 Z" fill={a} {...common} />
      <path d="M44 34 C 50 26, 58 28, 60 38" fill={soft} {...common} />
      <path d="M38 64 C 42 70, 48 70, 50 66" fill={soft} {...common} />
      <path d="M32 40 C 36 46, 36 54, 32 60" fill="none" {...common} />
      <circle cx="23" cy="47" r="3" fill={ink} />
      <path d="M40 50 H 64" fill="none" {...common} strokeWidth={2} strokeDasharray="4 4" />
    </>
  ),
  newt: ({ ink, a, common, soft }) => (
    <>
      <path d="M50 66 C 50 80, 64 84, 70 92" fill="none" {...common} strokeWidth={6} stroke={ink} />
      <path d="M50 66 C 50 80, 64 84, 70 92" fill="none" stroke={a} strokeWidth={2.6} strokeLinecap="round" />
      <path d="M40 38 L 26 30 M60 38 L 74 30 M40 60 L 26 70 M60 60 L 74 70" fill="none" {...common} />
      <path d="M26 30 l-4 -3 M26 30 l-3 3 M74 30 l4 -3 M74 30 l3 3 M26 70 l-4 3 M26 70 l-2 -4 M74 70 l4 3 M74 70 l2 -4" fill="none" {...common} strokeWidth={2} />
      <ellipse cx="50" cy="50" rx="12" ry="21" fill={a} {...common} />
      <ellipse cx="50" cy="22" rx="11" ry="10" fill={a} {...common} />
      <circle cx="45" cy="19" r="2.2" fill={ink} />
      <circle cx="55" cy="19" r="2.2" fill={ink} />
      <circle cx="47" cy="44" r="2.4" fill={soft} />
      <circle cx="53" cy="54" r="2.4" fill={soft} />
      <circle cx="48" cy="62" r="1.8" fill={soft} />
    </>
  ),
  dragonfly: ({ ink, a, common, soft }) => (
    <>
      <ellipse cx="30" cy="34" rx="22" ry="8" transform="rotate(-12 30 34)" fill={soft} {...common} strokeWidth={2.4} />
      <ellipse cx="70" cy="34" rx="22" ry="8" transform="rotate(12 70 34)" fill={soft} {...common} strokeWidth={2.4} />
      <ellipse cx="31" cy="50" rx="19" ry="7" transform="rotate(14 31 50)" fill={soft} {...common} strokeWidth={2.4} />
      <ellipse cx="69" cy="50" rx="19" ry="7" transform="rotate(-14 69 50)" fill={soft} {...common} strokeWidth={2.4} />
      <path d="M50 46 V 90" fill="none" stroke={ink} strokeWidth={8} strokeLinecap="round" />
      <path d="M50 46 V 90" fill="none" stroke={a} strokeWidth={3.6} strokeLinecap="round" />
      <ellipse cx="50" cy="38" rx="6.5" ry="10" fill={a} {...common} />
      <circle cx="50" cy="22" r="7.5" fill={a} {...common} />
      <circle cx="46" cy="20" r="2.6" fill={ink} />
      <circle cx="54" cy="20" r="2.6" fill={ink} />
    </>
  ),
  otter: ({ ink, a, common, soft }) => (
    <>
      <circle cx="28" cy="30" r="8" fill={a} {...common} />
      <circle cx="72" cy="30" r="8" fill={a} {...common} />
      <ellipse cx="50" cy="52" rx="30" ry="28" fill={a} {...common} />
      <ellipse cx="50" cy="64" rx="17" ry="12" fill={soft} {...common} />
      <circle cx="39" cy="46" r="3.6" fill={ink} />
      <circle cx="61" cy="46" r="3.6" fill={ink} />
      <ellipse cx="50" cy="58" rx="5.5" ry="4" fill={ink} />
      <path d="M50 62 V 67 M44 70 Q 50 74 56 70" fill="none" {...common} strokeWidth={2.4} />
      <path d="M36 62 L 18 58 M36 66 L 18 68 M64 62 L 82 58 M64 66 L 82 68" fill="none" {...common} strokeWidth={1.8} />
    </>
  ),
};

/** A standalone square SVG of a creature on its tile, for trays, guides and icons. */
export function PieceIcon({ bug, color, size = 48, title }: { bug: Bug; color: Color; size?: number; title?: string }) {
  const t = TILE[color];
  const pts = hexPoints(46);
  return (
    <svg viewBox="-55 -55 110 116" width={size} height={size * 1.05} role="img" aria-label={title}>
      {title ? <title>{title}</title> : null}
      <polygon points={pts} transform="translate(0 6)" fill={t.side} />
      <polygon points={pts} fill={t.face} stroke={t.edge} strokeWidth={2.5} strokeLinejoin="round" />
      {color === 'b' ? <polygon points={hexPoints(39)} fill="none" stroke={t.edge} strokeWidth={1.5} /> : null}
      <PieceArt bug={bug} color={color} size={62} />
    </svg>
  );
}

/** Pointy-top hexagon points with radius r. */
export function hexPoints(r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const ang = (Math.PI / 180) * (60 * i - 90);
    return `${(r * Math.cos(ang)).toFixed(2)},${(r * Math.sin(ang)).toFixed(2)}`;
  }).join(' ');
}
