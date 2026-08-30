import { cn } from '@/lib/utils';

type Tone = 'muted' | 'positive' | 'negative' | 'amber' | 'primary';

interface BadgeProps {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}

const tones: Record<Tone, string> = {
  muted: 'bg-brand-pale text-brand-muted',
  positive: 'bg-financial-positiveBg text-financial-positive',
  negative: 'bg-financial-negativeBg text-financial-negative',
  amber: 'bg-amber-50 text-financial-amber',
  primary: 'bg-brand-primary/10 text-brand-primary',
};

export function Badge({ tone = 'muted', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}