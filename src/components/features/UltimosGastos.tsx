import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/formatters/currency';
import { inicio } from '@/literals';
import { rutaGastos, type VarianteCuenta } from '@/lib/cuenta';

/**
 * Un gasto tal y como lo pinta la lista de "últimos gastos" del Inicio.
 *
 * Es una forma mínima y explícita (ISP): al Inicio no le interesa el `mesId`, ni
 * `esRecurrente`, ni el `id` de la aportación. Pedir el `Gasto` entero obligaría
 * a cada área a construir un objeto con la forma completa para que se leyera
 * tres campos.
 */
export interface GastoUltimo {
  id: string;
  detalle: string;
  categoria: string;
  /** Importe en céntimos enteros. */
  importe: number;
  /**
   * Nombre del creador, resuelto por la página.
   *
   * `undefined` = el pie de fila lo omite, porque todos los gastos son del
   * propio usuario (área individual) y repetir tu nombre en cada línea solo
   * ocupa sitio. Quien quiera conservar el marcador de "sin autor" para un id no
   * resuelto pasa `formatos.vacio` desde la página: la decisión es de quien
   * tiene los datos, no de quien solo los pinta.
   */
  creador?: string;
}

interface UltimosGastosProps {
  gastos: GastoUltimo[];
  variante: VarianteCuenta;
  /** Máximo de filas a pintar. */
  limite?: number;
  /** Rótulo del enlace "ver todos". */
  etiquetaVerTodos?: string;
  /** Texto cuando no hay gastos en el mes. */
  mensajeVacio?: string;
}

/**
 * Lista de los últimos gastos del mes en el Inicio. UNO para las dos áreas.
 *
 * Igual que `InicioResumen`, es tonto a propósito: recibe las filas ya
 * recortadas y ordenadas y las pinta. El recorte lo hace la página, que es la
 * única que sabe qué repositorio y qué mes abierto usar.
 *
 * El enlace "ver todos" se construye con `rutaGastos(variante)`: en el área
 * conjunta lleva a `/gastos` y en la individual a `/individual/gastos`. Es la
 * única diferencia de navegación entre las dos pantallas, y se resuelve en una
 * línea en lugar de duplicar el componente.
 */
export function UltimosGastos({
  gastos,
  variante,
  limite = 3,
  etiquetaVerTodos = inicio.verTodos,
  mensajeVacio = inicio.sinGastosMes,
}: UltimosGastosProps) {
  const visibles = gastos.slice(0, limite);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold text-brand-navy">
          {inicio.ultimosGastos}
        </h2>
        <Link
          href={rutaGastos(variante)}
          className="text-sm font-medium text-brand-primary"
        >
          {etiquetaVerTodos}
        </Link>
      </div>

      {visibles.length === 0 ? (
        <Card>
          <p className="text-sm text-brand-muted">{mensajeVacio}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {visibles.map((g) => (
            <Card
              key={g.id}
              className="flex min-w-0 items-center justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-brand-ink">
                  {g.detalle}
                </p>
                <p className="text-xs text-brand-muted">
                  {g.creador != null
                    ? `${g.categoria} · ${g.creador}`
                    : g.categoria}
                </p>
              </div>
              {/* Importes en monoespaciada: alineación y legibilidad de las cifras. */}
              <span className="ml-4 shrink-0 font-mono text-sm font-semibold text-financial-negative">
                {formatCurrency(g.importe)}
              </span>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
