import { app } from '@/literals';

/**
 * Skeletons de sección para las páginas del área conjunta. Siguen el mismo
 * lenguaje visual que el loading global del dashboard (`src/app/(dashboard)/loading.tsx`):
 * bloques `animate-pulse` con `bg-brand-pale` y `rounded-2xl`, sin introducir
 * tokens de diseño nuevos.
 */

function Pulso({ className }: { className: string }) {
  return <div className={`animate-pulse bg-brand-pale ${className}`} />;
}

export function ResumenInicioSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label={app.cargando}>
      <Pulso className="h-7 w-40 rounded-lg" />
      <Pulso className="h-44 rounded-2xl" />
      <div className="flex min-w-0 gap-3">
        <Pulso className="h-24 flex-1 rounded-2xl" />
        <Pulso className="h-24 flex-1 rounded-2xl" />
        <Pulso className="h-24 flex-1 rounded-2xl" />
      </div>
      <Pulso className="h-16 rounded-2xl" />
    </div>
  );
}

export function UltimosGastosSkeleton() {
  return (
    <div className="space-y-2" role="status" aria-label={app.cargando}>
      <Pulso className="h-5 w-32 rounded-lg" />
      <Pulso className="h-16 rounded-2xl" />
      <Pulso className="h-16 rounded-2xl" />
    </div>
  );
}

export function GastosSectionSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label={app.cargando}>
      <div className="flex gap-2">
        <Pulso className="h-9 w-20 rounded-full" />
        <Pulso className="h-9 w-24 rounded-full" />
      </div>
      <Pulso className="h-16 rounded-2xl" />
      <Pulso className="h-16 rounded-2xl" />
      <Pulso className="h-16 rounded-2xl" />
      <Pulso className="h-32 rounded-2xl" />
    </div>
  );
}

export function AportarSectionSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label={app.cargando}>
      <Pulso className="h-40 rounded-2xl" />
      <Pulso className="h-36 rounded-2xl" />
      <Pulso className="h-36 rounded-2xl" />
    </div>
  );
}

export function HistoricoSectionSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label={app.cargando}>
      <Pulso className="h-28 rounded-2xl" />
      <Pulso className="h-28 rounded-2xl" />
      <Pulso className="h-28 rounded-2xl" />
    </div>
  );
}