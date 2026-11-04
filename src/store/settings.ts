'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Settings {
  nickname: string;
  /** Larger tiles, fewer animations, simplified guidance. Rules are unchanged. */
  familyMode: boolean;
  hints: boolean;
  reduceMotion: boolean;
  setNickname: (n: string) => void;
  set: (patch: Partial<Pick<Settings, 'familyMode' | 'hints' | 'reduceMotion'>>) => void;
}

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      nickname: '',
      familyMode: false,
      hints: true,
      reduceMotion: false,
      setNickname: (nickname) => set({ nickname: nickname.slice(0, 20) }),
      set: (patch) => set(patch),
    }),
    { name: 'oasis.settings' },
  ),
);

/** Animations are off when the user asks for it, in family mode, or when the OS requests reduced motion. */
export function useAnimationsOn(): boolean {
  const { reduceMotion, familyMode } = useSettings();
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  return !reduceMotion && !familyMode;
}
