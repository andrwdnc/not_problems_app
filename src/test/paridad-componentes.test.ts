import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Guarda de paridad de componentes entre las dos áreas de cuenta.
 *
 * Las áreas conjunta (`src/app/(dashboard)`) e individual (`src/app/individual`)
 * son dos navigaciones que ofrecen el mismo producto. Cada componente de
 * `components/features/` que usa una debe usarse también en la otra; si no, una
 * de las dos ha perdido una capacidad y nadie se entera hasta que un usuario la
 * echa de menos.
 *
 * Este test es deliberadamente DURO: añadir un componente nuevo para una sola
 * área hace fallar la suite y obliga a usarlo en la otra en el mismo commit.
 * Esa fricción es el objetivo; una lista de excepciones que crece sin resistencia
 * es exactamente el agujero que este guard cierra.
 *
 * Lo que NO se comprueba aquí: el comportamiento. Eso es responsabilidad de los
 * tests de cada componente.
 */

const RAIZ = join(process.cwd(), 'src');

const AREA_CONJUNTA = join(RAIZ, 'app/(dashboard)');
const AREA_INDIVIDUAL = join(RAIZ, 'app/individual');

/**
 * Componentes compartidos que el área conjunta usa y la individual no.
 *
 * No es una lista de "los que nos gustan": es la foto real de lo que ambas
 * áreas importan hoy, comprobada por los tests de este mismo fichero. Al
 * alcanzarlos a través de otro componente (caso de `AnilloProgreso` y
 * `TarjetaEstado`, que ahora quedan detrás de `InicioResumen`) desaparecen de
 * aquí, porque ya no es la página quien elige si una pantalla los usa.
 */
const COMPONENTES_COMPARTIDOS = [
  'AportarForm',
  'EditarGastoAnualForm',
  'EditarGastoForm',
  'GastoMesAcciones',
  'GastosList',
  'InicioResumen',
  'NuevoGastoAnualForm',
  'NuevoGastoForm',
  'skeletons',
  'TarjetaMesHistorico',
  'UltimosGastos',
];

/**
 * Componentes compartidos exentos de la regla. Solo deben entrar aquí casos
 * cuya omisión en una de las dos áreas sea intencionada y esté justificada.
 */
const EXENTOS: Record<string, string> = {
  // `LoginForm` y `SignupForm` viven en el flujo de autenticación, que es
  // común a las dos áreas y no se duplica. No se importan desde (dashboard) ni
  // desde individual, así que la regla no llega a alcanzarlos, pero se declaran
  // aquí para que añadir una tercera área no los convierta en unComponents
  // obligatorios por accidente.
  LoginForm: 'Autenticación: pantalla común previa a la elección de cuenta.',
  SignupForm: 'Autenticación: pantalla común previa a la elección de cuenta.',
};

/** Recorre un directorio y devuelve los paths de los `.tsx`/`.ts` (recursivo). */
function archivos(dir: string): string[] {
  const salida: string[] = [];
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) {
      salida.push(...archivos(ruta));
    } else if (/\.tsx?$/.test(entrada)) {
      salida.push(ruta);
    }
  }
  return salida;
}

/** Nombres de componentes de `features/` importados por un árbol de rutas. */
function componentesImportados(raiz: string): Set<string> {
  const encontrados = new Set<string>();
  const patron = /from\s+'@\/components\/features\/([A-Za-z0-9_]+)'/g;

  for (const ruta of archivos(raiz)) {
    const fuente = readFileSync(ruta, 'utf8');
    // `Array.from` en vez de `for..of` sobre un iterador: el tsconfig del proyecto
  // no fija `target` (ES5 por defecto) y sin `downlevelIteration` el `for..of`
  // sobre `matchAll` no compila.
  for (const [, nombre] of Array.from(fuente.matchAll(patron))) {
      encontrados.add(nombre);
    }
  }
  return encontrados;
}

describe('paridad de componentes entre áreas de cuenta', () => {
  const conjunta = componentesImportados(AREA_CONJUNTA);
  const individual = componentesImportados(AREA_INDIVIDUAL);

  it('las dos áreas tienen componentes que comparar (si no, el guard es inútil)', () => {
    expect(conjunta.size).toBeGreaterThan(0);
    expect(individual.size).toBeGreaterThan(0);
  });

  it('ningún componente compartido se usa solo en el área conjunta', () => {
    const huerfanos = Array.from(conjunta)
      .filter((c) => !individual.has(c))
      .filter((c) => !(c in EXENTOS))
      .sort();

    expect(
      huerfanos,
      `Estos componentes los usa solo el área conjunta:\n` +
        `  ${huerfanos.join('\n  ')}\n\n` +
        `Cada uno debería usarse también en el área individual (suavemente con ` +
        `una prop \`variante\`, o sin ella si la diferencia es de datos). Si de ` +
        `verdad no aplica, decláralo en EXENTOS con su motivo.`,
    ).toEqual([]);
  });

  it('ningún componente compartido se usa solo en el área individual', () => {
    const huerfanos = Array.from(individual)
      .filter((c) => !conjunta.has(c))
      .filter((c) => !(c in EXENTOS))
      .sort();

    expect(
      huerfanos,
      `Estos componentes los usa solo el área individual:\n` +
        `  ${huerfanos.join('\n  ')}\n` +
        `Por simetría deben existir también en la conjunta.`,
    ).toEqual([]);
  });

  it('la lista de componentes compartidos refleja el uso real', () => {
    // Detecta el caso contrario: que COMPONENTES_COMPARTIDOS se quede corto y
    // el guard deje de mirar algo que sí se usa en las dos áreas.
    const declarados = new Set(COMPONENTES_COMPARTIDOS);
    const reales = new Set(Array.from(conjunta).filter((c) => individual.has(c)));

    expect(
      Array.from(reales).filter((c) => !declarados.has(c)).sort(),
      `Componentes usados por AMBAS áreas pero ausentes de COMPONENTES_COMPARTIDOS. ` +
        `Añádelos a la lista para que el guard los vigile.`,
    ).toEqual([]);
  });

  it('ningún componente declarado está muerto (o sin usar, o exento)', () => {
    const muertos = COMPONENTES_COMPARTIDOS.filter(
      (c) => !conjunta.has(c) && !individual.has(c),
    );

    expect(
      muertos.sort(),
      `Componentes de COMPONENTES_COMPARTIDOS que no usa ninguna de las dos áreas: ` +
        `o se han borrado, o la lista está desactualizada.`,
    ).toEqual([]);
  });

  it('las excepciones son un contrato, no un cajón de sastre', () => {
    // Cada excepción debe seguir teniendo su justificación escrita: es lo que
    // hace auditable la lista en una revisión de código.
    const sinMotivo = Object.entries(EXENTOS)
      .filter(([, motivo]) => !motivo || motivo.trim().length < 20)
      .map(([nombre]) => nombre);

    expect(sinMotivo.sort()).toEqual([]);
  });
});