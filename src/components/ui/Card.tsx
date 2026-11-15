import { cn } from '@/lib/utils';

export function Card({
  className,
  children,
  glass = true,
}: {
  className?: string;
  children: React.ReactNode;
  glass?: boolean;
}) {
  return (
    <div
      className={cn(
        glass
          ? 'glass rounded-3xl p-6'
          : 'rounded-3xl bg-brand-surface p-6 border border-brand-border',
        className,
      )}
    >
      {children}
    </div>
  );
}
