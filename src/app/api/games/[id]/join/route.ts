import { handle, readJson, secretFrom, service } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handle(async () => {
    const body = await readJson(req);
    return service().join(id, { nickname: body.nickname, secret: secretFrom(req) });
  });
}
