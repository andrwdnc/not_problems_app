import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'ghost' | 'danger';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
  /**
   * Estado de espera. Añade el spinner, bloquea el botón y marca `aria-busy`,
   * de modo que el usuario ve una señal inmediata tras pulsar.
   *
   * El spinner hereda `currentColor`, así que se adapta solo a cada variante sin
   * que haya que pasarle el color. El botón queda deshabilitado automáticamente:
   * no hace falta combinarlo con `disabled`, aunque seguir pasándolo es inofensivo.
   */
  loading?: boolean;
}

const styles: Record<Variant, string> = {
  primary: 'bg-brand-primary text-white hover:bg-brand-primary/90',
  ghost: 'bg-brand-pale text-brand-navy hover:bg-brand-pale/70',
  danger: 'bg-financial-negative text-white hover:bg-financial-negative/90',
};

export function Button({
  variant = 'primary',
  fullWidth,
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        styles[variant],
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}