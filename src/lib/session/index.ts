import { cookies } from 'next/headers';
import {
  COOKIE_NAME,
  SESSION_TTL_SECONDS,
  firmarToken,
  verificarToken,
} from './token';
import { esProduccion } from '@/infrastructure/config';

/**
 * Establece la cookie de sesión del usuario autenticado (HTTP-only, firmada).
 */
export async function crearSesion(userId: string): Promise<void> {
  const expira = Date.now() + SESSION_TTL_SECONDS * 1000;
  const token = await firmarToken(userId);
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: esProduccion(),
    sameSite: 'lax',
    path: '/',
    expires: new Date(expira),
  });
}

/**
 * Lee y valida la cookie de sesión. Devuelve el userId o null.
 */
export async function leerSesion(): Promise<string | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verificarToken(token);
}

/**
 * Elimina la cookie de sesión (logout).
 */
export async function borrarSesion(): Promise<void> {
  cookies().delete(COOKIE_NAME);
}