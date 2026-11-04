'use client';

const SECRET_KEY = 'pondlife.secret';

function randomSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** This browser's private player token. Stored only locally and sent only in a request header. */
export function getSecret(): string {
  try {
    let s = localStorage.getItem(SECRET_KEY);
    if (!s || s.length < 32) {
      s = randomSecret();
      localStorage.setItem(SECRET_KEY, s);
    }
    return s;
  } catch {
    // Private mode without storage: identity lasts for this tab only.
    const w = window as unknown as { __pondlifeSecret?: string };
    return (w.__pondlifeSecret ??= randomSecret());
  }
}
