import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authErrores, gastosAnualesErrores } from '@/literals';

// Las acciones de gastos anuales orquestan (sesión -> esquema -> reglas puras ->
// repositorio -> auditoría -> revalidación). Se mockean los límites con I/O
// (sesión, repositorio, auditoría, caché de Next) y las reglas puras de
// CalculadoraGastoAnual se ejecutan REALES.
const {
  getCurrentUserIdMock,
  findByIdMock,
  createMock,
  updateMock,
  deleteMock,
  auditarMovimientoMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  getCurrentUserIdMock: vi.fn(),
  findByIdMock: vi.fn(),
  createMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
  auditarMovimientoMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock('@/server/auth', () => ({ getCurrentUserId: getCurrentUserIdMock }));
vi.mock('@/infrastructure/audit/auditarMovimiento', () => ({
  auditarMovimiento: auditarMovimientoMock,
}));
vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }));
vi.mock('./repositories', () => ({
  gastoAnualRepository: {
    findById: findByIdMock,
    create: createMock,
    update: updateMock,
    delete: deleteMock,
  },
  mesRepository: {},
}));

import {
  crearGastoAnual,
  editarGastoAnual,
  marcarPagadoGastoAnual,
  eliminarGastoAnual,
} from './gastos-anuales-actions';

const usuarioId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const gastoId = '123e4567-e89b-12d3-a456-426614174000';

const anioActual = new Date().getFullYear();

/**
 * Fixtures DETERMINISTAS respecto a `calcularDevengoPrevio`, que devuelve true
 * cuando el mes de pago del ciclo ya pasó (o el ciclo es anterior), y false
 * cuando todavía no ha llegado. Se usa un ciclo del año pasado para "ya
 * devengado" y uno del año que viene para "aún no devengado", así el test no
 * depende del mes en que se ejecute.
 */
const CICLO_YA_DEVENGADO = { anioCiclo: anioActual - 1, mesPago: 12 };
const CICLO_AUN_NO_DEVENGADO = { anioCiclo: anioActual + 1, mesPago: 1 };

function gastoAnual(overrides: Record<string, unknown> = {}) {
  return {
    id: gastoId,
    detalle: 'Seguro del coche',
    importeTotal: 45000,
    ...CICLO_AUN_NO_DEVENGADO,
    fechaUltimoPago: null,
    creadoPor: usuarioId,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUserIdMock.mockResolvedValue(usuarioId);
});

describe('crearGastoAnual', () => {
  it('rechaza si no hay sesión', async () => {
    getCurrentUserIdMock.mockResolvedValue(null);
    const r = await crearGastoAnual({ detalle: 'x', importeTotal: '10', mesPago: 3 });
    expect(r).toEqual({ ok: false, error: authErrores.noAutenticado });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('rechaza un payload inválido sin tocar el repositorio', async () => {
    const r = await crearGastoAnual({ detalle: '', importeTotal: '0', mesPago: 13 });
    expect(r.ok).toBe(false);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('crea, audita y revalida cuando el payload es válido', async () => {
    const creado = gastoAnual();
    createMock.mockResolvedValue(creado);

    const r = await crearGastoAnual({
      detalle: 'Seguro hogar',
      importeTotal: '450,00',
      mesPago: 12,
    });

    expect(r.ok).toBe(true);
    expect(createMock).toHaveBeenCalledOnce();
    // El importe llega al repositorio ya en céntimos enteros (§7).
    expect(createMock.mock.calls[0][0].importeTotal).toBe(45000);
    expect(auditarMovimientoMock).toHaveBeenCalledOnce();
    expect(auditarMovimientoMock.mock.calls[0][0]).toMatchObject({
      usuarioId,
      entidad: 'gastos_anuales',
      entidadId: gastoId,
      accion: 'crear',
    });
    expect(revalidatePathMock).toHaveBeenCalledWith('/gastos');
  });

  it('el ciclo inicial nunca es anterior al año en curso', async () => {
    createMock.mockResolvedValue(gastoAnual());
    for (const mesPago of [1, 6, 12]) {
      await crearGastoAnual({ detalle: 'x', importeTotal: '100', mesPago });
      const { anioCiclo } = createMock.mock.calls.at(-1)![0];
      expect(anioCiclo).toBeGreaterThanOrEqual(anioActual);
      expect(anioCiclo).toBeLessThanOrEqual(anioActual + 1);
    }
  });
});

describe('editarGastoAnual', () => {
  it('rechaza si no hay sesión', async () => {
    getCurrentUserIdMock.mockResolvedValue(null);
    const r = await editarGastoAnual({ id: gastoId, detalle: 'Nuevo' });
    expect(r).toEqual({ ok: false, error: authErrores.noAutenticado });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('devuelve not found si el gasto no existe', async () => {
    findByIdMock.mockResolvedValue(null);
    const r = await editarGastoAnual({ id: gastoId, detalle: 'Nuevo' });
    expect(r).toEqual({
      ok: false,
      error: gastosAnualesErrores.gastoAnualNoEncontrada,
    });
  });

  it('BLOQUEA en servidor si el gasto ya devengó en el ciclo actual', async () => {
    findByIdMock.mockResolvedValue(gastoAnual(CICLO_YA_DEVENGADO));

    const r = await editarGastoAnual({ id: gastoId, detalle: 'Nuevo' });

    expect(r).toEqual({ ok: false, error: gastosAnualesErrores.devengoPrevio });
    // El guard de servidor es la garantía real: deshabilitar el botón en la UI
    // no protege un endpoint público. Sin esto, la regla sería evadible.
    expect(updateMock).not.toHaveBeenCalled();
    expect(auditarMovimientoMock).not.toHaveBeenCalled();
  });

  it('permite editar cuando el mes de pago aún no ha llegado', async () => {
    const existente = gastoAnual(CICLO_AUN_NO_DEVENGADO);
    findByIdMock.mockResolvedValue(existente);
    updateMock.mockResolvedValue({ ...existente, detalle: 'Nuevo' });

    const r = await editarGastoAnual({ id: gastoId, detalle: 'Nuevo' });

    expect(r.ok).toBe(true);
    expect(updateMock).toHaveBeenCalledWith(gastoId, { detalle: 'Nuevo' });
    expect(auditarMovimientoMock).toHaveBeenCalledOnce();
    expect(auditarMovimientoMock.mock.calls[0][0]).toMatchObject({
      entidad: 'gastos_anuales',
      accion: 'editar',
    });
  });
});

describe('eliminarGastoAnual', () => {
  it('rechaza si no hay sesión', async () => {
    getCurrentUserIdMock.mockResolvedValue(null);
    const r = await eliminarGastoAnual({ id: gastoId });
    expect(r).toEqual({ ok: false, error: authErrores.noAutenticado });
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('devuelve not found si el gasto no existe', async () => {
    findByIdMock.mockResolvedValue(null);
    const r = await eliminarGastoAnual({ id: gastoId });
    expect(r).toEqual({
      ok: false,
      error: gastosAnualesErrores.gastoAnualNoEncontrada,
    });
  });

  it('BLOQUEA en servidor si el gasto ya devengó en el ciclo actual', async () => {
    findByIdMock.mockResolvedValue(gastoAnual(CICLO_YA_DEVENGADO));

    const r = await eliminarGastoAnual({ id: gastoId });

    expect(r).toEqual({ ok: false, error: gastosAnualesErrores.devengoPrevio });
    expect(deleteMock).not.toHaveBeenCalled();
    expect(auditarMovimientoMock).not.toHaveBeenCalled();
  });

  it('elimina y audita cuando el ciclo aún no ha devengado', async () => {
    const existente = gastoAnual(CICLO_AUN_NO_DEVENGADO);
    findByIdMock.mockResolvedValue(existente);
    deleteMock.mockResolvedValue(true);

    const r = await eliminarGastoAnual({ id: gastoId });

    expect(r.ok).toBe(true);
    expect(deleteMock).toHaveBeenCalledWith(gastoId);
    expect(auditarMovimientoMock).toHaveBeenCalledOnce();
    expect(auditarMovimientoMock.mock.calls[0][0]).toMatchObject({
      entidad: 'gastos_anuales',
      accion: 'eliminar',
    });
  });
});

describe('marcarPagadoGastoAnual', () => {
  it('rechaza si no hay sesión', async () => {
    getCurrentUserIdMock.mockResolvedValue(null);
    const r = await marcarPagadoGastoAnual({ id: gastoId });
    expect(r).toEqual({ ok: false, error: authErrores.noAutenticado });
  });

  it('devuelve not found si el gasto no existe', async () => {
    findByIdMock.mockResolvedValue(null);
    const r = await marcarPagadoGastoAnual({ id: gastoId });
    expect(r).toEqual({
      ok: false,
      error: gastosAnualesErrores.gastoAnualNoEncontrada,
    });
  });

  it('rechaza marcar dos veces en el mismo ciclo', async () => {
    // Ciclo ya devengado Y fechaUltimoPago en ese ciclo -> doble pago.
    findByIdMock.mockResolvedValue(
      gastoAnual({ ...CICLO_YA_DEVENGADO, fechaUltimoPago: new Date() }),
    );

    const r = await marcarPagadoGastoAnual({ id: gastoId });

    expect(r).toEqual({
      ok: false,
      error: gastosAnualesErrores.gastoAnualYaPagado,
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('avanza al ciclo siguiente y registra la fecha de pago', async () => {
    const existente = gastoAnual(CICLO_AUN_NO_DEVENGADO);
    findByIdMock.mockResolvedValue(existente);
    updateMock.mockImplementation((_id, datos) =>
      Promise.resolve({ ...existente, ...datos }),
    );

    const r = await marcarPagadoGastoAnual({ id: gastoId });

    expect(r.ok).toBe(true);
    expect(updateMock).toHaveBeenCalledOnce();
    const [, datos] = updateMock.mock.calls[0];
    expect(datos.anioCiclo).toBe(anioActual + 2);
    expect(datos.fechaUltimoPago).toBeInstanceOf(Date);
    expect(auditarMovimientoMock).toHaveBeenCalledOnce();
  });
});
