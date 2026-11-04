import { handle, readJson, secretFrom, service } from '@/server/http';
import type { ActRequest } from '@/server/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handle(async () => {
    const body = (await readJson(req)) as unknown as ActRequest;
    return service().act(id, secretFrom(req), body);
  });
}
