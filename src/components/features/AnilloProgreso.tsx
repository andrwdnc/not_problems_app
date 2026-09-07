import { cn } from '@/lib/utils';
import { resumen } from '@/literals';

interface AnilloProgresoProps {
  porcentaje: number;
  etiqueta: string;
}

export function AnilloProgreso({ porcentaje, etiqueta }: AnilloProgresoProps) {
  const radio = 84;
  const circunferencia = 2 * Math.PI * radio;
  const recortado = Math.min(Math.max(porcentaje, 0), 100);
  const superada = porcentaje > 100;
  const progreso = (recortado / 100) * circunferencia;

  return (
    <div className="relative mx-auto flex h-56 w-56 items-center justify-center">
      <svg
        viewBox="0 0 200 200"
        className="h-full w-full -rotate-90"
        role="img"
        aria-label={`${Math.round(porcentaje)}% ${superada ? resumen.superado : etiqueta}`}
      >
        <circle
          cx="100"
          cy="100"
          r={radio}
          fill="none"
          stroke="var(--color-brand-pale)"
          strokeWidth="18"
        />
        <circle
          cx="100"
          cy="100"
          r={radio}
          fill="none"
          stroke="var(--color-financial-negative)"
          strokeWidth="18"
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia - progreso}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            'font-mono text-4xl font-bold',
            superada ? 'text-financial-negative' : 'text-brand-ink',
          )}
        >
          {Math.round(porcentaje)}%
        </span>
        <span
          className={cn(
            'mt-1 text-sm',
            superada ? 'text-financial-negative' : 'text-brand-muted',
          )}
        >
          {superada ? resumen.superado : etiqueta}
        </span>
      </div>
    </div>
  );
}