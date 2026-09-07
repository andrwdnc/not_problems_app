import { getAuthSecret } from '@/infrastructure/config';

export const COOKIE_NAME = 'auth_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 días

/**
 * Codec compartido de la cookie de sesión: `userId.expira.firma`, firma HMAC-SHA256.
 *
 * Se implementa sobre Web Crypto (`crypto.subtle`), disponible tanto en Node 20+
 * (Server Actions) como en Edge (Middleware), de modo que el token firmado en el
 * servidor se verifica con exactamente el mismo algoritmo en el middleware. Ese
 * era el caso antes de esta unificación: el middleware recomputaba la HMAC por su
 * cuenta, con riesgo de divergencia silenciosa entre runtimes.
 */

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    '=',
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function hmacBase64Url(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getAuthSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const firma = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload),
  );
  return bytesToBase64Url(new Uint8Array(firma));
}

/**
 * Genera una cookie de sesión firmada (`userId.expira.firma`) con expiración a 7 días.
 */
export async function firmarToken(userId: string): Promise<string> {
  const expira = Date.now() + SESSION_TTL_SECONDS * 1000;
  const firma = await hmacBase64Url(`${userId}.${expira}`);
  return `${userId}.${expira}.${firma}`;
}

/**
 * Verifica una cookie firmada y devuelve el userId, o null si es inválida o expiró.
 * `crypto.subtle.verify` realiza la comparación en tiempo constante.
 */
export async function verificarToken(token: string): Promise<string | null> {
  const partes = token.split('.');
  if (partes.length !== 3) return null;

  const [userId, expira, firma] = partes;
  const expMs = Number(expira);
  if (!Number.isFinite(expMs) || Date.now() >= expMs) return null;

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(getAuthSecret()),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const ok = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlToBytes(firma),
      new TextEncoder().encode(`${userId}.${expira}`),
    );
    return ok ? userId : null;
  } catch {
    return null;
  }
}