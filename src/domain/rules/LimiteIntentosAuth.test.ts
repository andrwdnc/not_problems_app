import { describe, expect, it } from 'vitest';
import {
  estaBloqueado,
  reglaDe,
  type AccionSujetaALimite,
  type ReglaLimite,
} from './LimiteIntentosAuth';

const regla: ReglaLimite = {
  accion: 'login',
  ventanaMs: 15 * 60_000,
  porUsuario: 5,
  porIp: 20,
};

describe('reglaDe', () => {
  it('devuelve una regla para cada acción protegida', () => {
    const acciones: AccionSujetaALimite[] = ['login', 'signup'];
    for (const accion of acciones) {
      const r = reglaDe(accion);
      expect(r.accion).toBe(accion);
      expect(r.ventanaMs).toBeGreaterThan(0);
      expect(r.porUsuario).toBeGreaterThan(0);
      expect(r.porIp).toBeGreaterThan(0);
    }
  });

  it('falla explícitamente si una acción no tiene umbral declarado', () => {
    // Mejor un error ruidoso al desplegar que una acción sin limite en
    // produccion por haberla anadido a un enum y olvidado la tabla.
    expect(() => reglaDe('recuperar' as AccionSujetaALimite)).toThrow(
      /No hay regla de límite/,
    );
  });

  it('el limite por IP es mas alto que el de usuario', () => {
    // Si fueran iguales, el cubo de IP sería el único que decide y el de usuario
    // no añadiría nada. Tiene que ser más laxo para no castigar a las dos
    // personas legítimas que comparten conexión.
    for (const accion of ['login', 'signup'] as AccionSujetaALimite[]) {
      const r = reglaDe(accion);
      expect(r.porIp).toBeGreaterThan(r.porUsuario);
    }
  });
});

describe('estaBloqueado', () => {
  it('permite el intento mientras no se alcance el umbral', () => {
    expect(estaBloqueado(1, 1, regla)).toBeNull();
    expect(estaBloqueado(4, 15, regla)).toBeNull();
  });

  it('permite el intento que IGUALA el umbral y bloquea el siguiente', () => {
    // Con porUsuario: 5 hay exactamente 5 intentos disponibles.
    expect(estaBloqueado(5, 1, regla)).toBeNull();
    expect(estaBloqueado(6, 1, regla)).toBe('usuario');
  });

  it('bloquea por IP aunque el contador de usuario sea bajo', () => {
    expect(estaBloqueado(1, 21, regla)).toBe('ip');
  });

  it('con ambos cubos superados, señala el usuario', () => {
    // El cubo de usuario es el que el atacante controla para atacar una cuenta
    // concreta; es la palanca que no conviene señalar.
    expect(estaBloqueado(10, 100, regla)).toBe('usuario');
  });

  it('un intento por debajo del umbral de usuario nunca se bloquea', () => {
    for (let i = 0; i < 5; i++) {
      expect(estaBloqueado(i, 0, regla)).toBeNull();
    }
  });
});

describe('coherencia de la tabla de reglas', () => {
  const acciones: AccionSujetaALimite[] = ['login', 'signup'];

  it('ninguna regla deja pasar un numero ilimitado de intentos', () => {
    for (const accion of acciones) {
      const r = reglaDe(accion);
      expect(estaBloqueado(r.porUsuario + 1, 0, r)).not.toBeNull();
      expect(estaBloqueado(0, r.porIp + 1, r)).not.toBeNull();
    }
  });

  it('la ventana de signup es mas larga que la de login', () => {
    // Registrarse es una decisión, no un reintento: castigar con la ventana
    // corta del login obligaría a esperar si alguien se equivoca de username.
    expect(reglaDe('signup').ventanaMs).toBeGreaterThan(reglaDe('login').ventanaMs);
  });
});