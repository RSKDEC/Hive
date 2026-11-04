import { MemoryStore } from './memory-store';
import { SupabaseStore } from './supabase-store';
import type { GameStore } from './types';

export function supabaseEnv(): { url: string; serviceKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && serviceKey ? { url: url.replace(/\/$/, ''), serviceKey } : null;
}

/** The in-memory store is only safe on a single long-running server (dev, tests, a home machine). */
export function memoryAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_MEMORY_STORE === '1';
}

const g = globalThis as unknown as { __pondlifeStore?: GameStore | null };

export function getStore(): GameStore | null {
  if (g.__pondlifeStore !== undefined) return g.__pondlifeStore;
  const env = supabaseEnv();
  g.__pondlifeStore = env ? new SupabaseStore(env.url, env.serviceKey) : memoryAllowed() ? new MemoryStore() : null;
  return g.__pondlifeStore;
}

/** For tests. */
export function setStore(store: GameStore | null) {
  g.__pondlifeStore = store;
}
