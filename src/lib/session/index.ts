import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'auth_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 días

/**
 * Devuelve el secreto usado para firmar la cookie de sesión.
 * Si no está definido en el entorno, lanzamos un error claro en vez de firmar
 * con un secreto débil/impredecible.
 */
function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'Falta AUTH_SECRET en el entorno. Debe tener al menos 32 caracteres.',
    );
  }
  return secret;
}

/**
 * Genera una cookie de sesión firmada: `userId.expira.firma`.
 * La firma es HMAC-SHA256 del payload usando AUTH_SECRET.
 */
function firmar(userId: string, expira: number): string {
  const payload = `${userId}.${expira}`;
  const hmac = createHmac('sha256', getSecret())
    .update(payload)
    .digest('base64url');
  return `${payload}.${hmac}`;
}

/**
 * Verifica y devuelve el userId de una cookie firmada, o null si es inválida,
 * ha expirado o no es constante-tiempo segura.
 */
function verificar(token: string): string | null {
  const partes = token.split('.');
  if (partes.length !== 3) return null;

  const [userId, expira, firma] = partes;
  const expMs = Number(expira);
  if (!Number.isFinite(expMs) || Date.now() >= expMs) return null;

  const esperada = createHmac('sha256', getSecret())
    .update(`${userId}.${expira}`)
    .digest('base64url');

  const a = Buffer.from(firma);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return userId;
}

/**
 * Establece la cookie de sesión del usuario autenticado (HTTP-only, firmada).
 */
export async function crearSesion(userId: string): Promise<void> {
  const expira = Date.now() + SESSION_TTL_SECONDS * 1000;
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, firmar(userId, expira), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(expira),
  });
}

/**
 * Lee y valida la cookie de sesión. Devuelve el userId o null.
 */
export async function leerSesion(): Promise<string | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verificar(token);
}

/**
 * Elimina la cookie de sesión (logout).
 */
export async function borrarSesion(): Promise<void> {
  cookies().delete(COOKIE_NAME);
}
