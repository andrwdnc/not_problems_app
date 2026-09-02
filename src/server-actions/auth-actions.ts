'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { loginSchema, signupSchema } from './schemas/auth';
import { usuarioRepository } from './repositories';
import { crearSesion, borrarSesion } from '@/lib/session';
import { handleError } from './action-result';
import type { ActionResult } from './action-result';

const COSTO_BCRYPT = 12;

/**
 * Inicia sesión con nombre de usuario y contraseña. Comprueba que el nombre
 * existe y que la contraseña coincide (comparación segura de bcrypt). Si es
 * correcto, establece la cookie de sesión firmada (HTTP-only).
 */
export async function login(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return handleError(parsed.error);
  }

  const { username, password } = parsed.data;

  const usuario = await usuarioRepository.findByUsername(username);
  if (!usuario) {
    // Respuesta idéntica para usuario inexistente o contraseña incorrecta
    // (evita enumerar usuarios).
    return { ok: false, error: 'Nombre de usuario o contraseña incorrectos.' };
  }

  const coincide = await bcrypt.compare(password, usuario.passwordHash);
  if (!coincide) {
    return { ok: false, error: 'Nombre de usuario o contraseña incorrectos.' };
  }

  await crearSesion(usuario.id);

  revalidatePath('/', 'layout');
  return { ok: true, data: undefined };
}

/**
 * Registra un usuario con nombre de usuario único y contraseña hasheada.
 * Tras crearlo, inicia sesión automáticamente.
 */
export async function signup(input: unknown): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return handleError(parsed.error);
  }

  const { username, password } = parsed.data;

  const existente = await usuarioRepository.findByUsername(username);
  if (existente) {
    return { ok: false, error: `El nombre de usuario "${username}" ya está en uso.` };
  }

  const passwordHash = await bcrypt.hash(password, COSTO_BCRYPT);

  const usuario = await usuarioRepository.create({ username, passwordHash });

  await crearSesion(usuario.id);

  revalidatePath('/', 'layout');
  return { ok: true, data: undefined };
}

/**
 * Cierra la sesión borrando la cookie.
 */
export async function logout(): Promise<ActionResult> {
  await borrarSesion();
  revalidatePath('/', 'layout');
  return { ok: true, data: undefined };
}
