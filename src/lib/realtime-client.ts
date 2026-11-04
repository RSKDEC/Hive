'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null | undefined;

function supabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return client;
}

/**
 * Calls `onUpdate` whenever the server announces a change to this game, and `onStatus`
 * with the live-connection state. Returns an unsubscribe function.
 * Uses Supabase Realtime when configured, otherwise server-sent events from the Next.js server.
 */
export function subscribeToGame(
  gameId: string,
  onUpdate: (revision: number) => void,
  onStatus: (live: boolean) => void,
): () => void {
  const sb = supabase();
  if (sb) {
    const channel = sb
      .channel(`game-${gameId}`)
      .on('broadcast', { event: 'update' }, (msg) => onUpdate(Number(msg.payload?.revision ?? 0)))
      .subscribe((status) => onStatus(status === 'SUBSCRIBED'));
    return () => { sb.removeChannel(channel); };
  }
  let es: EventSource | null = null;
  let closed = false;
  let retry: ReturnType<typeof setTimeout> | undefined;
  const open = () => {
    if (closed) return;
    es = new EventSource(`/api/games/${encodeURIComponent(gameId)}/events`);
    es.onopen = () => onStatus(true);
    es.onmessage = (e) => { try { onUpdate(Number(JSON.parse(e.data).revision ?? 0)); } catch { /* ignore */ } };
    es.onerror = () => {
      onStatus(false);
      es?.close();
      retry = setTimeout(open, 3000);
    };
  };
  open();
  return () => { closed = true; clearTimeout(retry); es?.close(); };
}
