import type { Action, Bug, Color, GameState } from './types';
import { applyUnchecked, getLegalActions } from './game-state';
import { other } from './pieces';
import { neighbors, distance } from './coordinates';
import { articulationPoints } from './connectivity';
import { surroundCount } from './winner';
import { findPiece } from './board';

export type AiLevel = 'easy' | 'medium' | 'hard';

const VALUE: Record<Bug, number> = { turtle: 2, snail: 5, frog: 3, crab: 2, minnow: 6, newt: 5, dragonfly: 4, otter: 4 };
const WIN = 1_000_000;

function turtleHex(s: GameState, c: Color) {
  return findPiece(s.board, `${c}-turtle-1`)?.hex ?? null;
}

/** Static evaluation from `me`'s point of view. */
export function evaluate(s: GameState, me: Color): number {
  const opp = other(me);
  if (s.result) {
    if (s.result.winner === me) return WIN - s.ply;
    if (s.result.winner === opp) return -WIN + s.ply;
    return -50; // draws are mildly bad for whoever is searching
  }
  const mySur = surroundCount(s.board, me);
  const oppSur = surroundCount(s.board, opp);
  // Pressure grows sharply as a Turtle nears full surround.
  let score = 12 * oppSur * oppSur - 14 * mySur * mySur;

  const pinned = articulationPoints(s.board);
  const myT = turtleHex(s, me);
  const oppT = turtleHex(s, opp);
  for (const [h, st] of s.board) {
    const top = st[st.length - 1];
    const free = st.length > 1 || !pinned.has(h);
    const sign = top.color === me ? 1 : -1;
    if (free) score += sign * VALUE[top.bug];
    // Pieces sitting next to the enemy Turtle are useful; Snails on top of it are excellent.
    const enemyT = top.color === me ? oppT : myT;
    if (enemyT) {
      if (h === enemyT && top.bug !== 'turtle') score += sign * 25;
      else if (distance(h, enemyT) === 1) score += sign * 3;
    }
    // A covered Turtle can't escape.
    if (st.length > 1 && st.some((p) => p.bug === 'turtle' && p.color !== top.color)) score += sign * 10;
  }
  // Keep an escape square around our own Turtle.
  if (myT && mySur < 6) {
    const freeAround = neighbors(myT).filter((n) => !s.board.has(n)).length;
    score += freeAround;
  }
  return score;
}

/** Cheap move-ordering hint: actions near the enemy Turtle first. */
function orderActions(s: GameState, actions: Action[]): Action[] {
  const oppT = turtleHex(s, other(s.turn));
  if (!oppT) return actions;
  const prio = (a: Action) => (a.type === 'pass' ? 99 : distance(a.to, oppT));
  return [...actions].sort((x, y) => prio(x) - prio(y));
}

function negamax(s: GameState, depth: number, alpha: number, beta: number, deadline: number): number {
  if (s.result || depth === 0 || Date.now() > deadline) return evaluate(s, s.turn);
  let best = -Infinity;
  for (const a of orderActions(s, getLegalActions(s))) {
    const v = -negamax(applyUnchecked(s, a), depth - 1, -beta, -alpha, deadline);
    if (v > best) best = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  return best;
}

function immediateWin(s: GameState, actions: Action[]): Action | null {
  for (const a of actions) if (applyUnchecked(s, a).result?.winner === s.turn) return a;
  return null;
}

/** Does `a` hand the opponent a winning reply (or lose outright)? */
function blunders(s: GameState, a: Action): boolean {
  const next = applyUnchecked(s, a);
  if (next.result) return next.result.winner !== s.turn;
  return getLegalActions(next).some((r) => applyUnchecked(next, r).result?.winner === next.turn);
}

export function chooseAction(s: GameState, level: AiLevel = 'medium', opts: { timeMs?: number; random?: () => number } = {}): Action {
  const rand = opts.random ?? Math.random;
  const actions = getLegalActions(s);
  if (actions.length <= 1) return actions[0];
  const win = immediateWin(s, actions);
  if (win) return win;

  if (level === 'easy') {
    const shuffled = [...actions].sort(() => rand() - 0.5);
    return shuffled.slice(0, 40).find((a) => !blunders(s, a)) ?? shuffled[0];
  }

  const me = s.turn;
  if (level === 'medium') {
    // One-ply evaluation, avoiding moves that let the opponent win immediately.
    let best: Action = actions[0];
    let bestScore = -Infinity;
    for (const a of actions) {
      const next = applyUnchecked(s, a);
      let v = evaluate(next, me) + rand() * 6;
      if (!next.result && getLegalActions(next).some((r) => applyUnchecked(next, r).result?.winner === other(me))) v -= WIN / 2;
      if (v > bestScore) { bestScore = v; best = a; }
    }
    return best;
  }

  // Hard: iterative-deepening alpha-beta within a time budget.
  const deadline = Date.now() + (opts.timeMs ?? 2500);
  let ordered = orderActions(s, actions);
  let best = ordered[0];
  for (let depth = 1; depth <= 4; depth++) {
    let alpha = -Infinity;
    let depthBest = ordered[0];
    const scores = new Map<Action, number>();
    let complete = true;
    for (const a of ordered) {
      const v = -negamax(applyUnchecked(s, a), depth - 1, -Infinity, -alpha, deadline) + rand() * 0.5;
      scores.set(a, v);
      if (v > alpha) { alpha = v; depthBest = a; }
      if (Date.now() > deadline) { complete = false; break; }
    }
    if (complete || depth === 1) best = depthBest;
    if (!complete || alpha >= WIN / 2) break;
    ordered = [...ordered].sort((x, y) => (scores.get(y) ?? -Infinity) - (scores.get(x) ?? -Infinity));
  }
  return best;
}
