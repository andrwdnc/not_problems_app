import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Página de detalle de un mes del área INDIVIDUAL.
 *
 * Es la única pieza de esa pantalla que no cubre ningún test puro: el resto de la
 * cadena (`derivarResumenIndividual`, `cifrasDeResumenIndividual`,
 * `derivarCartasDetalle`) ya está probado por separado. Aquí se fija que la
 * página CARGA el presupuesto del mes y se lo pasa a la derivación. Ese wiring es
 * justo lo que faltaba: la página pasaba `null`, así que la carta "Mi
 * presupuesto" del detalle salía vacía aunque la lista del histórico —que sí lo
 * lee— lo mostrara.
 */

const getCurrentUser = vi.fn();

vi.mock('@/server/auth', () => ({
  getCurrentUser: () => getCurrentUser(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND');
  }),
}));

const MES = { id: 'm1', anio: 2026, mes: 9, porcentaje: 50, presupuesto: null };
const findByMesPresupuesto = vi.fn();

vi.mock('@/server-actions/repositories', () => ({
  mesRepository: { findById: vi.fn(async () => MES) },
  aportacionRepository: { findByMesAndUsuario: vi.fn(async () => null) },
  gastoIndividualRepository: { findByMes: vi.fn(async () => []) },
  presupuestoIndividualRepository: {
    findByMes: (...args: unknown[]) => findByMesPresupuesto(...args),
  },
  gastoAnualIndividualRepository: { findAll: vi.fn(async () => []) },
}));

// Se conserva la implementación real de la regla pura y solo se envuelve para
// poder observar con qué argumentos la llama la página.
vi.mock('@/server-actions/individual-queries', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/server-actions/individual-queries')>();
  return {
    ...actual,
    derivarResumenIndividual: vi.fn(actual.derivarResumenIndividual),
  };
});

import { derivarResumenIndividual } from '@/server-actions/individual-queries';
import HistoricoIndividualDetallePage from '@/app/individual/historico/[id]/page';

describe('detalle de mes del área individual', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockResolvedValue({ id: 'u1', username: 'ana' });
  });

  it('pasa a la derivación el presupuesto fijado del mes', async () => {
    findByMesPresupuesto.mockResolvedValue({ presupuesto: 25000 });

    await HistoricoIndividualDetallePage({ params: { id: 'm1' } });

    // El presupuesto se consulta owner-first para el usuario de la sesión.
    expect(findByMesPresupuesto).toHaveBeenCalledWith('u1', 'm1');
    expect(derivarResumenIndividual).toHaveBeenCalledTimes(1);
    // 4.º argumento = presupuesto del mes, en céntimos.
    expect(vi.mocked(derivarResumenIndividual).mock.calls[0][3]).toBe(25000);
  });

  it('sin fila de presupuesto la derivación recibe null', async () => {
    findByMesPresupuesto.mockResolvedValue(null);

    await HistoricoIndividualDetallePage({ params: { id: 'm1' } });

    expect(vi.mocked(derivarResumenIndividual).mock.calls[0][3]).toBeNull();
  });
});
