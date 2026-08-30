interface AnilloProgresoProps {
  porcentaje: number;
}

export function AnilloProgreso({ porcentaje }: AnilloProgresoProps) {
  const radio = 84;
  const circunferencia = 2 * Math.PI * radio;
  const recortado = Math.min(Math.max(porcentaje, 0), 100);
  const progreso = (recortado / 100) * circunferencia;

  return (
    <div className="relative mx-auto flex h-56 w-56 items-center justify-center">
      <svg
        viewBox="0 0 200 200"
        className="h-full w-full -rotate-90"
        role="img"
        aria-label={`${Math.round(recortado)}% gastado`}
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
        <span className="font-mono text-4xl font-bold text-brand-ink">
          {Math.round(recortado)}%
        </span>
        <span className="mt-1 text-sm text-brand-muted">gastado</span>
      </div>
    </div>
  );
}