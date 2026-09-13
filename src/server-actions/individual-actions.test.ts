import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authErrores, gastosErrores, individualErrores } from '@/literals';

// Núcleo de los tests: las acciones individuales orquestan (sesión -> esquema
// -> reglas/repositorio -> auditoría -> revalidación). Los límites con I/O se
// mockean; las reglas puras (ventana, inversión X->100-X) se ejecutan REALES.
const {
  getCurrentUserIdMock,
  sueldoCoreMock,
  porcentajeCoreMock,
  findOrCreateMock,
  gastoIndividualFindByIdMock,
  gastoIndividualCreateMock,
  gastoIndividualUpdateMock,
  gastoIndividualDeleteMock,
  auditarMovimientoMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  getCurrentUserIdMock: vi.fn(),
  sueldoCoreMock: vi.fn(),
  porcentajeCoreMock: vi.fn(),
  findOrCreateMock: vi.fn(),
  gastoIndividualFindByIdMock: vi.fn(),
  gastoIndividualCreateMock: vi.fn(),
  gastoIndividualUpdateMock: vi.fn(),
  gastoIndividualDeleteMock: vi.fn(),
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
  mesRepository: { findOrCreate: findOrCreateMock },
  gastoIndividualRepository: {
    findById: gastoIndividualFindByIdMock,
    create: gastoIndividualCreateMock,
    update: gastoIndividualUpdateMock,
    delete: gastoIndividualDeleteMock,
  },
}));

import {
  crearGastoIndividual,
  editarGastoIndividual,
  fijarSueldoIndividual,
  fijarPorcentajeIndividual,
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

  it('invierte X -> joint (100 - X) una única vez y persiste vía core (MP-1)', async () => {
    getCurrentUserIdMock.mockResolvedValue('u1');
    porcentajeCoreMock.mockResolvedValue({ ok: true, data: { id: mesId, porcentaje: 70 } });

    const resultado = await fijarPorcentajeIndividual({ mesId, porcentaje: '30' });

    expect(resultado.ok).toBe(true);
    // X=30 (mío) -> joint 70 (lo que se guarda en meses.porcentaje).
    expect(porcentajeCoreMock).toHaveBeenCalledWith('u1', mesId, 70);
    // Revalida el área individual y la conjunta (ambas leen % e importe_aportado).
    expect(revalidatePathMock).toHaveBeenCalledWith('/individual/aportar');
    expect(revalidatePathMock).toHaveBeenCalledWith('/aportar');
  });

  it('X=0 es rechazado por el esquema (MP-2) sin llamar al core', async () => {
    getCurrentUserIdMock.mockResolvedValue('u1');

    const resultado = await fijarPorcentajeIndividual({ mesId, porcentaje: '0' });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain(individualErrores.porcentajeRango);
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