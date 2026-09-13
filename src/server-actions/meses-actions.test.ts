import { describe, it, expect, vi, beforeEach } from 'vitest';

// La duplicación usa las reglas PURAS reales de GastosRecurrentes; solo se
// mockean los límites con I/O (repositorios y auditoría).
const {
  findOrCreateMock,
  findRecurrentesDeMesMock,
  gastoCreateMock,
  findPropietariosConRecurrentesMock,
  findRecurrentesDeMesPorUsuarioMock,
  gastoIndividualCreateMock,
  auditarMovimientoMock,
} = vi.hoisted(() => ({
  findOrCreateMock: vi.fn(),
  findRecurrentesDeMesMock: vi.fn(),
  gastoCreateMock: vi.fn(),
  findPropietariosConRecurrentesMock: vi.fn(),
  findRecurrentesDeMesPorUsuarioMock: vi.fn(),
  gastoIndividualCreateMock: vi.fn(),
  auditarMovimientoMock: vi.fn(),
}));

vi.mock('./repositories', () => ({
  mesRepository: { findOrCreate: findOrCreateMock },
  gastoRepository: {
    findRecurrentesDeMes: findRecurrentesDeMesMock,
    create: gastoCreateMock,
  },
  gastoIndividualRepository: {
    findPropietariosConRecurrentes: findPropietariosConRecurrentesMock,
    findRecurrentesDeMesPorUsuario: findRecurrentesDeMesPorUsuarioMock,
    create: gastoIndividualCreateMock,
  },
}));
vi.mock('@/infrastructure/audit/auditarMovimiento', () => ({
  auditarMovimiento: auditarMovimientoMock,
}));

import { generarMesAutomático } from './meses-actions';
import type { Gasto, GastoIndividual } from '@/domain/entities';

const gastoConjunto = {
  id: 'cg1',
  mesId: 'mes-previo',
  categoria: 'Vivienda',
  detalle: 'Alquiler',
  importe: 50000,
  fechaGasto: '2026-08-01',
  esRecurrente: true,
  gastoRecurrenteOrigenId: null,
  creadoPor: 'u1',
} as Gasto;

const gastoIndividualU2 = {
  id: 'ci1',
  mesId: 'mes-previo',
  usuarioId: 'u2',
  categoria: 'Ocio',
  detalle: 'Cuota gimnasio',
  importe: 3000,
  fechaGasto: '2026-08-15',
  esRecurrente: true,
  gastoRecurrenteOrigenId: null,
  creadoPor: 'u2',
} as GastoIndividual;

describe('generarMesAutomático — duplicación de recurrentes individuales (IA-3 Recurrent)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('al crear el mes, duplica los recurrentes de CADA propietario, no solo del creador', async () => {
    findOrCreateMock.mockResolvedValue({ mes: { id: 'mes-nuevo', anio: 2026, mes: 9 }, creado: true });
    findRecurrentesDeMesMock.mockResolvedValue([gastoConjunto]);
    gastoCreateMock.mockResolvedValue({ ...gastoConjunto, id: 'cg2', mesId: 'mes-nuevo', fechaGasto: '2026-09-01' });
    // A (creador) y B (ajeno al mes) tienen recurrentes individuales.
    findPropietariosConRecurrentesMock.mockResolvedValue([
      { usuarioId: 'u1' },
      { usuarioId: 'u2' },
    ]);
    findRecurrentesDeMesPorUsuarioMock
      .mockResolvedValueOnce([{ ...gastoIndividualU2, usuarioId: 'u1', id: 'ci-u1', creadoPor: 'u1' }])
      .mockResolvedValueOnce([gastoIndividualU2]);
    gastoIndividualCreateMock.mockImplementation(
      (data: Omit<GastoIndividual, 'id' | 'fechaCreacion'>) =>
        Promise.resolve({ id: `nuevo-${data.gastoRecurrenteOrigenId}`, ...data }),
    );

    const mes = await generarMesAutomático(2026, 9, 'mes-previo', 'u1');

    expect(mes.id).toBe('mes-nuevo');
    // B (u2) conserva SU gasto individual: dueño y creador intactos, mes nuevo,
    // cadena de origen, y fecha desplazada al día 15 de septiembre.
    expect(gastoIndividualCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mesId: 'mes-nuevo',
        usuarioId: 'u2',
        creadoPor: 'u2',
        importe: 3000,
        gastoRecurrenteOrigenId: 'ci1',
        fechaGasto: '2026-09-15',
        esRecurrente: true,
      }),
    );
    // El duplicado de u1 también se crea.
    expect(gastoIndividualCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: 'u1', gastoRecurrenteOrigenId: 'ci-u1' }),
    );
    // Tanto el recurrente conjunto como cada individual se auditan.
    expect(auditarMovimientoMock).toHaveBeenCalledWith(
      expect.objectContaining({ entidad: 'gastos_individuales', accion: 'crear' }),
    );
    expect(auditarMovimientoMock).toHaveBeenCalledWith(
      expect.objectContaining({ entidad: 'gastos', accion: 'crear' }),
    );
  });

  it('un propietario sin recurrentes individuales no provoca duplicados', async () => {
    findOrCreateMock.mockResolvedValue({ mes: { id: 'mes-nuevo', anio: 2026, mes: 9 }, creado: true });
    findRecurrentesDeMesMock.mockResolvedValue([]);
    findPropietariosConRecurrentesMock.mockResolvedValue([{ usuarioId: 'u1' }]);
    findRecurrentesDeMesPorUsuarioMock.mockResolvedValue([]);

    await generarMesAutomático(2026, 9, 'mes-previo', 'u1');

    expect(gastoIndividualCreateMock).not.toHaveBeenCalled();
  });

  it('si el mes ya existía (otro worker lo creó) no duplica nada', async () => {
    findOrCreateMock.mockResolvedValue({ mes: { id: 'mes-existente', anio: 2026, mes: 9 }, creado: false });

    const mes = await generarMesAutomático(2026, 9, 'mes-previo', 'u1');

    expect(mes.id).toBe('mes-existente');
    expect(findRecurrentesDeMesMock).not.toHaveBeenCalled();
    expect(findPropietariosConRecurrentesMock).not.toHaveBeenCalled();
    expect(auditarMovimientoMock).not.toHaveBeenCalled();
  });
});