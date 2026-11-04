'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { allPieces, hex, neighbors, toPixel, type GameState, type Hex, type Piece, BUGS, COLOR_NAMES } from '@/engine';
import { PieceArt, TILE, hexPoints } from './PieceArt';

export const R = 50; // hex radius in board units
const LEVEL_DY = -9; // vertical offset per stack level

export interface BoardProps {
  state: GameState;
  selected?: Hex | null;
  targets?: Hex[];
  liftSources?: Hex[];
  liftFrom?: Hex | null;
  lastMove?: { from?: Hex; to: Hex } | null;
  onTap?: (h: Hex) => void;
  /** Change to trigger a re-fit of the view (e.g. after each move). */
  fitKey?: unknown;
  recenter?: number;
  large?: boolean;
  animate?: boolean;
  interactive?: boolean;
  className?: string;
  label?: string;
  /** Fit exactly these cells instead of the oasis plus a one-cell margin (used by demos). */
  frame?: Hex[];
}

interface View { x: number; y: number; k: number }

function pixelToHex(px: number, py: number): Hex {
  const q = ((Math.sqrt(3) / 3) * px - py / 3) / R;
  const r = ((2 / 3) * py) / R;
  let rq = Math.round(q), rr = Math.round(r);
  const rs = Math.round(-q - r);
  const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - (-q - r));
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return hex(rq, rr);
}

export function Board({
  state, selected, targets = [], liftSources = [], liftFrom, lastMove, onTap, fitKey, recenter, large, animate = true,
  interactive = true, className, label = 'Game board', frame,
}: BoardProps) {
  const uid = useId().replace(/:/g, '');
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const viewRef = useRef(view);
  viewRef.current = view;

  // Track element size.
  useLayoutEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const fit = useCallback(() => {
    if (!size.w || !size.h) return;
    const cells = new Set<Hex>(frame ?? []);
    if (!frame) for (const k of state.board.keys()) { cells.add(k); for (const n of neighbors(k)) cells.add(n); }
    for (const t of targets) cells.add(t);
    if (!cells.size) { cells.add('0,0'); for (const n of neighbors('0,0')) cells.add(n); }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const c of cells) {
      const [x, y] = toPixel(c, R);
      minX = Math.min(minX, x - R); maxX = Math.max(maxX, x + R);
      minY = Math.min(minY, y - R * 1.2); maxY = Math.max(maxY, y + R * 1.1);
    }
    const pad = 16;
    const maxK = frame ? 0.9 : large ? 1.35 : 1.05;
    const k = Math.max(0.2, Math.min(maxK, (size.w - pad * 2) / (maxX - minX), (size.h - pad * 2) / (maxY - minY)));
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    setView({ k, x: size.w / 2 - cx * k, y: size.h / 2 - cy * k });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w, size.h, state.board, large, targets.length]);

  // Re-fit when the game advances, the container resizes, or on request.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fit(); }, [size.w, size.h, fitKey, recenter, large]);

  // --- Pointer handling: tap, drag-pan, pinch-zoom, wheel-zoom, double-tap recentre -------------
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ startX: number; startY: number; moved: boolean; t: number; pinchDist?: number } | null>(null);
  const lastTap = useRef(0);

  const local = (e: { clientX: number; clientY: number }) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const zoomAt = (px: number, py: number, factor: number) => {
    setView((v) => {
      const k = Math.max(0.2, Math.min(3, v.k * factor));
      const f = k / v.k;
      return { k, x: px - (px - v.x) * f, y: py - (py - v.y) * f };
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    svgRef.current?.setPointerCapture(e.pointerId);
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 1) gesture.current = { startX: p.x, startY: p.y, moved: false, t: Date.now() };
    else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { ...(gesture.current ?? { startX: p.x, startY: p.y, t: Date.now() }), moved: true, pinchDist: Math.hypot(a.x - b.x, a.y - b.y) };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev || !gesture.current) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    const g = gesture.current;
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (g.pinchDist) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / g.pinchDist);
      g.pinchDist = d;
      const dx = (p.x - prev.x) / 2, dy = (p.y - prev.y) / 2;
      setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
      return;
    }
    if (!g.moved && Math.hypot(p.x - g.startX, p.y - g.startY) > 8) g.moved = true;
    if (g.moved) setView((v) => ({ ...v, x: v.x + p.x - prev.x, y: v.y + p.y - prev.y }));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const had = pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (!had || !g) return;
    if (pointers.current.size === 0) {
      gesture.current = null;
      if (!g.moved && Date.now() - g.t < 700) {
        const p = local(e);
        const v = viewRef.current;
        const h = hitTest((p.x - v.x) / v.k, (p.y - v.y) / v.k);
        const now = Date.now();
        if (!state.board.has(h) && !targets.includes(h) && now - lastTap.current < 320) { fit(); lastTap.current = 0; return; }
        lastTap.current = now;
        if (interactive) onTap?.(h);
      }
    }
  };

  // Stacks are drawn shifted up; prefer the stack whose drawn top contains the point.
  const hitTest = (bx: number, by: number): Hex => {
    for (let lvl = 4; lvl >= 1; lvl--) {
      const h = pixelToHex(bx, by - LEVEL_DY * lvl);
      if ((state.board.get(h)?.length ?? 0) > lvl) return h;
    }
    return pixelToHex(bx, by);
  };

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const pieces = useMemo(() => {
    const list = allPieces(state.board);
    return list
      .map((p) => {
        const [x, y] = toPixel(p.hex, R);
        const height = state.board.get(p.hex)!.length;
        return { ...p, x, y: y + p.level * LEVEL_DY, top: p.level === height - 1, height };
      })
      .sort((a, b) => a.y - a.level * LEVEL_DY - (b.y - b.level * LEVEL_DY) || a.level - b.level);
  }, [state.board]);

  const stackTopY = (h: Hex) => {
    const [x, y] = toPixel(h, R);
    return [x, y + (state.board.get(h)?.length ?? 0) * LEVEL_DY] as const;
  };

  const face = hexPoints(R - 3);
  return (
    <svg
      ref={svgRef}
      className={`block h-full w-full touch-none select-none ${className ?? ''}`}
      role="application"
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={(e) => { pointers.current.delete(e.pointerId); gesture.current = null; }}
    >
      <defs>
        {(['w', 'b'] as const).map((c) => (
          <linearGradient key={c} id={`${uid}-face-${c}`} x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0" stopColor={TILE[c].faceHi} />
            <stop offset="1" stopColor={TILE[c].face} />
          </linearGradient>
        ))}
        <filter id={`${uid}-shadow`} x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#3a2c1a" floodOpacity="0.28" />
        </filter>
      </defs>
      <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
        {lastMove?.from && !state.board.has(lastMove.from) ? (
          <polygon points={face} transform={`translate(${toPixel(lastMove.from, R).join(' ')})`} className="fill-none stroke-ink/30" strokeWidth={3} strokeDasharray="6 7" />
        ) : null}
        {pieces.map((p) => (
          <Tile
            key={p.id}
            piece={p}
            x={p.x}
            y={p.y}
            covered={!p.top}
            height={p.top ? p.height : 1}
            selected={p.top && selected === p.hex}
            lifting={p.top && liftFrom === p.hex}
            last={p.top && lastMove?.to === p.hex}
            uid={uid}
            animate={animate}
          />
        ))}
        {liftSources.map((h) => {
          const [x, y] = stackTopY(h);
          return (
            <g key={`lift-${h}`} transform={`translate(${x} ${y})`} data-lift={h} pointerEvents="none">
              <polygon points={hexPoints(R - 6)} fill="rgba(62,142,134,0.2)" stroke="#3E8E86" strokeWidth={4} strokeDasharray="2 7" strokeLinecap="round" />
              <circle cx={R * 0.62} cy={-R * 0.55} r={10} fill="#3E8E86" />
              <path d={`M${R * 0.62} ${-R * 0.55 + 5} v-9 m-4 4 l4 -4 l4 4`} stroke="#fff" strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
        })}
        {targets.map((h) => {
          const [x, y] = stackTopY(h);
          return (
            <g key={`t-${h}`} transform={`translate(${x} ${y})`} data-target={h} className="target">
              <polygon points={hexPoints(R - 5)} className="target-hex" />
              <circle r={7} className="target-dot" />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

interface TileProps {
  piece: Piece & { hex: Hex; level: number };
  x: number;
  y: number;
  covered: boolean;
  height: number;
  selected: boolean;
  lifting: boolean;
  last: boolean;
  uid: string;
  animate: boolean;
}

function Tile({ piece, x, y, covered, height, selected, lifting, last, uid, animate }: TileProps) {
  const ref = useRef<SVGGElement>(null);
  const prev = useRef<{ x: number; y: number } | null>(null);
  const t = TILE[piece.color];

  // FLIP animation: glide from the previous position (and pop in when newly placed).
  useLayoutEffect(() => {
    const el = ref.current;
    const from = prev.current;
    prev.current = { x, y };
    if (!el || !animate || typeof el.animate !== 'function') return;
    if (!from) {
      el.animate([{ opacity: 0, transform: `translate(${x}px, ${y - 30}px) scale(1.15)` }, { opacity: 1, transform: `translate(${x}px, ${y}px) scale(1)` }], { duration: 320, easing: 'cubic-bezier(.2,.8,.3,1.1)' });
    } else if (from.x !== x || from.y !== y) {
      const mx = (from.x + x) / 2, my = Math.min(from.y, y) - 40;
      el.animate(
        [
          { transform: `translate(${from.x}px, ${from.y}px)` },
          { transform: `translate(${mx}px, ${my}px) scale(1.08)`, offset: 0.5 },
          { transform: `translate(${x}px, ${y}px)` },
        ],
        { duration: 420, easing: 'ease-in-out' },
      );
    }
  }, [x, y, animate]);

  const pts = hexPoints(R - 3);
  return (
    <g
      ref={ref}
      style={{ transform: `translate(${x}px, ${y}px)` }}
      data-piece={piece.id}
      data-hex={piece.hex}
      aria-label={`${COLOR_NAMES[piece.color]} ${BUGS[piece.bug].name}`}
      className={covered ? 'opacity-95' : undefined}
    >
      <g filter={covered ? undefined : `url(#${uid}-shadow)`}>
        <polygon points={pts} transform="translate(0 7)" fill={t.side} />
        <polygon points={pts} fill={`url(#${uid}-face-${piece.color})`} stroke={selected ? '#C9A24B' : lifting ? '#3E8E86' : t.edge} strokeWidth={selected || lifting ? 6 : 2.5} strokeLinejoin="round" />
      </g>
      {piece.color === 'b' ? <polygon points={hexPoints(R - 10)} fill="none" stroke={t.edge} strokeWidth={1.6} pointerEvents="none" /> : (
        <polygon points={hexPoints(R - 9)} fill="none" stroke="#fff" strokeOpacity={0.6} strokeWidth={1.4} pointerEvents="none" />
      )}
      {!covered ? <PieceArt bug={piece.bug} color={piece.color} size={R * 1.25} /> : null}
      {last && !selected ? <polygon points={hexPoints(R - 3)} fill="none" stroke="#C9A24B" strokeOpacity={0.75} strokeWidth={3} strokeDasharray="10 6" pointerEvents="none" /> : null}
      {height > 1 ? (
        <g transform={`translate(${R * 0.6} ${-R * 0.58})`} pointerEvents="none">
          <circle r={11} fill="#2B2825" stroke="#F2E3C4" strokeWidth={2} />
          <text textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700} fill="#F2E3C4">{height}</text>
        </g>
      ) : null}
    </g>
  );
}
