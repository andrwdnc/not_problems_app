import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aportacionErrores, authErrores, gastosErrores, individualErrores } from '@/literals';

// Núcleo de los tests: las acciones individuales orquestan (sesión -> esquema
// -> reglas/repositorio -> auditoría -> revalidación). Los límites con I/O se
// mockean; las reglas puras (ventana, inversión X->100-X) se ejecutan REALES.
const {
  getCurrentUserIdMock,
  sueldoCoreMock,
  porcentajeCoreMock,
  findOrCreateMock,
  mesFindByIdMock,
  gastoIndividualFindByIdMock,
  gastoIndividualCreateMock,
  gastoIndividualUpdateMock,
  gastoIndividualDeleteMock,
  presupuestoFindByMesMock,
  presupuestoFijarSiNoExisteMock,
  auditarMovimientoMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  getCurrentUserIdMock: vi.fn(),
  sueldoCoreMock: vi.fn(),
  porcentajeCoreMock: vi.fn(),
  findOrCreateMock: vi.fn(),
  mesFindByIdMock: vi.fn(),
  gastoIndividualFindByIdMock: vi.fn(),
  gastoIndividualCreateMock: vi.fn(),
  gastoIndividualUpdateMock: vi.fn(),
  gastoIndividualDeleteMock: vi.fn(),
  presupuestoFindByMesMock: vi.fn(),
  presupuestoFijarSiNoExisteMock: vi.fn(),
  auditarMovimientoMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock('@/server/auth', () => ({ getCurrentUserId: getCurrentUserIdMock }));
vi.mock('@/infrastructure/audit/auditarMovimiento', () => ({
  auditarMovimiento: auditarMovimientoMock,
}));
vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }));
vi.mock('./aportaciones-core', () => ({
  fijarSueldoCore: sueldoCoreMock,
  fijarPorcentajeCore: porcentajeCoreMock,
}));
vi.mock('./repositories', () => ({
  mesRepository: { findOrCreate: findOrCreateMock, findById: mesFindByIdMock },
  gastoIndividualRepository: {
    findById: gastoIndividualFindByIdMock,
    create: gastoIndividualCreateMock,
    update: gastoIndividualUpdateMock,
    delete: gastoIndividualDeleteMock,
  },
  presupuestoIndividualRepository: {
    findByMes: presupuestoFindByMesMock,
    fijarSiNoExiste: presupuestoFijarSiNoExisteMock,
  },
}));

import {
  crearGastoIndividual,
  editarGastoIndividual,
  fijarSueldoIndividual,
  fijarPorcentajeIndividual,
  fijarPresupuestoIndividual,
} from './individual-actions';

const mesId = '123e4567-e89b-12d3-a456-426614174000';

/** Fecha del día 1 del mes actual: siempre cae en la ventana editable. */
function fechaDeEsteMes(): string {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-01`;
}

const gastoValido = {
  categoria: 'Ocio',
  detalle: 'Cine',
  importe: '12,50',
  fechaGasto: fechaDeEsteMes(),
};

describe('fijarPorcentajeIndividual (IA-4, MP-1, MP-2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sin sesión devuelve noAutenticado sin persistir ni invertir', async () => {
    getCurrentUserIdMock.mockResolvedValue(null);

    const resultado = await fijarPorcentajeIndividual({ mesId, porcentaje: '30' });

    expect(resultado).toEqual({ ok: false, error: authErrores.noAutenticado });
    expect(porcentajeCoreMock).not.toHaveBeenCalled();
  });

  it('persiste el porcentaje tal cual vía el core compartido, sin invertirlo', async () => {
    getCurrentUserIdMock.mockResolvedValue('u1');
    porcentajeCoreMock.mockResolvedValue({ ok: true, data: { id: mesId, porcentaje: 30 } });

    const resultado = await fijarPorcentajeIndividual({ mesId, porcentaje: '30' });

    expect(resultado.ok).toBe(true);
    // Paridad de dominio: el área individual escribe el MISMO
    // `meses.porcentaje` que la conjunta, sin complemento 100-X ni traducción.
    expect(porcentajeCoreMock).toHaveBeenCalledWith('u1', mesId, 30);
    // Revalida el área individual y la conjunta (ambas leen % e importe_aportado).
    expect(revalidatePathMock).toHaveBeenCalledWith('/individual/aportar');
    expect(revalidatePathMock).toHaveBeenCalledWith('/aportar');
  });

  it('acepta el 100 % (mismo rango que la cuenta conjunta)', async () => {
    getCurrentUserIdMock.mockResolvedValue('u1');
    porcentajeCoreMock.mockResolvedValue({ ok: true, data: { id: mesId, porcentaje: 100 } });

    const resultado = await fijarPorcentajeIndividual({ mesId, porcentaje: '100' });

    expect(resultado.ok).toBe(true);
    expect(porcentajeCoreMock).toHaveBeenCalledWith('u1', mesId, 100);
  });

  it('X=0 es rechazado por el esquema sin llamar al core', async () => {
    getCurrentUserIdMock.mockResolvedValue('u1');

    const resultado = await fijarPorcentajeIndividual({ mesId, porcentaje: '0' });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain(aportacionErrores.porcentajePositivo);
    }
    expect(porcentajeCoreMock).not.toHaveBeenCalled();
  });
});

describe('fijarSueldoIndividual (IA-4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('el dueño del sueldo es SIEMPRE el usuario de la sesión (nunca el cliente)', async () => {
    getCurrentUserIdMock.mockResolvedValue('u1');
    sueldoCoreMock.mockResolvedValue({ ok: true, data: { id: 'a1' } });

    const resultado = await fijarSueldoIndividual({ mesId, sueldo: '2500' });

    expect(resultado.ok).toBe(true);
    // targetUsuarioId === actorId === sesión.
    expect(sueldoCoreMock).toHaveBeenCalledWith('u1', 'u1', {
      mesId,
      sueldo: 250000,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith('/individual/aportar');
  });
});

describe('crearGastoIndividual (IA-1, IA-3, AUD-1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('crea con dueño y actor = sesión y audita gastos_individuales/crear (AUD-1)', async () => {
    getCurrentUserIdMock.mockResolvedValue('u1');
    findOrCreateMock.mockResolvedValue({ mes: { id: mesId, anio: 2026, mes: 1 }, creado: false });
    gastoIndividualCreateMock.mockResolvedValue({ id: 'g1', ...gastoValido, importe: 1250 });

    const resultado = await crearGastoIndividual(gastoValido);

    expect(resultado.ok).toBe(true);
    expect(gastoIndividualCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mesId,
        usuarioId: 'u1',
        creadoPor: 'u1',
        importe: 1250,
        gastoRecurrenteOrigenId: null,
      }),
    );
    expect(auditarMovimientoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entidad: 'gastos_individuales',
        entidadId: 'g1',
        accion: 'crear',
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith('/individual/gastos');
  });

  it('rechaza un gasto en mes congelado (2+ meses atrás) sin crear (IA-3 grace)', async () => {
    getCurrentUserIdMock.mockResolvedValue('u1');
    findOrCreateMock.mockResolvedValue({ mes: { id: mesId, anio: 2020, mes: 1 }, creado: false });

    const resultado = await crearGastoIndividual({
      ...gastoValido,
      fechaGasto: '2020-01-01',
    });

    expect(resultado).toEqual({
      ok: false,
      error: gastosErrores.mesCongeladoNuevos,
    });
    expect(gastoIndividualCreateMock).not.toHaveBeenCalled();
  });

  it('sin sesión devuelve noAutenticado', async () => {
    getCurrentUserIdMock.mockResolvedValue(null);

    const resultado = await crearGastoIndividual(gastoValido);

    expect(resultado).toEqual({ ok: false, error: authErrores.noAutenticado });
    expect(gastoIndividualCreateMock).not.toHaveBeenCalled();
  });
});

describe('editarGastoIndividual (IA-1 privacidad)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('un gasto ajeno o inexistente devuelve gastoNoEncontrado sin editar (IA-1)', async () => {
    getCurrentUserIdMock.mockResolvedValue('u1');
    gastoIndividualFindByIdMock.mockResolvedValue(null);

    const resultado = await editarGastoIndividual({
      id: '123e4567-e89b-12d3-a456-426614174001',
      ...gastoValido,
    });

    expect(resultado).toEqual({
      ok: false,
      error: gastosErrores.gastoNoEncontrado,
    });
    expect(gastoIndividualUpdateMock).not.toHaveBeenCalled();
    expect(auditarMovimientoMock).not.toHaveBeenCalled();
  });
});
/**
 * Presupuesto individual: la PARIDAD con `fijarPresupuesto` de la cuenta
 * conjunta (misma acción, mismo esquema, misma inmutabilidad, misma auditoría)
 * con la diferencia del dueño, que aquí es siempre el de la sesión.
 *
 * Lo que estos tests fijan por contrato:
 * - sin sesión no se escribe nada;
 * - el presupuesto se fija UNA vez (inmutable, §5.2), también si dos peticiones
 *   llegan a la vez;
 * - el `usuarioId` sale SIEMPRE de la sesión, nunca del payload;
 * - la auditoría escribe siempre la entidad del presupuesto individual.
 */
describe('fijarPresupuestoIndividual (IA-4, paridad con la conjunta)', () => {
  const inputValido = { mesId, presupuesto: '400' };

  const presupuestoCreado = {
    id: 'p1',
    mesId,
    usuarioId: 'u1',
    presupuesto: 40000,
    fijadoPor: 'u1',
    fechaRegistro: new Date('2026-09-01T10:00:00.000Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserIdMock.mockResolvedValue('u1');
    mesFindByIdMock.mockResolvedValue({ id: mesId });
    presupuestoFindByMesMock.mockResolvedValue(null);
    presupuestoFijarSiNoExisteMock.mockResolvedValue(presupuestoCreado);
  });

  it('sin sesión devuelve noAutenticado sin escribir ni auditar', async () => {
    getCurrentUserIdMock.mockResolvedValue(null);

    const resultado = await fijarPresupuestoIndividual(inputValido);

    expect(resultado).toEqual({ ok: false, error: authErrores.noAutenticado });
    expect(presupuestoFijarSiNoExisteMock).not.toHaveBeenCalled();
    expect(auditarMovimientoMock).not.toHaveBeenCalled();
  });

  it('fija el presupuesto con el dueño de la sesión y audita la escritura', async () => {
    const resultado = await fijarPresupuestoIndividual(inputValido);

    expect(resultado).toEqual({ ok: true, data: presupuestoCreado });
    // El importe llega YA en céntimos: la conversión a enteros la hizo el
    // esquema, no la acción (misma responsabilidad que en la conjunta).
    expect(presupuestoFijarSiNoExisteMock).toHaveBeenCalledWith(
      'u1',
      mesId,
      40000,
    );
    expect(auditarMovimientoMock).toHaveBeenCalledWith({
      usuarioId: 'u1',
      entidad: 'presupuestos_individuales',
      entidadId: 'p1',
      accion: 'crear',
      valorNuevo: presupuestoCreado,
    });
  });

  it('RECHAZA un usuarioId en el payload (IA-4): el dueño no viene del cliente', async () => {
    const resultado = await fijarPresupuestoIndividual({
      ...inputValido,
      usuarioId: 'usuario-del-cliente',
    });

    expect(resultado.ok).toBe(false);
    expect(presupuestoFijarSiNoExisteMock).not.toHaveBeenCalled();
    expect(auditarMovimientoMock).not.toHaveBeenCalled();
  });

  it('rechaza un presupuesto no positivo con el literal de la conjunta', async () => {
    const resultado = await fijarPresupuestoIndividual({
      ...inputValido,
      presupuesto: '0',
    });

    expect(resultado).toEqual({
      ok: false,
      error: aportacionErrores.presupuestoPositivo,
    });
    expect(presupuestoFijarSiNoExisteMock).not.toHaveBeenCalled();
  });

  it('devuelve mesNoEncontrado si el mes no existe', async () => {
    mesFindByIdMock.mockResolvedValue(null);

    const resultado = await fijarPresupuestoIndividual(inputValido);

    expect(resultado).toEqual({
      ok: false,
      error: aportacionErrores.mesNoEncontrado,
    });
    expect(presupuestoFijarSiNoExisteMock).not.toHaveBeenCalled();
  });

  it('es INMUTABLE: si ya hay presupuesto, no lo reescribe ni lo reaudita', async () => {
    presupuestoFindByMesMock.mockResolvedValue(presupuestoCreado);

    const resultado = await fijarPresupuestoIndividual({
      ...inputValido,
      presupuesto: '999',
    });

    expect(resultado).toEqual({
      ok: false,
      error: aportacionErrores.presupuestoYaFijado,
    });
    expect(presupuestoFijarSiNoExisteMock).not.toHaveBeenCalled();
    expect(auditarMovimientoMock).not.toHaveBeenCalled();
  });

  it('si pierde la carrera del índice único, el error es el mismo "ya fijado"', async () => {
    // Dos peticiones simultáneas pasan a la vez la comprobación previa. La
    // escritura se resuelve contra el índice único (mes_id, usuario_id) y solo
    // una gana; la que pierde recibe `null` y NO debe reportarlo como un fallo
    // distinto, porque para el usuario el resultado es el mismo.
    presupuestoFijarSiNoExisteMock.mockResolvedValue(null);

    const resultado = await fijarPresupuestoIndividual(inputValido);

    expect(resultado).toEqual({
      ok: false,
      error: aportacionErrores.presupuestoYaFijado,
    });
    expect(auditarMovimientoMock).not.toHaveBeenCalled();
  });
});
