import { readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Guarda de componentes compartidos del árbol único de rutas.
 *
 * Antes las dos áreas de cuenta eran DOS navegaciones paralelas
 * (`src/app/(dashboard)` y `src/app/individual`) y este guard comparaba lo que
 * usaba cada una para detectar divergencias silenciosas. Desde que las 9 rutas
 * viven UNA sola vez bajo `src/app/(app)/[cuenta]`, la paridad de pantallas es
 * estructural (una sola copia no puede divergir) y lo que queda vigilado son
 * dos cosas:
 *
 *   1. Que el árbol de rutas siga usando DE VERDAD los componentes compartidos
 *      declarados (ninguno muerto): si una pantalla deja de renderizar uno, el
 *      guard avisa en vez de dejar el componente huérfano.
 *   2. Que las dos variantes sigan exponiendo el MISMO conjunto de vistas: eso
 *      lo fija `src/server-actions/contexto-cuenta/index.test.ts` sobre la
 *      tabla de adaptadores y los tipos `Vista*` en compilación.
 *
 * Lo que NO se comprueba aquí: el comportamiento. Eso es responsabilidad de los
 * tests de cada componente.
 */

const RAIZ = join(process.cwd(), 'src');

const ARBOL_RUTAS = join(RAIZ, 'app/(app)');

/**
 * Componentes compartidos que la app declara: todos los de `components/features/`
 * que sirven a las dos cuentas (los de pantalla, listas, formularios y vistas).
 */
const COMPONENTES_COMPARTIDOS = [
  'AnilloProgreso',
  'AportarForm',
  'EditarGastoForm',
  'GastoMesAcciones',
  'GastosList',
  'GestionPagosPrevistos',
  'InicioResumen',
  'NuevoGastoForm',
  'PagosPrevistosMes',
  'PantallaAportar',
  'PantallaDetalleMes',
  'PantallaFormGasto',
  'PantallaGastos',
  'PantallaHistorico',
  'PantallaInicio',
  'skeletons',
  'TarjetaEstado',
  'TarjetaMesHistorico',
  'UltimosGastos',
];

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
 * Componentes de `features/` que el árbol de rutas usa DE VERDAD: los que
 * importan sus páginas más los que importan los componentes a los que esas
 * páginas delegan.
 *
 * Sin este cierre transitivo el guard miente: cuando una pantalla pasa a ser un
 * componente compartido (`pantallas/PantallaDetalleMes`), las páginas dejan de
 * importar `GastoMesAcciones` directamente y el guard la daría por muerta.
 */
function componentesEnUso(raizArbol: string): Set<string> {
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

  visitar(raizArbol);
  return usados;
}

describe('componentes compartidos del árbol único de rutas', () => {
  const usados = componentesEnUso(ARBOL_RUTAS);

  it('el árbol de rutas existe y usa componentes (si no, el guard es inútil)', () => {
    expect(usados.size).toBeGreaterThan(0);
  });

  it('ningún componente compartido declarado está muerto (o sin usar, o borrado)', () => {
    const muertos = COMPONENTES_COMPARTIDOS.filter((c) => !usados.has(c));

    expect(
      muertos.sort(),
      `Componentes de COMPONENTES_COMPARTIDOS que el árbol de rutas no usa: ` +
        `o se han borrado, o una pantalla dejó de renderizarlos, o la lista está ` +
        `desactualizada.`,
    ).toEqual([]);
  });
});
