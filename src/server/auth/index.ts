import { leerSesion } from '@/lib/session';
import { usuarioRepository } from '@/infrastructure/repositories/instances';

/**
 * Obtiene el id del usuario autenticado a partir de la cookie de sesión firmada.
 * Devuelve null si no hay sesión válida.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const userId = await leerSesion();
  if (!userId) return null;

  // Verificamos que el usuario sigue existiendo en la BD.
  const usuario = await usuarioRepository.findById(userId);
  return usuario ? usuario.id : null;
}

/**
 * Obtiene el usuario autenticado (id + username) o null si no hay sesión.
 */
export async function getCurrentUser(): Promise<{ id: string; username: string } | null> {
  const userId = await leerSesion();
  if (!userId) return null;

  const usuario = await usuarioRepository.findById(userId);
  if (!usuario) return null;

  return { id: usuario.id, username: usuario.username };
}
