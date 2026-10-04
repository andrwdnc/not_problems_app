'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { loginSchema, signupSchema } from './schemas/auth';
import { usuarioRepository } from './repositories';
import { crearSesion, borrarSesion } from '@/lib/session';
import { HASH_SENUELO } from '@/lib/session/hashSenuelo';
import { esEspacioCompleto } from '@/infrastructure/errores-postgres';
import {
  estaBloqueadoPorIntentos,
  mensajeIntentosAgotados,
} from './limite-intentos';
import { handleError } from './action-result';
import type { ActionResult } from './action-result';
import { authErrores } from '@/literals';

const COSTO_BCRYPT = 12;

/**
 * Inicia sesión con nombre de usuario y contraseña. Comprueba que el nombre
 * existe y que la contraseña coincide (comparación segura de bcrypt). Si es
 * correcto, establece la cookie de sesión firmada (HTTP-only).
 *
 * Si el usuario no existe se compara igualmente contra `HASH_SENUELO`, de modo
 * que ambos caminos cuestan lo mismo y el tiempo de respuesta no permite
 * enumerar las cuentas registradas. Ver `lib/session/hashSenuelo.ts`.
 *
 * Los intentos están limitados por usuario y por IP (`LimiteIntentosAuth`). Al
 * superarse, la respuesta es indistinguible de una contraseña incorrecta.
 */
export async function login(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return handleError(parsed.error);
  }

  const { username, password } = parsed.data;

  try {
    if (await estaBloqueadoPorIntentos('login', username)) {
      return { ok: false, error: mensajeIntentosAgotados() };
    }

    const usuario = await usuarioRepository.findByUsername(username);

    // La comparación se ejecuta SIEMPRE: si no hay usuario, el hash señuelo
    // reproduce el coste de un bcrypt real. Mismo mensaje y mismo reloj en los
    // dos casos, así que no se puede deducir qué usernames existen.
    const coincide = await bcrypt.compare(
      password,
      usuario?.passwordHash ?? HASH_SENUELO,
    );
    if (!usuario || !coincide) {
      return { ok: false, error: authErrores.credencialesIncorrectas };
    }

    await crearSesion(usuario.id);

    revalidatePath('/', 'layout');
    return { ok: true, data: undefined };
  } catch {
    // Falla de conexión a la base de datos u otro error inesperado: se devuelve
    // un ActionResult controlado para que la UI muestre el error en vez de un
    // 500 silencioso que deja el formulario cargando.
    return { ok: false, error: authErrores.errorConexion };
  }
}

/**
 * Registra un usuario con nombre de usuario único y contraseña hasheada.
 * Tras crearlo, inicia sesión automáticamente.
 *
 * El máximo de 2 usuarios es una invariante del dominio y la GARANTIZA la base
 * de datos con un trigger (`usuarios_max_2`): el `count()` de aquí es solo un
 * fast-fail de interfaz que evita el viaje a la base de datos en el caso común,
 * y el trigger es lo que impide que dos registros simultáneos dejen 3 cuentas.
 */
export async function signup(input: unknown): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return handleError(parsed.error);
  }

  const { username, password } = parsed.data;

  try {
    if (await estaBloqueadoPorIntentos('signup', username)) {
      return { ok: false, error: mensajeIntentosAgotados() };
    }

    const totalUsuarios = await usuarioRepository.count();
    if (totalUsuarios >= 2) {
      return { ok: false, error: authErrores.maximoUsuariosAlcanzado };
    }

    const existente = await usuarioRepository.findByUsername(username);
    if (existente) {
      return { ok: false, error: authErrores.usuarioEnUso(username) };
    }

    const passwordHash = await bcrypt.hash(password, COSTO_BCRYPT);

    const usuario = await usuarioRepository.create({ username, passwordHash });

    await crearSesion(usuario.id);

    revalidatePath('/', 'layout');
    return { ok: true, data: undefined };
  } catch (err) {
    // El trigger `usuarios_max_2` rechazando el INSERT: es el límite de negocio,
    // no un fallo de conexión, y su literal es más útil que "error de conexión".
    if (esEspacioCompleto(err)) {
      return { ok: false, error: authErrores.maximoUsuariosAlcanzado };
    }
    return { ok: false, error: authErrores.errorConexion };
  }
}

/**
 * Cierra la sesión borrando la cookie.
 */
export async function logout(): Promise<ActionResult> {
  await borrarSesion();
  revalidatePath('/', 'layout');
  return { ok: true, data: undefined };
}
