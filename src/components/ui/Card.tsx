import { cn } from '@/lib/utils';

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-brand-surface p-5 border border-brand-border',
        className,
      )}
    >
      {children}
    </div>
  );
}