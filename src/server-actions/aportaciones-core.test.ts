import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aportacionErrores } from '@/literals';

// Núcleo de persistencia extraído de las acciones conjuntas (D4): un único
// camino fijar/guardar + recálculo reactivo + auditoría, compartido por las
// acciones conjuntas (wrappers delgados) y las individuales (dueño = sesión).
// Estos tests fijan por contrato el flujo que hoy ejecutan fijarSueldo y
// fijarPorcentaje, para garantizar que la extracción es byte-identical.
const { repos, auditarMovimiento } = vi.hoisted(() => ({
  repos: {
    aportacionRepository: {
      findByMesAndUsuario: vi.fn(),
      update: vi.fn(),
      createSiNoExiste: vi.fn(),
      findByMes: vi.fn(),
      fijarImporteAportadoSiNulo: vi.fn(),
    },
    mesRepository: {
      findById: vi.fn(),
      fijarPorcentajeSiNulo: vi.fn(),
    },
  },
  auditarMovimiento: vi.fn(),
}));

vi.mock('./repositories', () => repos);
vi.mock('@/infrastructure/audit/auditarMovimiento', () => ({ auditarMovimiento }));

import { fijarSueldoCore, fijarPorcentajeCore } from './aportaciones-core';

const mes = (porcentaje: number | null) => ({
  id: 'm1',
  anio: 2026,
  mes: 9,
  porcentaje,
  porcentajeFijadoPor: porcentaje != null ? 'u1' : null,
  porcentajeFechaRegistro: porcentaje != null ? new Date() : null,
  presupuesto: null,
  presupuestoFijadoPor: null,
  presupuestoFechaRegistro: null,
  fechaApertura: new Date(),
});

const aportacion = (id: string, usuarioId: string, sueldo: number) => ({
  id,
  mesId: 'm1',
  usuarioId,
  sueldo,
  importeAportado: null,
  fechaRegistro: new Date(),
});

describe('fijarSueldoCore (flujo actual de fijarSueldo, extraído)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rechaza cuando el sueldo ya está fijado (inmutabilidad §5.2) sin recalcular ni auditar', async () => {
    repos.aportacionRepository.findByMesAndUsuario.mockResolvedValue(
      aportacion('a1', 'u1', 200000),
    );

    const resultado = await fijarSueldoCore('actor', 'u1', {
      mesId: 'm1',
      sueldo: 999,
    });

    expect(resultado).toEqual({
      ok: false,
      error: aportacionErrores.sueldoYaFijado,
    });
    expect(repos.mesRepository.findById).not.toHaveBeenCalled();
    expect(auditarMovimiento).not.toHaveBeenCalled();
  });

  it('crea la aportación, recalcula importe_aportado con el % del mes y audita como crear', async () => {
    repos.aportacionRepository.findByMesAndUsuario.mockResolvedValue(null);
    repos.aportacionRepository.createSiNoExiste.mockResolvedValue(
      aportacion('a2', 'u1', 200000),
    );
    repos.mesRepository.findById.mockResolvedValue(mes(70));
    repos.aportacionRepository.fijarImporteAportadoSiNulo.mockResolvedValue({
      ...aportacion('a2', 'u1', 200000),
      importeAportado: 140000,
    });

    const resultado = await fijarSueldoCore('actor', 'u1', {
      mesId: 'm1',
      sueldo: 200000,
    });

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      // Recalculado con el % conjunto directamente (sin inversión en este flujo).
      expect(resultado.data.importeAportado).toBe(140000);
      expect(
        repos.aportacionRepository.createSiNoExiste,
      ).toHaveBeenCalledWith({
        mesId: 'm1',
        usuarioId: 'u1',
        sueldo: 200000,
        importeAportado: null,
      });
      expect(
        repos.aportacionRepository.fijarImporteAportadoSiNulo,
      ).toHaveBeenCalledWith('a2', 140000);
      expect(auditarMovimiento).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: 'actor',
          entidad: 'aportaciones',
          entidadId: 'a2',
          accion: 'crear',
        }),
      );
    }
  });

  it('sin porcentaje fijado en el mes no recalcula (importe_aportado queda null)', async () => {
    repos.aportacionRepository.findByMesAndUsuario.mockResolvedValue(null);
    repos.aportacionRepository.createSiNoExiste.mockResolvedValue(
      aportacion('a3', 'u1', 200000),
    );
    repos.mesRepository.findById.mockResolvedValue(mes(null));

    const resultado = await fijarSueldoCore('actor', 'u1', {
      mesId: 'm1',
      sueldo: 200000,
    });

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.data.importeAportado).toBeNull();
    }
    expect(
      repos.aportacionRepository.fijarImporteAportadoSiNulo,
    ).not.toHaveBeenCalled();
  });
});

describe('fijarPorcentajeCore (flujo actual de fijarPorcentaje, extraído)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fija el % con el actor, recalcula TODAS las aportaciones y audita como editar', async () => {
    repos.mesRepository.findById.mockResolvedValue(mes(null));
    repos.mesRepository.fijarPorcentajeSiNulo.mockResolvedValue(mes(30));
    repos.aportacionRepository.findByMes.mockResolvedValue([
      aportacion('a1', 'u1', 200000),
      aportacion('a2', 'u2', 100000),
    ]);
    repos.aportacionRepository.fijarImporteAportadoSiNulo.mockImplementation(
      async (id: string, importe: number) => ({ ...aportacion(id, 'u', 0), importeAportado: importe }),
    );

    const resultado = await fijarPorcentajeCore('actor', 'm1', 30);

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.data.porcentaje).toBe(30);
    }
    expect(repos.mesRepository.fijarPorcentajeSiNulo).toHaveBeenCalledWith(
      'm1',
      30,
      'actor',
    );
    // 200000 × 30 % = 60000; 100000 × 30 % = 30000 (recalculo reactivo §5.3).
    expect(
      repos.aportacionRepository.fijarImporteAportadoSiNulo,
    ).toHaveBeenCalledTimes(2);
    expect(
      repos.aportacionRepository.fijarImporteAportadoSiNulo,
    ).toHaveBeenCalledWith('a1', 60000);
    expect(
      repos.aportacionRepository.fijarImporteAportadoSiNulo,
    ).toHaveBeenCalledWith('a2', 30000);
    expect(auditarMovimiento).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioId: 'actor',
        entidad: 'meses',
        entidadId: 'm1',
        accion: 'editar',
      }),
    );
  });

  it('devuelve porcentajeYaFijado cuando SiNulo retorna null (carrera) sin recalcular ni auditar', async () => {
    repos.mesRepository.findById.mockResolvedValue(mes(30));
    repos.mesRepository.fijarPorcentajeSiNulo.mockResolvedValue(null);

    const resultado = await fijarPorcentajeCore('actor', 'm1', 30);

    expect(resultado).toEqual({
      ok: false,
      error: aportacionErrores.porcentajeYaFijado,
    });
    expect(repos.aportacionRepository.findByMes).not.toHaveBeenCalled();
    expect(auditarMovimiento).not.toHaveBeenCalled();
  });

  it('rechaza cuando el mes no existe (aportacionErrores.mesNoEncontrado)', async () => {
    repos.mesRepository.findById.mockResolvedValue(null);

    const resultado = await fijarPorcentajeCore('actor', 'm1', 30);

    expect(resultado).toEqual({
      ok: false,
      error: aportacionErrores.mesNoEncontrado,
    });
    expect(repos.mesRepository.fijarPorcentajeSiNulo).not.toHaveBeenCalled();
  });
});