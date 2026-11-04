'use client';

import type { Action, GameConfig } from '@/engine';
import type { ActRequest, GameView } from '@/server/types';
import { getSecret } from './client-identity';

export interface ApiResult {
  ok: boolean;
  status: number;
  game: GameView | null;
  error?: string;
}

async function call(path: string, init: RequestInit = {}): Promise<ApiResult> {
  try {
    const res = await fetch(path, {
      ...init,
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'x-player-secret': getSecret(), ...(init.headers ?? {}) },
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, status: res.status, game: body as GameView };
    return { ok: false, status: res.status, game: body.game ?? null, error: body.error ?? `Error ${res.status}` };
  } catch {
    return { ok: false, status: 0, game: null, error: 'No connection — retrying…' };
  }
}

export const api = {
  health: async (): Promise<{ online: boolean; store: string | null }> => {
    try { return await (await fetch('/api/health', { cache: 'no-store' })).json(); } catch { return { online: false, store: null }; }
  },
  create: (nickname: string, config: GameConfig, color: 'w' | 'b' | 'random') =>
    call('/api/games', { method: 'POST', body: JSON.stringify({ nickname, config, color }) }),
  get: (id: string) => call(`/api/games/${encodeURIComponent(id)}`),
  join: (id: string, nickname: string) => call(`/api/games/${encodeURIComponent(id)}/join`, { method: 'POST', body: JSON.stringify({ nickname }) }),
  act: (id: string, req: ActRequest) => call(`/api/games/${encodeURIComponent(id)}/act`, { method: 'POST', body: JSON.stringify(req) }),
  move: (id: string, revision: number, action: Action) => api.act(id, { kind: 'action', revision, action }),
};
