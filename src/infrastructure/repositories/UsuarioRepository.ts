import { count, eq } from 'drizzle-orm';
import { db } from '../db';
import { usuarios } from '../db/schema';

export interface Usuario {
  id: string;
  username: string;
  passwordHash: string;
}

export interface UsuarioRepository {
  findById(id: string): Promise<Usuario | null>;
  findByUsername(username: string): Promise<Usuario | null>;
  findAll(): Promise<Usuario[]>;
  count(): Promise<number>;
  create(data: Omit<Usuario, 'id'>): Promise<Usuario>;
}

export class UsuarioDrizzleRepository implements UsuarioRepository {
  async findById(id: string): Promise<Usuario | null> {
    const result = await db.query.usuarios.findFirst({
      where: eq(usuarios.id, id),
    });
    return (result as Usuario) ?? null;
  }

  async findByUsername(username: string): Promise<Usuario | null> {
    const result = await db.query.usuarios.findFirst({
      where: eq(usuarios.username, username),
    });
    return (result as Usuario) ?? null;
  }

  async findAll(): Promise<Usuario[]> {
    const result = await db.query.usuarios.findMany();
    return result as Usuario[];
  }

  async count(): Promise<number> {
    const [result] = await db.select({ value: count() }).from(usuarios);
    return result?.value ?? 0;
  }

  async create(data: Omit<Usuario, 'id'>): Promise<Usuario> {
    const [result] = await db.insert(usuarios).values(data).returning();
    return result as Usuario;
  }
}