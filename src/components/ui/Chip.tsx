import { cn } from '@/lib/utils';

interface ChipProps {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function Chip({ active, onClick, children, className }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-brand-primary text-white'
          : 'bg-brand-surface text-brand-muted border border-brand-border',
        className,
      )}
    >
      {children}
    </button>
  );
}