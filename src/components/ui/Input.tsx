import { cn } from '@/lib/utils';

export function Input({
  label,
  className,
  id,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-brand-muted" htmlFor={id}>
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          'w-full max-w-full min-w-0 rounded-2xl border border-brand-border/60 bg-white/70 px-4 py-3.5 text-base text-brand-ink outline-none backdrop-blur-sm transition-all duration-200 placeholder:text-brand-ink/40 focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/20',
          className,
        )}
        {...props}
      />
    </div>
  );
}
