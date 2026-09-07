import { app } from '@/literals';

export default function DashboardLoading() {
  return (
    <div className="space-y-5" role="status" aria-label={app.cargando}>
      <div className="h-7 w-40 animate-pulse rounded-lg bg-brand-pale" />
      <div className="h-44 animate-pulse rounded-2xl bg-brand-pale" />
      <div className="flex min-w-0 gap-3">
        <div className="h-24 flex-1 animate-pulse rounded-2xl bg-brand-pale" />
        <div className="h-24 flex-1 animate-pulse rounded-2xl bg-brand-pale" />
        <div className="h-24 flex-1 animate-pulse rounded-2xl bg-brand-pale" />
      </div>
      <div className="h-16 animate-pulse rounded-2xl bg-brand-pale" />
      <div className="h-16 animate-pulse rounded-2xl bg-brand-pale" />
    </div>
  );
}