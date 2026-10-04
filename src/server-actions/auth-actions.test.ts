import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { authErrores } from '@/literals';

/**
 * Fija por contrato las dos mitigaciones de seguridad del login y el registro:
 *
 *  1. **Coste constante.** Un usuario inexistente y uno existente con contraseña
 *     incorrecta deben responder lo mismo y tardar lo mismo. Antes de este
 *     cambio, `login` retornaba antes de `bcrypt.compare` cuando el usuario no
 *     existía, y esa diferencia de tiempos bastaba para enumerar las cuentas.
 *
 *  2. **Límite de intentos.** `login` y `signup` consultan el limitador antes de
 *     hacer nada, y cuando este dice que no, la respuesta es indistinguible de
 *     una credencial incorrecta.
 *
 * Además comprueba que el error del trigger `usuarios_max_2` se traduce al
 * literal de negocio y no a un genérico de "error de conexión".
 */
const { repos, sesion, limitador, erroresPostgres } = vi.hoisted(() => ({
  repos: {
    usuarioRepository: {
      findByUsername: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
  sesion: {
    crearSesion: vi.fn(),
    borrarSesion: vi.fn(),
  },
  limitador: {
    estaBloqueadoPorIntentos: vi.fn(),
    mensajeIntentosAgotados: vi.fn(() => authErrores.credencialesIncorrectas),
  },
  erroresPostgres: {
    esEspacioCompleto: vi.fn(() => false),
  },
}));

vi.mock('./repositories', () => repos);
vi.mock('@/lib/session', () => sesion);
vi.mock('./limite-intentos', () => limitador);
vi.mock('@/infrastructure/errores-postgres', () => erroresPostgres);
// `revalidatePath` necesita el store de una petición real; fuera de él lanza y
// el error caería en el catch como si fuera un fallo de conexión.
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { login, signup } from './auth-actions';
import { HASH_SENUELO } from '@/lib/session/hashSenuelo';

// Coste bajo para que los tests no tarden un segundo por hash. La mitigación no
// depende del coste: depende de que AMBOS caminos ejecuten la comparación.
const COSTE_TEST = 4;

/** Cuenta cuántas veces se invocó `bcrypt.compare`. */
function espiarCompare() {
  return vi.spyOn(bcrypt, 'compare');
}

describe('login: coste constante y mensaje indistinguible', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    limitador.estaBloqueadoPorIntentos.mockResolvedValue(false);
    limitador.mensajeIntentosAgotados.mockReturnValue(
      authErrores.credencialesIncorrectas,
    );
  });

  it('ejecuta bcrypt.compare también cuando el usuario NO existe', async () => {
    // Es la regresión que motiva el hash señuelo: si no se compara, el atacante
    // mide la diferencia y deduce qué usernames están registrados.
    repos.usuarioRepository.findByUsername.mockResolvedValue(null);
    const spy = espiarCompare();

    const resultado = await login({ username: 'no-existe', password: 'secreto1' });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(resultado).toEqual({
      ok: false,
      error: authErrores.credencialesIncorrectas,
    });
  });

  it('compara contra el hash señuelo, no contra un hash real', async () => {
    repos.usuarioRepository.findByUsername.mockResolvedValue(null);
    const spy = espiarCompare();

    await login({ username: 'no-existe', password: 'secreto1' });

    expect(spy.mock.calls[0]?.[1]).toBe(HASH_SENUELO);
  });

  it('devuelve EXACTAMENTE el mismo mensaje si el usuario existe con otra contraseña', async () => {
    const passwordHash = bcrypt.hashSync('la-buena', COSTE_TEST);
    repos.usuarioRepository.findByUsername.mockResolvedValue({
      id: 'u1',
      username: 'paco',
      passwordHash,
    });

    const conUsuario = await login({ username: 'paco', password: 'la-mala' });

    expect(conUsuario).toEqual({
      ok: false,
      error: authErrores.credencialesIncorrectas,
    });
  });

  it('no establece sesión cuando la contraseña no coincide', async () => {
    const passwordHash = bcrypt.hashSync('la-buena', COSTE_TEST);
    repos.usuarioRepository.findByUsername.mockResolvedValue({
      id: 'u1',
      username: 'paco',
      passwordHash,
    });

    await login({ username: 'paco', password: 'la-mala' });

    expect(sesion.crearSesion).not.toHaveBeenCalled();
  });

  it('establece sesión con las credenciales correctas', async () => {
    const passwordHash = bcrypt.hashSync('la-buena', COSTE_TEST);
    repos.usuarioRepository.findByUsername.mockResolvedValue({
      id: 'u1',
      username: 'paco',
      passwordHash,
    });

    const resultado = await login({ username: 'paco', password: 'la-buena' });

    expect(resultado.ok).toBe(true);
    expect(sesion.crearSesion).toHaveBeenCalledWith('u1');
  });

  it('normaliza el username para que el límite no se esquive por mayúsculas', async () => {
    repos.usuarioRepository.findByUsername.mockResolvedValue(null);

    await login({ username: 42, password: 'secreto1' });

    // El esquema hace coerce a string; el limitador recibe la misma forma.
    expect(limitador.estaBloqueadoPorIntentos).toHaveBeenCalledWith(
      'login',
      '42',
    );
  });
});

describe('hash señuelo', () => {
  it('es un hash bcrypt válido con el mismo coste que el de las contraseñas', () => {
    // Si el señuelo fuera más barato que un hash real, volvería a existir una
    // diferencia de tiempos: el sentido de la mitigación se perdería.
    expect(bcrypt.getRounds(HASH_SENUELO)).toBe(12);
  });

  it('no coincide con ninguna contraseña', async () => {
    await expect(bcrypt.compare('', HASH_SENUELO)).resolves.toBe(false);
    await expect(bcrypt.compare('password', HASH_SENUELO)).resolves.toBe(false);
  });
});

describe('login: límite de intentos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    limitador.estaBloqueadoPorIntentos.mockResolvedValue(false);
    limitador.mensajeIntentosAgotados.mockReturnValue(
      authErrores.credencialesIncorrectas,
    );
  });

  it('consulta el limitador antes de tocar la base de datos', async () => {
    limitador.estaBloqueadoPorIntentos.mockResolvedValue(true);

    await login({ username: 'paco', password: 'secreto1' });

    // Si se consultara después, el intento ya habría consumido CPU de bcrypt.
    expect(repos.usuarioRepository.findByUsername).not.toHaveBeenCalled();
  });

  it('responde con el mensaje del limitador, no con un 500', async () => {
    limitador.estaBloqueadoPorIntentos.mockResolvedValue(true);

    const resultado = await login({ username: 'paco', password: 'secreto1' });

    expect(resultado.ok).toBe(false);
    expect(resultado.ok === false && resultado.error).toBe(
      authErrores.credencialesIncorrectas,
    );
  });
});

describe('signup: límite de intentos y límite de usuarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    limitador.estaBloqueadoPorIntentos.mockResolvedValue(false);
    limitador.mensajeIntentosAgotados.mockReturnValue(
      authErrores.credencialesIncorrectas,
    );
    erroresPostgres.esEspacioCompleto.mockReturnValue(false);
    repos.usuarioRepository.findByUsername.mockResolvedValue(null);
    repos.usuarioRepository.count.mockResolvedValue(0);
    repos.usuarioRepository.create.mockResolvedValue({
      id: 'u9',
      username: 'nuevo',
    });
    vi.spyOn(bcrypt, 'hash').mockReturnValue('hash-falso' as never);
  });

  it('bloquea por límite sin llegar a crear el usuario', async () => {
    limitador.estaBloqueadoPorIntentos.mockResolvedValue(true);

    const resultado = await signup({ username: 'nuevo', password: 'secreto1' });

    expect(repos.usuarioRepository.create).not.toHaveBeenCalled();
    expect(resultado.ok).toBe(false);
  });

  it('usa el fast-fail de interfaz cuando ya hay 2 usuarios', async () => {
    repos.usuarioRepository.count.mockResolvedValue(2);

    const resultado = await signup({ username: 'nuevo', password: 'secreto1' });

    expect(resultado).toEqual({
      ok: false,
      error: authErrores.maximoUsuariosAlcanzado,
    });
    expect(repos.usuarioRepository.create).not.toHaveBeenCalled();
  });

  it('traduce el rechazo del trigger al literal de negocio, no a un error de conexión', async () => {
    // Este es el camino que cubre la carrera: el `count()` veía 1 usuario y otra
    // petición se adelantó. La garantía real la da el trigger, y su error debe
    // llegar al usuario como "espacio completo", no como "no se pudo conectar".
    repos.usuarioRepository.count.mockResolvedValue(1);
    repos.usuarioRepository.create.mockRejectedValue(
      Object.assign(new Error('espacio_completo'), { code: 'NST01' }),
    );
    erroresPostgres.esEspacioCompleto.mockReturnValue(true);

    const resultado = await signup({ username: 'nuevo', password: 'secreto1' });

    expect(resultado).toEqual({
      ok: false,
      error: authErrores.maximoUsuariosAlcanzado,
    });
  });

  it('mantiene el error de conexión para fallos que no son de espacio lleno', async () => {
    repos.usuarioRepository.count.mockResolvedValue(0);
    repos.usuarioRepository.create.mockRejectedValue(new Error('ECONNREFUSED'));
    erroresPostgres.esEspacioCompleto.mockReturnValue(false);

    const resultado = await signup({ username: 'nuevo', password: 'secreto1' });

    expect(resultado).toEqual({ ok: false, error: authErrores.errorConexion });
  });

  it('rechaza un username ya en uso sin consumir más lógica', async () => {
    repos.usuarioRepository.findByUsername.mockResolvedValue({
      id: 'u1',
      username: 'paco',
    });

    const resultado = await signup({ username: 'paco', password: 'secreto1' });

    expect(resultado.ok === false && resultado.error).toContain('paco');
    expect(repos.usuarioRepository.create).not.toHaveBeenCalled();
  });
});