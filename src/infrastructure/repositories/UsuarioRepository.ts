import { count, eq } from 'drizzle-orm';
import { db } from '../db';
import { usuarios } from '../db/schema';
import type { Usuario } from '@/domain/entities';
import type {
  NuevoUsuario,
  UsuarioConCredenciales,
  UsuarioRepository,
} from '@/domain/ports/repositories';

/**
 * Implementación Drizzle del puerto `UsuarioRepository`.
 *
 * Las credenciales (`passwordHash`) solo se exponen en `findByUsername`, de uso
 * exclusivo del login. El resto de métodos devuelven el usuario público
 * (`{ id, username }`) para que el hash nunca llegue a la capa de presentación.
 */
export class UsuarioDrizzleRepository implements UsuarioRepository {
  async findById(id: string): Promise<Usuario | null> {
    const result = await db.query.usuarios.findFirst({
      where: eq(usuarios.id, id),
    });
    if (!result) return null;
    return { id: result.id, username: result.username };
  }

  async findByUsername(username: string): Promise<UsuarioConCredenciales | null> {
    const result = await db.query.usuarios.findFirst({
      where: eq(usuarios.username, username),
    });
    if (!result) return null;
    return {
      id: result.id,
      username: result.username,
      passwordHash: result.passwordHash,
    };
  }

  async findAll(): Promise<Usuario[]> {
    const result = await db.query.usuarios.findMany();
    return result.map(({ id, username }) => ({ id, username }));
  }

  async count(): Promise<number> {
    const [result] = await db.select({ value: count() }).from(usuarios);
    return result?.value ?? 0;
  }

  async create(data: NuevoUsuario): Promise<Usuario> {
    const [result] = await db.insert(usuarios).values(data).returning();
    return { id: result.id, username: result.username };
  }
}