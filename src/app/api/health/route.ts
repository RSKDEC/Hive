import { NextResponse } from 'next/server';
import { getStore } from '@/server/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const store = getStore();
  return NextResponse.json({ online: !!store, store: store?.kind ?? null });
}
