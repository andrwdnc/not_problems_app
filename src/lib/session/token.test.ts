import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { firmarToken, verificarToken } from './token';

const SECRET = 'a'.repeat(64);

beforeEach(() => {
  process.env.AUTH_SECRET = SECRET;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('firmarToken / verificarToken', () => {
  it('verifica un token recién firmado y devuelve el userId', async () => {
    const token = await firmarToken('usuario-123');
    expect(token.split('.')).toHaveLength(3);
    await expect(verificarToken(token)).resolves.toBe('usuario-123');
  });

  it('rechaza un token con firma alterada', async () => {
    const token = await firmarToken('usuario-123');
    const [userId, expira] = token.split('.');
    const manipulada = `${userId}.${expira}.firma_incorrecta`;
    await expect(verificarToken(manipulada)).resolves.toBeNull();
  });

  it('rechaza un token expirado', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
    const token = await firmarToken('usuario-123');

    vi.setSystemTime(new Date('2025-01-09T00:00:00Z'));
    await expect(verificarToken(token)).resolves.toBeNull();
  });

  it('rechaza payloads mal formados', async () => {
    await expect(verificarToken('solo_una_parte')).resolves.toBeNull();
    await expect(verificarToken('a.b.con.firma')).resolves.toBeNull();
    await expect(verificarToken('')).resolves.toBeNull();
  });

  it('rechaza un token con userId de otro usuario (firma cruzada)', async () => {
    const token = await firmarToken('usuario-a');
    const [, expira, firma] = token.split('.');
    const cruzado = `usuario-b.${expira}.${firma}`;
    await expect(verificarToken(cruzado)).resolves.toBeNull();
  });
});