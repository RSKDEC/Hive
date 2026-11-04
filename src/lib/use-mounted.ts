'use client';

import { useEffect, useState } from 'react';

/** True after the first client render — use before reading browser-only state to avoid hydration mismatches. */
export function useMounted(): boolean {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}
