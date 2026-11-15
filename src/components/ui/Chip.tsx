import { cn } from '@/lib/utils';

export function Chip({
  active = false,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={cn(
        'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 backdrop-blur-sm',
        active
          ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20'
          : 'glass text-brand-muted hover:text-brand-ink',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
