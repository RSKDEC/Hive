import { EventEmitter } from 'node:events';
import { supabaseEnv } from './config';

export interface UpdateEvent {
  revision: number;
}

/** Topic name shared by server broadcasts and client subscriptions. */
export const topicFor = (gameId: string) => `game-${gameId}`;

const g = globalThis as unknown as { __oasisBus?: EventEmitter };
export const memoryBus: EventEmitter = g.__oasisBus ?? (g.__oasisBus = new EventEmitter().setMaxListeners(0));

/**
 * Tells connected clients that a game changed. Clients then fetch the authoritative state,
 * so a lost notification only delays an update (they also poll as a fallback).
 */
export async function publishUpdate(gameId: string, ev: UpdateEvent): Promise<void> {
  memoryBus.emit(topicFor(gameId), ev);
  const env = supabaseEnv();
  if (!env) return;
  try {
    await fetch(`${env.url}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: env.serviceKey, Authorization: `Bearer ${env.serviceKey}` },
      body: JSON.stringify({ messages: [{ topic: topicFor(gameId), event: 'update', payload: ev }] }),
      signal: AbortSignal.timeout(4000),
    });
  } catch (e) {
    console.warn('realtime broadcast failed', e);
  }
}
