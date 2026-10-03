import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  authErrores,
  gastosAnualesErrores,
  individualErrores,
} from '@/literals';

// Las acciones de gastos anuales individuales orquestan (sesión -> esquema ->
// reglas puras -> repositorio owner-first -> auditoría -> revalidación). Se
// mockean los límites con I/O; las reglas puras de CalculadoraGastoAnual se
// ejecutan REALES, que es donde vive el criterio de devengo/inmutabilidad.
const {
  getCurrentUserIdMock,
  findByIdMock,
  createMock,
  updateMock,
  deleteMock,
  registrarPagoMock,
  auditarMovimientoMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  getCurrentUserIdMock: vi.fn(),
  findByIdMock: vi.fn(),
  createMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
  registrarPagoMock: vi.fn(),
  auditarMovimientoMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock('@/server/auth', () => ({ getCurrentUserId: getCurrentUserIdMock }));
vi.mock('@/infrastructure/audit/auditarMovimiento', () => ({
  auditarMovimiento: auditarMovimientoMock,
}));
vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }));
vi.mock('./repositories', () => ({
  gastoAnualIndividualRepository: {
    findById: findByIdMock,
    create: createMock,
    update: updateMock,
    delete: deleteMock,
    registrarPago: registrarPagoMock,
  },
}));

import {
  crearGastoAnualIndividual,
  editarGastoAnualIndividual,
  marcarPagadoGastoAnualIndividual,
  eliminarGastoAnualIndividual,
} from './gastos-anuales-individual-actions';

const usuarioId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const otroUsuarioId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const gastoId = '123e4567-e89b-12d3-a456-426614174000';

/**
 * (año, mes) desplazados `meses` respecto al actual. Alcanza el mismo efecto que
 * restar meses a un `Date` pero sin que un cambio de mes/año en el test rompa el
 * cálculo: mover ambos campos a la vez mantiene la distancia.
 */
function anioMesDesplazados(meses: number): { anio: number; mes: number } {
  const hoy = new Date();
  const total = hoy.getFullYear() * 12 + hoy.getMonth() + 1 + meses;
  return { anio: Math.floor(total / 12), mes: (total % 12) + 1 };
}

/**
 * Gasto anual cuyo mes de pago es el SIGUIENTE al actual: `calcularDevengoPrevio`
 * da false (el mes aún no ha pasado), así que es editable y eliminable. Es el
 * caso con el que se prueba el camino feliz sin pelearse con el calendario.
 */
function gastoFuturo(overrides: Record<string, unknown> = {}) {
  const { anio, mes } = anioMesDesplazados(2);

  return {
    id: gastoId,
    usuarioId,
    importeTotal: 120000,
    mesPago: mes,
    anioCiclo: anio,
    detalle: 'Seguro del coche',
    fechaUltimoPago: null,
    creadoPor: usuarioId,
    fechaCreacion: new Date(),
    ...overrides,
  };
}

/**
 * Mismo gasto con el mes de pago YA PASADO este año: el devengo previo lo
 * congela, que es el estado que activa los guards de servidor.
 */
function gastoDevengado(overrides: Record<string, unknown> = {}) {
  const { anio, mes } = anioMesDesplazados(-2);
  return gastoFuturo({ mesPago: mes, anioCiclo: anio, ...overrides });
}

describe('crearGastoAnualIndividual (paridad + privacidad)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserIdMock.mockResolvedValue(usuarioId);
  });

  it('sin sesión devuelve noAutenticado sin persistir', async () => {
    getCurrentUserIdMock.mockResolvedValue(null);

    const resultado = await crearGastoAnualIndividual({
      detalle: 'Seguro',
      importeTotal: '1200,00',
      mesPago: 6,
    });

    expect(resultado).toEqual({ ok: false, error: authErrores.noAutenticado });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('deriva el dueño de la sesión y calcula el ciclo inicial', async () => {
    createMock.mockResolvedValue(gastoFuturo());

    const resultado = await crearGastoAnualIndividual({
      detalle: 'Seguro',
      importeTotal: '1200,00',
      mesPago: 6,
    });

    expect(resultado.ok).toBe(true);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        // El dueño NUNCA viene del payload: sale de la sesión.
        usuarioId,
        detalle: 'Seguro',
        importeTotal: 120000,
        mesPago: 6,
      }),
    );
    expect(createMock.mock.calls[0][0].anioCiclo).toBeTypeOf('number');
  });

  it('rechaza un usuarioId enviado por el cliente (frontera de privacidad)', async () => {
    const resultado = await crearGastoAnualIndividual({
      detalle: 'Seguro',
      importeTotal: '1200,00',
      mesPago: 6,
      usuarioId: otroUsuarioId,
    });

    expect(resultado).toEqual({
      ok: false,
      error: individualErrores.campoNoPermitido,
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('audita con la entidad propia del área individual', async () => {
    createMock.mockResolvedValue(gastoFuturo());

    await crearGastoAnualIndividual({
      detalle: 'Seguro',
      importeTotal: '1200,00',
      mesPago: 6,
    });

    expect(auditarMovimientoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioId,
        entidad: 'gastos_anuales_individuales',
        entidadId: gastoId,
        accion: 'crear',
      }),
    );
  });

  it('revalida solo el árbol del área individual', async () => {
    createMock.mockResolvedValue(gastoFuturo());

    await crearGastoAnualIndividual({
      detalle: 'Seguro',
      importeTotal: '1200,00',
      mesPago: 6,
    });

    const rutas = revalidatePathMock.mock.calls.map((c) => c[0]);
    expect(rutas.every((r: string) => r.startsWith('/individual'))).toBe(true);
  });
});

describe('editarGastoAnualIndividual (inmutabilidad por devengo)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserIdMock.mockResolvedValue(usuarioId);
  });

  it('busca por (usuario de sesión, id): nunca solo por id', async () => {
    findByIdMock.mockResolvedValue(gastoFuturo());
    updateMock.mockResolvedValue(gastoFuturo({ detalle: 'Nuevo' }));

    await editarGastoAnualIndividual({ id: gastoId, detalle: 'Nuevo' });

    // El primer argumento del repositorio es el dueño. Si algún día se
    // cambiara el orden, este test lo detecta antes de que haya una fuga.
    expect(findByIdMock).toHaveBeenCalledWith(usuarioId, gastoId);
    expect(updateMock).toHaveBeenCalledWith(
      usuarioId,
      gastoId,
      expect.objectContaining({ detalle: 'Nuevo' }),
    );
  });

  it('un id ajeno se responde "no encontrado", sin distinguirlo de inexistente', async () => {
    // El repositorio filtra por dueño: un id de otra persona devuelve null.
    findByIdMock.mockResolvedValue(null);

    const resultado = await editarGastoAnualIndividual({
      id: gastoId,
      detalle: 'Intrusión',
    });

    expect(resultado).toEqual({
      ok: false,
      error: gastosAnualesErrores.gastoAnualNoEncontrada,
    });
    expect(updateMock).not.toHaveBeenCalled();
    // Y no se filtra si el registro existe: mismo error que si no existiera.
    expect(auditarMovimientoMock).not.toHaveBeenCalled();
  });

  it('bloquea la edición si el gasto ya devengó, aunque el cliente no lo sepa', async () => {
    findByIdMock.mockResolvedValue(gastoDevengado());

    const resultado = await editarGastoAnualIndividual({
      id: gastoId,
      importeTotal: '99,99',
    });

    // Guard de servidor: la UI puede estar deshabilitada, el endpoint no.
    expect(resultado).toEqual({
      ok: false,
      error: gastosAnualesErrores.devengoPrevio,
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('rechaza un usuarioId enviado por el cliente', async () => {
    const resultado = await editarGastoAnualIndividual({
      id: gastoId,
      detalle: 'Nuevo',
      usuarioId: otroUsuarioId,
    });

    expect(resultado).toEqual({
      ok: false,
      error: individualErrores.campoNoPermitido,
    });
    expect(findByIdMock).not.toHaveBeenCalled();
  });
});

describe('eliminarGastoAnualIndividual', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserIdMock.mockResolvedValue(usuarioId);
  });

  it('elimina por (usuario, id) y audita el valor anterior', async () => {
    findByIdMock.mockResolvedValue(gastoFuturo());

    const resultado = await eliminarGastoAnualIndividual({ id: gastoId });

    expect(resultado).toEqual({ ok: true, data: undefined });
    expect(deleteMock).toHaveBeenCalledWith(usuarioId, gastoId);

    const auditoria = auditarMovimientoMock.mock.calls[0][0];
    expect(auditoria).toEqual(
      expect.objectContaining({
        usuarioId,
        entidad: 'gastos_anuales_individuales',
        entidadId: gastoId,
        accion: 'eliminar',
      }),
    );
    // Un borrado se puede deshacer en el log: se guarda el estado anterior y NO
    // hay estado nuevo. `devengoPrevio` viaja dentro del valor anterior para que
    // el log explains por qué el borrado era legal.
    expect(auditoria.valorAnterior).toEqual(
      expect.objectContaining({ id: gastoId, devengoPrevio: false }),
    );
    expect(auditoria.valorNuevo).toBeUndefined();
  });

  it('no borra un gasto ya devengado', async () => {
    findByIdMock.mockResolvedValue(gastoDevengado());

    const resultado = await eliminarGastoAnualIndividual({ id: gastoId });

    expect(resultado).toEqual({
      ok: false,
      error: gastosAnualesErrores.devengoPrevio,
    });
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('un id ajeno no se borra', async () => {
    findByIdMock.mockResolvedValue(null);

    const resultado = await eliminarGastoAnualIndividual({ id: gastoId });

    expect(resultado).toEqual({
      ok: false,
      error: gastosAnualesErrores.gastoAnualNoEncontrada,
    });
    expect(deleteMock).not.toHaveBeenCalled();
  });
});

describe('marcarPagadoGastoAnualIndividual (el año lo decide el servidor)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserIdMock.mockResolvedValue(usuarioId);
  });

  it('avanza el ciclo en el servidor, sin aceptar el año del cliente', async () => {
    const existente = gastoFuturo();
    findByIdMock.mockResolvedValue(existente);
    registrarPagoMock.mockResolvedValue(
      gastoFuturo({ anioCiclo: existente.anioCiclo + 1 }),
    );

    const resultado = await marcarPagadoGastoAnualIndividual({ id: gastoId });

    expect(resultado.ok).toBe(true);
    // El ciclo avanza +1 calculado aquí, no en el navegador.
    expect(registrarPagoMock).toHaveBeenCalledWith(
      usuarioId,
      gastoId,
      existente.anioCiclo + 1,
      expect.any(Date),
    );
  });

  it('rechaza un anioCiclo enviado por el cliente', async () => {
    const resultado = await marcarPagadoGastoAnualIndividual({
      id: gastoId,
      anioCiclo: 2030,
    });

    expect(resultado).toEqual({
      ok: false,
      error: individualErrores.campoNoPermitido,
    });
    expect(registrarPagoMock).not.toHaveBeenCalled();
  });

  it('no cobra dos veces el mismo ciclo', async () => {
    // Ya devengado Y con fecha de último pago en este ciclo: segundo intento.
    const pago = new Date();
    pago.setDate(15);
    findByIdMock.mockResolvedValue(
      gastoDevengado({ fechaUltimoPago: pago }),
    );

    const resultado = await marcarPagadoGastoAnualIndividual({ id: gastoId });

    expect(resultado).toEqual({
      ok: false,
      error: gastosAnualesErrores.gastoAnualYaPagado,
    });
    expect(registrarPagoMock).not.toHaveBeenCalled();
  });

  it('un id ajeno no se cobra', async () => {
    findByIdMock.mockResolvedValue(null);

    const resultado = await marcarPagadoGastoAnualIndividual({ id: gastoId });

    expect(resultado).toEqual({
      ok: false,
      error: gastosAnualesErrores.gastoAnualNoEncontrada,
    });
    expect(registrarPagoMock).not.toHaveBeenCalled();
  });
});
