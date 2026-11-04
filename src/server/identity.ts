import { createHash, randomBytes } from 'node:crypto';

/**
 * Players are identified by a random secret generated in their browser and kept in localStorage.
 * It travels only in the `x-player-secret` header (never in links), and the server stores only a hash.
 */
export const SECRET_HEADER = 'x-player-secret';

export function isValidSecret(s: unknown): s is string {
  return typeof s === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(s);
}

export function hashSecret(secret: string): string {
  const pepper = process.env.PLAYER_SECRET_PEPPER ?? 'oasis';
  return createHash('sha256').update(pepper + ':' + secret).digest('hex');
}

const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Unguessable, URL-friendly game id (~70 bits). */
export function newGameId(): string {
  const bytes = randomBytes(12);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export function cleanNickname(n: unknown): string | null {
  if (typeof n !== 'string') return null;
  const t = n.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 20);
  return t.length ? t : null;
}
