import { handle, readJson, secretFrom, service } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return handle(async () => {
    const body = await readJson(req);
    return service().create({ nickname: body.nickname, config: body.config, color: body.color, secret: secretFrom(req) });
  });
}
