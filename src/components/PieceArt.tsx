import type { Bug, Color } from '@/engine';

/** Accent colour per creature (gold, lapis, turquoise, terracotta, ochre). */
export const ACCENT: Record<Bug, string> = {
  pharaoh: '#C9A24B',
  cat: '#B8643C',
  jerboa: '#C49A62',
  scorpion: '#A5432F',
  camel: '#C2893F',
  chameleon: '#6F8B4F',
  falcon: '#2F5D8C',
  ibis: '#3E8E86',
};

const LAPIS = '#2F5D8C';

export const TILE = {
  w: { face: '#F2E3C4', faceHi: '#FAF1DE', side: '#C4A672', edge: '#B8975E', ink: '#2B2620', soft: '#EADBB9' },
  b: { face: '#302C33', faceHi: '#3E3941', side: '#141216', edge: '#5C5560', ink: '#F3E6CC', soft: '#4A444E' },
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
  pharaoh: ({ ink, a, common, soft }) => (
    <>
      <path d="M50 9 C 31 9 24 21 24 35 L 13 80 L 36 74 L 38 57 L 62 57 L 64 74 L 87 80 L 76 35 C 76 21 69 9 50 9 Z" fill={a} {...common} />
      <path d="M22 50 L 36 48 M19 61 L 36 59 M16 71 L 36 68 M78 50 L 64 48 M81 61 L 64 59 M84 71 L 64 68" fill="none" stroke={LAPIS} strokeWidth={3.2} strokeLinecap="round" />
      <ellipse cx="50" cy="40" rx="13" ry="16" fill={soft} {...common} />
      <path d="M36 30 Q 50 24 64 30" fill="none" {...common} />
      <path d="M40 38 Q 44 35 48 38 L 38 40 M52 38 Q 56 35 60 38 L 62 40" fill="none" {...common} strokeWidth={2.4} />
      <path d="M46 47 Q 50 49 54 47" fill="none" {...common} strokeWidth={2.2} />
      <rect x="45.5" y="56" width="9" height="17" rx="3" fill={a} {...common} />
      <path d="M46 62 H 54 M46 67 H 54" stroke={LAPIS} strokeWidth={2} />
      <path d="M50 30 C 46 26 48 20 52 20 C 55 21 54 25 51 25" fill={LAPIS} stroke={ink} strokeWidth={2} strokeLinecap="round" />
    </>
  ),
  cat: ({ ink, a, common, soft }) => (
    <>
      <path d="M64 82 C 80 84 86 72 78 64" fill="none" {...common} strokeWidth={5} />
      <path d="M64 82 C 80 84 86 72 78 64" fill="none" stroke={a} strokeWidth={2} strokeLinecap="round" />
      <path d="M40 87 C 30 86 30 72 34 62 C 37 54 39 46 40 40 L 37 16 L 46 27 L 54 27 L 63 16 L 60 40 C 62 48 66 56 68 66 C 72 80 64 87 56 87 Z" fill={a} {...common} />
      <path d="M41 33 Q 45 30 48 34 Q 45 36 41 33 Z M52 34 Q 55 30 59 33 Q 55 36 52 34 Z" fill={soft} stroke={ink} strokeWidth={1.6} />
      <path d="M50 38 v3 M47 43 Q 50 45 53 43" fill="none" {...common} strokeWidth={2} />
      <path d="M40 48 Q 50 56 60 48" fill="none" stroke={LAPIS} strokeWidth={3.4} strokeLinecap="round" />
      <circle cx="50" cy="54" r="2.6" fill="#C9A24B" stroke={ink} strokeWidth={1.4} />
      <path d="M44 86 V 76 M56 86 V 76" fill="none" {...common} strokeWidth={2.2} />
    </>
  ),
  jerboa: ({ ink, a, common, soft }) => (
    <>
      <path d="M36 64 C 22 68 16 78 10 76" fill="none" {...common} />
      <path d="M10 76 c -6 -2 -6 -10 0 -10 c 4 0 6 6 0 10 z" fill={ink} />
      <path d="M30 86 H 56" fill="none" {...common} />
      <ellipse cx="44" cy="74" rx="11" ry="8" fill={a} {...common} />
      <ellipse cx="52" cy="58" rx="18" ry="15" fill={a} {...common} />
      <ellipse cx="60" cy="24" rx="5" ry="13" transform="rotate(-12 60 24)" fill={soft} {...common} />
      <ellipse cx="72" cy="26" rx="5" ry="13" transform="rotate(14 72 26)" fill={soft} {...common} />
      <circle cx="68" cy="42" r="12" fill={a} {...common} />
      <circle cx="72" cy="40" r="2.8" fill={ink} />
      <circle cx="79.5" cy="45" r="1.8" fill={ink} />
      <path d="M62 64 l 4 7 M56 66 l 2 7" fill="none" {...common} strokeWidth={2.2} />
      <ellipse cx="50" cy="62" rx="8" ry="6" fill={soft} />
    </>
  ),
  scorpion: ({ ink, a, common, soft }) => (
    <>
      <path d="M40 46 C 30 42 26 34 28 26 M60 46 C 70 42 74 34 72 26" fill="none" {...common} />
      <path d="M28 26 C 18 24 16 12 24 10 L 26 18 L 32 14 C 36 20 34 26 28 26 Z" fill={a} {...common} />
      <path d="M72 26 C 82 24 84 12 76 10 L 74 18 L 68 14 C 64 20 66 26 72 26 Z" fill={a} {...common} />
      <path d="M38 52 L 22 48 M38 58 L 20 60 M39 64 L 22 72 M62 52 L 78 48 M62 58 L 80 60 M61 64 L 78 72" fill="none" {...common} strokeWidth={2.6} />
      <ellipse cx="50" cy="54" rx="13" ry="16" fill={a} {...common} />
      <circle cx="50" cy="74" r="6" fill={a} {...common} />
      <circle cx="54" cy="84" r="5" fill={a} {...common} />
      <path d="M58 88 C 66 90 70 84 68 78" fill="none" {...common} />
      <path d="M68 78 l -4 -2 l 5 -4 z" fill={ink} />
      <path d="M44 48 H 56 M43 55 H 57 M44 62 H 56" stroke={soft} strokeWidth={2} strokeLinecap="round" />
      <circle cx="46" cy="42" r="1.8" fill={ink} /><circle cx="54" cy="42" r="1.8" fill={ink} />
    </>
  ),
  camel: ({ ink, a, common, soft }) => (
    <>
      <path d="M36 66 V 88 M44 66 V 88 M62 66 V 88 M70 66 V 88" fill="none" {...common} />
      <path d="M30 60 C 24 62 23 68 26 74" fill="none" {...common} strokeWidth={2.4} />
      <path d="M29 66 C 27 52 35 47 42 47 C 46 30 62 30 66 47 C 71 49 74 57 72 66 Z" fill={a} {...common} />
      <path d="M69 56 C 77 48 77 37 79 28 L 89 28 C 92 32 90 35 86 35 L 85 35 C 85 45 83 55 75 62" fill={a} {...common} />
      <circle cx="83.5" cy="30.5" r="1.9" fill={ink} />
      <path d="M44 47 C 48 40 60 40 64 47 L 62 55 L 46 55 Z" fill={soft} stroke={ink} strokeWidth={2} strokeLinejoin="round" />
      <path d="M46 51 H 62" stroke={LAPIS} strokeWidth={2.4} />
      <path d="M48 55 v 5 M54 55 v 6 M60 55 v 5" stroke="#C9A24B" strokeWidth={2} strokeLinecap="round" />
    </>
  ),
  chameleon: ({ ink, a, common, soft }) => (
    <>
      <path d="M36 62 C 22 64 16 78 26 82 C 34 85 37 75 31 72 C 28 71 27 74 29 75" fill="none" {...common} strokeWidth={5} />
      <path d="M36 62 C 22 64 16 78 26 82 C 34 85 37 75 31 72" fill="none" stroke={a} strokeWidth={2} strokeLinecap="round" />
      <path d="M44 66 l -5 14 l -4 0 M62 64 l 5 14 l 4 0" fill="none" {...common} strokeWidth={2.6} />
      <path d="M33 62 C 33 44 48 34 62 38 L 82 44 C 87 49 85 56 78 58 C 66 64 48 68 33 62 Z" fill={a} {...common} />
      <path d="M40 44 L 44 38 L 48 42 L 52 36 L 56 40 L 60 35" fill="none" {...common} strokeWidth={2.2} />
      <circle cx="70" cy="48" r="6.5" fill={soft} {...common} strokeWidth={2.4} />
      <circle cx="71" cy="48" r="2.4" fill={ink} />
      <circle cx="44" cy="54" r="2.4" fill={soft} /><circle cx="52" cy="58" r="2" fill={soft} /><circle cx="56" cy="50" r="2.2" fill={soft} />
    </>
  ),
  falcon: ({ ink, a, common, soft }) => (
    <>
      <path d="M50 44 C 36 32 20 28 7 34 C 15 40 22 46 27 54 C 36 52 43 52 50 56 Z" fill={a} {...common} />
      <path d="M50 44 C 64 32 80 28 93 34 C 85 40 78 46 73 54 C 64 52 57 52 50 56 Z" fill={a} {...common} />
      <path d="M16 36 L 24 46 M26 34 L 32 46 M36 36 L 40 48 M84 36 L 76 46 M74 34 L 68 46 M64 36 L 60 48" stroke={soft} strokeWidth={2} strokeLinecap="round" />
      <path d="M44 70 L 50 88 L 56 70 Z" fill={a} {...common} />
      <ellipse cx="50" cy="56" rx="9" ry="17" fill={a} {...common} />
      <path d="M45 50 Q 50 54 55 50 M45 58 Q 50 62 55 58" fill="none" stroke={soft} strokeWidth={1.8} />
      <circle cx="50" cy="30" r="9" fill={a} {...common} />
      <path d="M50 37 l -3 5 h 6 z" fill="#C9A24B" stroke={ink} strokeWidth={1.6} strokeLinejoin="round" />
      <path d="M44 28 h 4 M52 28 h 4 M45 30 l -2 5" fill="none" stroke={soft} strokeWidth={2} strokeLinecap="round" />
      <circle cx="46.5" cy="28" r="1.6" fill={ink} /><circle cx="53.5" cy="28" r="1.6" fill={ink} />
    </>
  ),
  ibis: ({ ink, a, common, soft }) => (
    <>
      <path d="M48 66 L 44 90 M56 66 L 60 90 M40 90 H 48 M56 90 H 64" fill="none" {...common} strokeWidth={2.6} />
      <path d="M28 62 C 32 48 48 44 62 48 C 70 52 70 62 60 66 C 50 70 36 70 28 62 Z" fill={soft} {...common} />
      <path d="M28 62 C 22 64 18 68 16 72 C 24 72 32 70 38 66" fill={ink} stroke={ink} strokeWidth={2} strokeLinejoin="round" />
      <path d="M36 58 C 44 54 54 54 60 58" fill="none" stroke={a} strokeWidth={4} strokeLinecap="round" />
      <path d="M64 50 C 72 38 70 28 64 22" fill="none" {...common} strokeWidth={6} />
      <path d="M64 50 C 72 38 70 28 64 22" fill="none" stroke={soft} strokeWidth={2.4} strokeLinecap="round" />
      <circle cx="63" cy="20" r="6.5" fill={ink} />
      <path d="M58 22 C 46 26 38 36 32 46" fill="none" stroke={ink} strokeWidth={3.4} strokeLinecap="round" />
      <circle cx="64.5" cy="18.5" r="1.6" fill={soft} />
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
