import { handle, secretFrom, service } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handle(() => service().view(id, secretFrom(req)));
}
