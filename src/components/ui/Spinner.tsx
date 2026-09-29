import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { app } from '@/literals';

const PUNTOS = {
  sm: 16,
  md: 20,
  lg: 28,
} as const;

type TamanoSpinner = keyof typeof PUNTOS;

interface SpinnerProps {
  /** Diámetro del icono en píxeles. */
  size?: TamanoSpinner;
  className?: string;
  /** Texto para lectores de pantalla; por defecto `app.cargando`. */
  label?: string;
}

/**
 * Indicador de actividad giratorio, atómico y sin dependencias de estado.
 *
 * Sigue el mismo lenguaje visual que los skeletons (`animate-pulse` con
 * `bg-brand-pale`), pero para el caso en el que el usuario acaba de pulsar y la
 * operación aún no ha vuelto: sin esto el clic no produce ninguna señal y la app
 * parece no responder.
 *
 * El icono se oculta de la accesibilidad visual (`aria-hidden`) y el estado se
 * expone con `role="status"` más un texto `sr-only`, de modo que un lector de
 * pantalla anuncie la espera sin duplicar el icono.
 *
 * Hereda `currentColor`: se adapta solo al color del texto del contenedor (por
 * ejemplo, blanco sobre un botón primario) sin necesitar props de color.
 *
 * Respeta `prefers-reduced-motion`: con la preferencia activada el icono deja de
 * girar en lugar de reducir el ritmo.
 */
export function Spinner({ size = 'sm', className, label }: SpinnerProps) {
  return (
    <span role="status" className="inline-flex shrink-0 items-center">
      <Loader2
        size={PUNTOS[size]}
        strokeWidth={2.5}
        aria-hidden="true"
        className={cn('animate-spin motion-reduce:animate-none', className)}
      />
      <span className="sr-only">{label ?? app.cargando}</span>
    </span>
  );
}
