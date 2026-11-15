import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'ghost' | 'danger';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
  loading?: boolean;
}

const styles: Record<Variant, string> = {
  primary:
    'bg-brand-primary text-white hover:bg-brand-primary/90 shadow-lg shadow-brand-primary/25',
  ghost: 'glass text-brand-navy hover:bg-white/80',
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
        'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 hover:-translate-y-0.5 active:translate-y-0',
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
