import { NextResponse } from 'next/server';
import { getStore } from './config';
import { GameService } from './game-service';
import { SECRET_HEADER } from './identity';
import { ServiceError } from './types';

export function service(): GameService {
  const store = getStore();
  if (!store) throw new ServiceError(503, 'Online play is not configured on this server. See README → Supabase setup.');
  return new GameService(store);
}

export const secretFrom = (req: Request) => req.headers.get(SECRET_HEADER);

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const text = await req.text();
    if (text.length > 20_000) throw new Error('too large');
    const v = text ? JSON.parse(text) : {};
    return v && typeof v === 'object' ? v : {};
  } catch {
    throw new ServiceError(400, 'Invalid request body.');
  }
}

export async function handle(fn: () => Promise<unknown>): Promise<NextResponse> {
  try {
    return NextResponse.json(await fn(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    if (e instanceof ServiceError) {
      return NextResponse.json({ error: e.message, game: e.view ?? null }, { status: e.status, headers: { 'Cache-Control': 'no-store' } });
    }
    console.error(e);
    return NextResponse.json({ error: 'Something went wrong on the server.' }, { status: 500 });
  }
}
