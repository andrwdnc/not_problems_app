import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, id, ...props }: InputProps) {
  return (
    <label className="block">
      {label ? (
        <span className="mb-1 block text-sm font-medium text-brand-muted">
          {label}
        </span>
      ) : null}
      <input
        id={id}
        className={cn(
          'w-full rounded-xl border border-brand-border bg-brand-surface px-4 py-3 text-base text-brand-ink outline-none transition-colors placeholder:text-brand-muted/60 focus:border-brand-primary',
          className,
        )}
        {...props}
      />
    </label>
  );
}