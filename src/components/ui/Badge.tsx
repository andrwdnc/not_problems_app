import { cn } from '@/lib/utils';

type Tone = 'primary' | 'muted' | 'positive' | 'negative' | 'amber';

export function Badge({
  tone = 'muted',
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  const tones: Record<Tone, string> = {
    primary: 'bg-brand-primary/10 text-brand-primary',
    muted: 'glass text-brand-muted',
    positive: 'bg-financial-positive/10 text-financial-positive',
    negative: 'bg-financial-negative/10 text-financial-negative',
    amber: 'bg-financial-amber/10 text-financial-amber',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold backdrop-blur-sm',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
