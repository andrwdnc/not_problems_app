import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/formatters/currency';
import { nombreMes } from '@/lib/formatters/date';
import { historico as literalesHistorico, formatos } from '@/literals';
import type {
  TarjetaMesHistoricoVista,
  VarianteColumna,
} from '@/components/features/vista-historico';

/**
 * Tarjeta de un mes en la pantalla de Histórico. UNA para las dos áreas de
 * cuenta.
 *
 * Como `InicioResumen`, es deliberadamente tonto: recibe el modelo de vista ya
 * construido y solo lo pinta. Las dos áreas llaman a este MISMO componente con
 * modelos distintos, así que la retícula de cuatro columnas, el badge de estado y
 * el color de cada cifra no pueden divergir por accidente.
 *
 * El estado del mes llega YA resuelto desde la regla pura `VentanaEdicionGastos`:
 * aquí solo se traduce a rótulo y color con las tablas `ESTADOS` y `TONOS`.
 * Añadir un estado o una variante nueva es añadir una fila, no tocar el JSX (OCP).
 *
 * No es un Client Component: solo compone y formatea.
 */
export function TarjetaMesHistorico({ vista }: { vista: TarjetaMesHistoricoVista }) {
  return (
    <Link href={vista.href} className="block">
      <Card className="transition-colors hover:border-brand-primary/40">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-brand-navy">
            {nombreMes(vista.mes)} {vista.anio}
          </h2>
          <Badge tone={ESTADOS[vista.estado].tone}>
            {ESTADOS[vista.estado].texto}
          </Badge>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {vista.columnas.map((columna) => (
            <div key={columna.etiqueta}>
              <p className="text-xs text-brand-muted">{columna.etiqueta}</p>
              {columna.variante === 'saldo' ? (
                // El saldo es la única cifra que puede ser negativa: se muestra en
                // valor absoluto y el color lo decide el signo (verde si queda
                // dinero, coral si se ha gastado de más). Normalizarlo aquí evita
                // que cada área tenga que acordarse del `Math.abs`.
                <p
                  className={`font-mono text-sm font-semibold ${
                    vista.esDeficit
                      ? 'text-financial-negative'
                      : 'text-financial-positive'
                  }`}
                >
                  {columna.valor != null
                    ? formatCurrency(Math.abs(columna.valor))
                    : formatos.vacio}
                </p>
              ) : (
                <p
                  className={`font-mono text-sm font-semibold ${TONOS[columna.variante]}`}
                >
                  {columna.valor != null
                    ? formatCurrency(columna.valor)
                    : formatos.vacio}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-end text-sm text-brand-muted">
          {literalesHistorico.verDetalle} <ChevronRight size={16} />
        </div>
      </Card>
    </Link>
  );
}

/**
 * Traducción del estado de la ventana a rótulo y color.
 *
 * `amber` para la ventana de gracia y `muted` para el mes cerrado son las mismas
 * decisiones que tomaba cada página por su cuenta antes de unificarlas.
 */
/**
 * Traducción del estado de la ventana a rótulo y color.
 *
 * El `Record` sobre `EstadoEdicion` es deliberado: si la regla pura gana un
 * estado nuevo, el typecheck falla aquí hasta que se decida qué significa en la
 * interfaz, en lugar de que caiga en el `else` y se rotule "Cerrado" por
 * defecto.
 */
const ESTADOS: Record<
  TarjetaMesHistoricoVista['estado'],
  { texto: string; tone: 'primary' | 'amber' | 'muted' }
> = {
  editable: { texto: literalesHistorico.enCurso, tone: 'primary' },
  gracia: { texto: literalesHistorico.editableHastaEl5, tone: 'amber' },
  // Mes anterior a partir del día 6: aún admite altas, así que se distingue del
  // mes cerrado. Comparte el ámbar con la ventana de gracia porque ambos son
  // "aún puedes hacer algo", cosa que el gris de "Cerrado" no dice.
  solo_altas: { texto: literalesHistorico.soloAltas, tone: 'amber' },
  congelado: { texto: literalesHistorico.cerrado, tone: 'muted' },
};

/**
 * Color de una columna que NO es el saldo.
 *
 * Es la tabla que garantiza que "gastado" sea coral y "aportado" azul en las dos
 * áreas: estaba escrito literalmente en el JSX de cada página, así que un cambio
 * de color en una de ellas era invisible hasta que alguien lo comparaba con la
 * otra.
 */
const TONOS: Record<Exclude<VarianteColumna, 'saldo'>, string> = {
  aportado: 'text-brand-primary',
  gastado: 'text-financial-negative',
  neutro: 'text-brand-navy',
};