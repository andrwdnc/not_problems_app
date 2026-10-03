import Link from 'next/link';
import { ChevronLeft, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/formatters/currency';
import { formatos } from '@/literals';
import { GastoMesAcciones } from '@/components/features/GastoMesAcciones';
import type {
  CartaDetalleMesVista,
  DetalleMesVista,
} from '@/components/features/vista-detalle-mes';
import type { TonoCartaDetalle } from '@/components/features/vista-detalle-mes';

/**
 * PANTALLA DE DETALLE DE MES. Un solo componente para las dos cuentas.
 *
 * Antes eran dos archivos de ~90 líneas idénticas que cambiaban en cuatro rótulos
 * y en el prefijo del enlace de vuelta. Aquí no hay `variante` en el markup: la
 * única diferencia entre las dos cuentas —la ruta a la que van editar/eliminar—
 * viaja DENTRO del modelo de vista (`variante`), porque en las rutas es lo único
 * que cambia. La retícula de cifras, la lista de gastos, el badge de recurrente
 * y la regla de color tienen una sola implementación por definición.
 *
 * No consulta nada y no calcula importes: recibe el modelo de vista ya derivado
 * (`derivarDetalleMesVista`), que es una función pura testeable.
 */

/** Color de la cifra según su semántica. `financial.*` está reservado a dinero. */
const CLASES_TONO: Record<TonoCartaDetalle, string> = {
  aportado: 'text-brand-primary',
  gastado: 'text-financial-negative',
  neutro: 'text-brand-navy',
  saldo: 'text-financial-positive',
};

function Carta({ carta }: { carta: CartaDetalleMesVista }) {
  // Sin dato (importe aún no fijado) se pinta el marcador en gris: un 0 € en
  // coral o en verde mentiría sobre si el valor existe o vale cero.
  if (carta.valor == null) {
    return (
      <Card className="w-40 shrink-0">
        <p className="text-xs text-brand-muted">{carta.etiqueta}</p>
        <p className="font-mono text-lg font-bold text-brand-muted">{formatos.vacio}</p>
      </Card>
    );
  }

  // El saldo es la única cifra que puede ser negativa; con `absoluto` el color y
  // el rótulo ("Déficit") cuentan el signo y la cifra lo enseña limpio.
  const saldoNegativo = carta.tono === 'saldo' && carta.valor < 0;
  const tono = saldoNegativo ? 'text-financial-negative' : CLASES_TONO[carta.tono];

  return (
    <Card className="w-40 shrink-0">
      <p className="text-xs text-brand-muted">{carta.etiqueta}</p>
      <p className={`font-mono text-lg font-bold ${tono}`}>
        {formatCurrency(carta.absoluto ? Math.abs(carta.valor) : carta.valor)}
      </p>
    </Card>
  );
}

export function PantallaDetalleMes({ vista }: { vista: DetalleMesVista }) {
  return (
    <>
      <div className="flex items-center gap-2">
        <Link href={vista.hrefVolver} className="text-brand-muted">
          <ChevronLeft />
        </Link>
        <h1 className="text-xl font-bold text-brand-navy">{vista.titulo}</h1>
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {vista.cartas.map((carta) => (
          <Carta key={carta.etiqueta} carta={carta} />
        ))}
      </div>

      {vista.gastos.length === 0 ? (
        <Card>
          <p className="text-sm text-brand-muted">{vista.sinGastos}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {vista.gastos.map((g) => (
            <Card key={g.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-brand-ink">
                    {g.detalle}
                  </p>
                  <p className="text-xs text-brand-muted">
                    {g.categoria} · {g.fecha}
                  </p>
                  {g.esRecurrente && (
                    <Badge tone="primary" className="mt-1">
                      <RotateCcw size={11} /> {vista.recurrente}
                    </Badge>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-mono text-sm font-semibold text-financial-negative">
                    {formatCurrency(g.importe)}
                  </span>
                  <GastoMesAcciones
                    gastoId={g.id}
                    puedeEditar={vista.puedeEditar}
                    puedeEliminar={vista.puedeEliminar}
                    variante={vista.variante}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}