import { headers } from 'next/headers';
import { getSupabaseServerClient } from '@/lib/supabase';

/**
 * Obtiene el id del usuario autenticado a partir de la cabecera Authorization.
 * Devuelve null si no hay sesión activa.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const headersList = headers();
  const authHeader = headersList.get('Authorization');

  if (!authHeader) return null;

  const supabase = getSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(authHeader);

  if (error || !user) return null;
  return user.id;
}