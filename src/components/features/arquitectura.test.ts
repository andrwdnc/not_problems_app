import { readdirSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Guarda de arquitectura: las dos áreas de cuenta usan los MISMOS componentes.
 *
 * La app tiene dos áreas (conjunta e individual) y una regla no negociable: un
 * componente de `components/features/` pertenece a las dos o a ninguna. Cuando
 * existían `AportarForm`/`AportarIndividualForm`, `GastosList`/`IndividualGastosList`
 * y `GastoMesAcciones`/`GastoIndividualMesAcciones`, las dos áreas divergían en
 * silencio: corregías un bug en una y la otra se quedaba rota, sin que nada
 * fallara. Estos tests son el seguro antirregresión de esa unificación.
 *
 * No se comprueba el comportamiento (eso lo hacen los tests de cada
 * componente), sino que exista UN SOLO componente por responsabilidad.
 */

/** Nombres de archivo cuyo sufijo puede contener "Individual". */
const CONTIENE_INDIVIDUAL = /individual/i;

/**
 * Componentes legítimamente fuera del alcance compartido: viven en
 * `components/ui/` o `layout/` (autenticación, navegación) y no se usan desde
 * las dos áreas de cuenta.
 *
 * Cualquier excepción nueva debe añadirse aquí CON su motivo: es una lista
 * corta y auditable a propósito, no un comodín.
 */
const EXENCIONES = new Set<string>();

const DIRECTORIO = join(process.cwd(), 'src/components/features');

const componentes = (): string[] =>
  readdirSync(DIRECTORIO)
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => f.replace(/\.tsx$/, ''));

describe('guardia de nombres de components/features', () => {
  it('el directorio existe (si no, el guard no está protegiendo nada)', () => {
    expect(componentes().length).toBeGreaterThan(0);
  });

  it('ningún componente se llama *Individual*: un componente, dos áreas', () => {
    const ofensores = componentes()
      .filter((nombre) => CONTIENE_INDIVIDUAL.test(nombre))
      .filter((nombre) => !EXENCIONES.has(nombre));

    expect(
      ofensores,
      `Componentes duplicados por área de cuenta. Un componente que solo sirve a ` +
        `una de las dos áreas rompe la paridad silenciosamente: cuando eso hace ` +
        `falta es porque el área pierde una capacidad que la otra sí tiene, o ` +
        `porque el componente ya no tiene dos consumidores y puede fusionarse.`,
    ).toEqual([]);
  });
});