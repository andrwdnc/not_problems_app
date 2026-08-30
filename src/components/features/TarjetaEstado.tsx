import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters/currency';

type Variante = 'aportado' | 'gastado' | 'disponible';

interface TarjetaEstadoProps {
  variante: Variante;
  etiqueta: string;
  importe: number;
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
};

export function TarjetaEstado({
  variante,
  etiqueta,
  importe,
}: TarjetaEstadoProps) {
  const estilo = estilos[variante];
  return (
    <div
      className={cn(
        'flex-1 rounded-2xl border px-4 py-3',
        estilo.fondo,
        estilo.borde,
      )}
    >
      <p className="text-xs font-medium text-brand-muted">{etiqueta}</p>
      <p className={cn('mt-1 font-mono text-xl font-bold tabular-nums', estilo.texto)}>
        {formatCurrency(importe)}
      </p>
    </div>
  );
}