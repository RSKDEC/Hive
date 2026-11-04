'use client';

import { create } from 'zustand';
import type { Bug, Hex } from '@/engine';

export type Selection =
  | { kind: 'hand'; bug: Bug }
  | { kind: 'board'; hex: Hex }
  | { kind: 'lift'; by: Hex; from: Hex }
  | null;

interface SelectionStore {
  selection: Selection;
  /** When a tap could mean two things (move onto vs lift), we ask. */
  choice: { hex: Hex; by: Hex } | null;
  toast: { text: string; id: number } | null;
  select: (s: Selection) => void;
  setChoice: (c: SelectionStore['choice']) => void;
  say: (text: string) => void;
  clear: () => void;
}

export const useSelection = create<SelectionStore>((set) => ({
  selection: null,
  choice: null,
  toast: null,
  select: (selection) => set({ selection, choice: null }),
  setChoice: (choice) => set({ choice }),
  say: (text) => set({ toast: { text, id: Date.now() } }),
  clear: () => set({ selection: null, choice: null }),
}));
