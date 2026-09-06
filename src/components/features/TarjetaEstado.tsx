import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters/currency';

type Variante = 'aportado' | 'gastado' | 'disponible' | 'presupuesto' | 'ahorro';

interface TarjetaEstadoProps {
  variante: Variante;
  etiqueta: string;
  importe: number | null;
}

const estilos: Record<
  Variante,
  { texto: string; fondo: string; borde: string }
> = {
  aportado: {
    texto: 'text-brand-primary',
    fondo: 'bg-brand-surface',
    borde: 'border-brand-border',
  },
  presupuesto: {
    texto: 'text-brand-navy',
    fondo: 'bg-brand-pale/50',
    borde: 'border-brand-border',
  },
  gastado: {
    texto: 'text-financial-negative',
    fondo: 'bg-financial-negativeBg',
    borde: 'border-financial-negative/20',
  },
  disponible: {
    texto: 'text-financial-positive',
    fondo: 'bg-financial-positiveBg',
    borde: 'border-financial-positive/20',
  },
  ahorro: {
    texto: 'text-financial-positive',
    fondo: 'bg-financial-positiveBg',
    borde: 'border-financial-positive/20',
  },
};

export function TarjetaEstado({
  variante,
  etiqueta,
  importe,
}: TarjetaEstadoProps) {
  // "Disponible" y "Ahorro" son verdes mientras haya saldo positivo; en cuanto
  // se gasta más de lo ingresado (negativo), pasan a rojo para indicar déficit.
  const esNegativo = (importe ?? 0) < 0;
  const estilo =
    (variante === 'disponible' || variante === 'ahorro') && esNegativo
      ? estilos.gastado
      : estilos[variante];

  return (
    <div
      className={cn(
        'min-w-0 flex-1 rounded-2xl border px-2 py-3 sm:px-4',
        estilo.fondo,
        estilo.borde,
      )}
    >
      <p className="truncate text-xs font-medium text-brand-muted">{etiqueta}</p>
      {importe != null ? (
        <p
          className={cn(
            'mt-1 min-w-0 break-words font-mono text-lg font-bold tabular-nums sm:text-xl',
            estilo.texto,
          )}
        >
          {formatCurrency(importe)}
        </p>
      ) : (
        <p className="mt-1 font-mono text-lg font-bold tabular-nums text-brand-muted sm:text-xl">
          —
        </p>
      )}
    </div>
  );
}