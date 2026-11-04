import { deserialize, type SerializedGame } from '@/engine';
import { chooseAction, type AiLevel } from '@/engine/ai';

// Runs the computer opponent off the main thread so the board stays responsive.
const ctx = self as unknown as { onmessage: ((e: MessageEvent) => void) | null; postMessage: (m: unknown) => void };

ctx.onmessage = (e: MessageEvent<{ id: number; game: SerializedGame; level: AiLevel }>) => {
  const { id, game, level } = e.data;
  try {
    const state = deserialize(game);
    ctx.postMessage({ id, action: chooseAction(state, level, { timeMs: level === 'hard' ? 2500 : 500 }) });
  } catch (err) {
    ctx.postMessage({ id, error: String(err) });
  }
};
