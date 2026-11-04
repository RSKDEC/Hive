'use client';

import type { AiLevel } from '@/engine/ai';
import { deserialize, serialize, type Color, type GameState, type SerializedGame } from '@/engine';

export interface LocalSave { game: SerializedGame; names: Record<Color, string>; savedAt: number }
export interface AiSave { game: SerializedGame; human: Color; level: AiLevel; savedAt: number }
export interface OnlineEntry { id: string; opponent: string | null; you: Color | null; status: string; updatedAt: number }

const KEYS = { local: 'oasis.save.local', ai: 'oasis.save.ai', online: 'oasis.online' };

function read<T>(key: string): T | null {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}
function write(key: string, value: unknown) {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ }
}

export const saves = {
  loadLocal(): (LocalSave & { state: GameState }) | null {
    const s = read<LocalSave>(KEYS.local);
    if (!s) return null;
    try { return { ...s, state: deserialize(s.game) }; } catch { return null; }
  },
  saveLocal(state: GameState, names: Record<Color, string>) {
    write(KEYS.local, { game: serialize(state), names, savedAt: Date.now() } satisfies LocalSave);
  },
  clearLocal: () => write(KEYS.local, null),

  loadAi(): (AiSave & { state: GameState }) | null {
    const s = read<AiSave>(KEYS.ai);
    if (!s) return null;
    try { return { ...s, state: deserialize(s.game) }; } catch { return null; }
  },
  saveAi(state: GameState, human: Color, level: AiLevel) {
    write(KEYS.ai, { game: serialize(state), human, level, savedAt: Date.now() } satisfies AiSave);
  },
  clearAi: () => write(KEYS.ai, null),

  onlineGames(): OnlineEntry[] {
    return read<OnlineEntry[]>(KEYS.online) ?? [];
  },
  rememberOnline(entry: OnlineEntry) {
    const list = saves.onlineGames().filter((e) => e.id !== entry.id);
    list.unshift(entry);
    write(KEYS.online, list.slice(0, 8));
  },
  forgetOnline(id: string) {
    write(KEYS.online, saves.onlineGames().filter((e) => e.id !== id));
  },
};
