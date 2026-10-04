import { describe, it, expect } from 'vitest';
import {
  esEspacioCompleto,
  SQLSTATE_ESPACIO_COMPLETO,
} from './errores-postgres';

/**
 * El trigger `usuarios_max_2` lanza un SQLSTATE propio. Esta función es lo que
 * impide que ese código de base de datos llegue a la capa de presentación, así
 * que su comportamiento decide si el usuario ve "el espacio está completo" o un
 * "no se pudo conectar con la base de datos" que no le dice nada.
 */
describe('esEspacioCompleto', () => {
  it('reconoce el SQLSTATE del trigger', () => {
    const err = Object.assign(new Error('boom'), {
      code: SQLSTATE_ESPACIO_COMPLETO,
    });
    expect(esEspacioCompleto(err)).toBe(true);
  });

  it('reconoce el centinela cuando el código se perdió por el pool', () => {
    const err = Object.assign(
      new Error('espacio_completo: el espacio compartido admite 2 usuarios'),
      { code: '08006' },
    );
    expect(esEspacioCompleto(err)).toBe(true);
  });

  it('NO confunde un fallo de conexión con el límite de usuarios', () => {
    // Si un error de red se tomara por "espacio lleno", el usuario recibiría un
    // mensaje de negocio que le induciría a dejar de intentar registrarse.
    const conexion = Object.assign(new Error('connection terminated'), {
      code: 'ECONNREFUSED',
    });
    expect(esEspacioCompleto(conexion)).toBe(false);
  });

  it('no explota con valores que no son errores', () => {
    expect(esEspacioCompleto(null)).toBe(false);
    expect(esEspacioCompleto(undefined)).toBe(false);
    expect(esEspacioCompleto('texto')).toBe(false);
    expect(esEspacioCompleto(42)).toBe(false);
  });

  it('ignora errores sin código ni mensaje relevante', () => {
    expect(esEspacioCompleto({})).toBe(false);
    expect(esEspacioCompleto(new Error('algo distinto'))).toBe(false);
  });
});

describe('SQLSTATE_ESPACIO_COMPLETO', () => {
  it('usa el rango reservado por la norma SQL para el usuario', () => {
    // Los códigos que empiezan por 0-4, 5 y 7 están reservados a Postgres y a
    // clases estándar de SQL; un valor propio empieza por otra letra.
    expect(SQLSTATE_ESPACIO_COMPLETO).toMatch(/^[5-9A-Z][0-9A-Z]{4}$/);
    expect(SQLSTATE_ESPACIO_COMPLETO).not.toMatch(/^[0-47]/);
  });
});