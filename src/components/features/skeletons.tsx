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

/* ── Skeletons individuales (área /individual) ─────────────────────────── */

/**
 * Inicio individual: mismo esqueleto que el resumen conjunto (título + anillo +
 * 3 tarjetas + aviso), pero sin cabecera externa: el título vive dentro de la
 * sección porque depende del mes del resumen individual.
 */
export function IndividualInicioSectionSkeleton() {
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

/**
 * Lista de gastos individuales: chips de categorías + tarjetas de gasto.
 * A diferencia de GastosSectionSkeleton no hay bloque de gastos anuales.
 */
export function IndividualGastosSectionSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label={app.cargando}>
      <div className="flex gap-2">
        <Pulso className="h-9 w-20 rounded-full" />
        <Pulso className="h-9 w-24 rounded-full" />
      </div>
      <Pulso className="h-16 rounded-2xl" />
      <Pulso className="h-16 rounded-2xl" />
      <Pulso className="h-16 rounded-2xl" />
    </div>
  );
}

/**
 * Aportaciones individuales: dos tarjetas (sueldo y porcentaje) + nota final.
 */
export function IndividualAportarSectionSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label={app.cargando}>
      <Pulso className="h-40 rounded-2xl" />
      <Pulso className="h-36 rounded-2xl" />
      <Pulso className="mx-auto h-4 w-48 rounded-lg" />
    </div>
  );
}

/**
 * Detalle del histórico individual: cabecera (volver + título del mes) +
 * 4 tarjetas de estadísticas + lista de gastos.
 */
export function IndividualHistoricoDetalleSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label={app.cargando}>
      <div className="flex items-center gap-2">
        <Pulso className="h-6 w-6 rounded-lg" />
        <Pulso className="h-7 w-40 rounded-lg" />
      </div>
      <div className="flex gap-3">
        <Pulso className="h-20 flex-1 rounded-2xl" />
        <Pulso className="h-20 flex-1 rounded-2xl" />
        <Pulso className="h-20 flex-1 rounded-2xl" />
        <Pulso className="h-20 flex-1 rounded-2xl" />
      </div>
      <Pulso className="h-16 rounded-2xl" />
      <Pulso className="h-16 rounded-2xl" />
      <Pulso className="h-16 rounded-2xl" />
    </div>
  );
}

/** Formulario de gasto individual (editar o nuevo): bloques de formulario. */
export function IndividualGastoFormSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label={app.cargando}>
      <Pulso className="h-12 rounded-full" />
      <Pulso className="h-48 rounded-2xl" />
      <Pulso className="h-12 rounded-2xl" />
    </div>
  );
}