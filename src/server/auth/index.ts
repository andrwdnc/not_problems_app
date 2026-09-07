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

/**
 * Indica si el espacio compartido ya está completo (2 usuarios). Se usa en las
 * páginas de autenticación para ocultar el registro y proteger la ruta /signup.
 *
 * Ante un fallo de conexión a la base de datos se devuelve false (no completo)
 * para no derribar las páginas de auth; el freno real lo aplica la Server Action
 * `signup`, que sí controla el error y muestra el mensaje correspondiente.
 */
export async function espacioCompleto(): Promise<boolean> {
  try {
    const total = await usuarioRepository.count();
    return total >= 2;
  } catch {
    return false;
  }
}
