import { readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Guarda de paridad de componentes entre las dos áreas de cuenta.
 *
 * Las áreas conjunta (`src/app/(dashboard)`) e individual (`src/app/individual`)
 * son dos navegaciones que ofrecen el mismo producto. Cada componente de
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
 * áreas importan hoy, comprobada por los tests de este mismo fichero.
 */
const COMPONENTES_COMPARTIDOS = [
  'AnilloProgreso',
  'AportarForm',
  'EditarGastoAnualForm',
  'EditarGastoForm',
  'GastoMesAcciones',
  'GastosList',
  'InicioResumen',
  'NuevoGastoAnualForm',
  'NuevoGastoForm',
  'PantallaAportar',
  'PantallaDetalleMes',
  'PantallaFormGasto',
  'PantallaFormGastoAnual',
  'PantallaGastos',
  'PantallaHistorico',
  'PantallaInicio',
  'skeletons',
  'TarjetaEstado',
  'TarjetaMesHistorico',
  'UltimosGastos',
];

/**
 * Componentes compartidos exentos de la regla. Solo deben entrar aquí casos
 * cuya omisión en una de las dos áreas sea intencionada y esté justificada.
 */
const EXENTOS: Record<string, string> = {
  // `LoginForm` y `SignupForm` viven en el flujo de autenticación, que es
  // común a las dos áreas y no se duplica.
  LoginForm: 'Autenticación: pantalla común previa a la elección de cuenta.',
  SignupForm: 'Autenticación: pantalla común previa a la elección de cuenta.',
};

/**
 * Import de un componente de `features/`, con o sin subcarpeta: los componentes
 * de pantalla viven en `features/pantallas/`.
 */
const PATRON_IMPORT = /from\s+'@\/components\/features\/([A-Za-z0-9_/]+)'/g;

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

/** Última hoja de una ruta de import (`pantallas/PantallaGastos` → `PantallaGastos`). */
function nombreComponente(rutaImport: string): string {
  const partes = rutaImport.split('/');
  return partes[partes.length - 1];
}

/** Imports de `features/` que hace un archivo. */
function importsDe(ruta: string): string[] {
  const fuente = readFileSync(ruta, 'utf8');
  // `Array.from` en vez de `for..of` sobre un iterador: el tsconfig del proyecto
  // no fija `target` (ES5 por defecto) y sin `downlevelIteration` el `for..of`
  // sobre `matchAll` no compila.
  return Array.from(fuente.matchAll(PATRON_IMPORT)).map((m) => m[1]);
}

/** Resuelve un import de `features/` a su archivo en disco, o `null`. */
function resolver(importPath: string): string | null {
  for (const ruta of [
    join(RAIZ, 'components/features', `${importPath}.tsx`),
    join(RAIZ, 'components/features', `${importPath}.ts`),
  ]) {
    try {
      if (statSync(ruta).isFile()) return ruta;
    } catch {
      // sigue probando la siguiente variante de extensión
    }
  }
  return null;
}

/**
 * Componentes de `features/` que un área usa DE VERDAD: los que importan sus
 * páginas más los que importan los componentes a los que esas páginas delegan.
 *
 * Sin este cierre transitivo el guard miente. Cuando una pantalla pasó a ser un
 * componente compartido (`pantallas/PantallaDetalleMes`), las páginas dejaron de
 * importar `GastoMesAcciones` directamente y el guard la habría dado por muerta
 * o por usada solo en un área. Un guard que solo mira el primer nivel deja de
 * proteger la paridad justo cuando las páginas empiezan a delegar, que es
 * cuando más hace falta.
 */
function componentesEnUso(raizArea: string): Set<string> {
  const usados = new Set<string>();
  const visitados = new Set<string>();

  const visitar = (dir: string) => {
    for (const ruta of archivos(dir)) {
      if (visitados.has(ruta)) continue;
      visitados.add(ruta);

      for (const importPath of importsDe(ruta)) {
        usados.add(nombreComponente(importPath));

        const destino = resolver(importPath);
        if (destino) visitar(dirname(destino));
      }
    }
  };

  visitar(raizArea);
  return usados;
}

describe('paridad de componentes entre áreas de cuenta', () => {
  const conjunta = componentesEnUso(AREA_CONJUNTA);
  const individual = componentesEnUso(AREA_INDIVIDUAL);

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
        `  ${huerfanos.join('\n  ')}\n\n` +
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