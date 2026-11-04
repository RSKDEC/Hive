import { getStore } from '@/server/config';
import { memoryBus, topicFor, type UpdateEvent } from '@/server/realtime';

export const dynamic = 'force-dynamic';

/**
 * Server-sent events for the in-memory store (local/self-hosted mode).
 * With Supabase configured, clients use Supabase Realtime instead.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (getStore()?.kind !== 'memory' || !/^[A-Za-z0-9]{6,32}$/.test(id)) return new Response('Not available', { status: 404 });
  const topic = topicFor(id);
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const send = (ev: UpdateEvent) => controller.enqueue(enc.encode(`data: ${JSON.stringify(ev)}\n\n`));
      const ping = setInterval(() => controller.enqueue(enc.encode(': ping\n\n')), 20000);
      memoryBus.on(topic, send);
      cleanup = () => { clearInterval(ping); memoryBus.off(topic, send); };
      req.signal.addEventListener('abort', () => { cleanup(); try { controller.close(); } catch {} });
      controller.enqueue(enc.encode(': connected\n\n'));
    },
    cancel() { cleanup(); },
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' } });
}
