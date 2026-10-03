import { app } from '@/literals';

/**
 * Skeletons de sección, uno por pantalla y compartidos por las dos áreas de
 * cuenta.
 *
 * Antes había cinco esqueletos "conjuntos" y cinco "individuales" que describían
 * la MISMA pantalla: `IndividualInicioSectionSkeleton` era una copia literal de
 * `ResumenInicioSkeleton`, y `IndividualGastosSectionSkeleton` la de
 * `GastosSectionSkeleton` con un bloque menos. Un esqueleto no es una funcionalidad
 * (no aporta nada que el usuario no tenga ya), así que no puede tener dos versiones
 * que además no se parecían: el salto de una pantalla a otra se notaba.
 *
 * Siguen el mismo lenguaje visual que el loading global del dashboard
 * (`src/app/(dashboard)/loading.tsx`): bloques `animate-pulse` con `bg-brand-pale`
 * y `rounded-2xl`, sin introducir tokens de diseño nuevos.
 */

function Pulso({ className }: { className: string }) {
  return <div className={`animate-pulse bg-brand-pale ${className}`} />;
}

/** Resumen del Inicio: título + anillo + 3 tarjetas + banda de aviso. */
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

/** Lista de últimos gastos del Inicio: encabezado + 2 filas. */
export function UltimosGastosSkeleton() {
  return (
    <div className="space-y-2" role="status" aria-label={app.cargando}>
      <Pulso className="h-5 w-32 rounded-lg" />
      <Pulso className="h-16 rounded-2xl" />
      <Pulso className="h-16 rounded-2xl" />
    </div>
  );
}

/**
 * Listado de Gastos: chips de categorías + filas + bloque de gastos anuales.
 *
 * El bloque de anuales se pinta siempre (aunque el usuario no tenga ninguno): en
 * las dos cuentas existe esa sección, y un esqueleto que la omite en una de ellas
 * hace que la pantalla "salte" cuando llega la respuesta.
 */
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

/** Aportar: bloques del formulario. */
export function AportarSectionSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label={app.cargando}>
      <Pulso className="h-40 rounded-2xl" />
      <Pulso className="h-36 rounded-2xl" />
      <Pulso className="h-36 rounded-2xl" />
    </div>
  );
}

/** Histórico: tarjetas de meses cerrados. */
export function HistoricoSectionSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label={app.cargando}>
      <Pulso className="h-28 rounded-2xl" />
      <Pulso className="h-28 rounded-2xl" />
      <Pulso className="h-28 rounded-2xl" />
    </div>
  );
}

/**
 * Detalle de mes: cabecera (volver + mes/año) + 4 tarjetas de cifras + filas de
 * gastos.
 *
 * Es el mismo esqueleto en las dos cuentas, incluida la quinta carta de apartado:
 * aparece o no según haya gastos anuales, pero reservarla siempre evita el salto
 * de altura cuando sí la hay.
 */
export function DetalleMesSkeleton() {
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

/** Formulario de gasto (alta o edición): bloques de formulario. */
export function GastoFormSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label={app.cargando}>
      <Pulso className="h-12 rounded-full" />
      <Pulso className="h-48 rounded-2xl" />
      <Pulso className="h-12 rounded-2xl" />
    </div>
  );
}

/**
 * Formulario de gasto anual (alta o edición). Es más corto que el mensual: solo
 * detalle, importe y mes de pago.
 */
export function GastoAnualFormSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label={app.cargando}>
      <Pulso className="h-12 rounded-full" />
      <Pulso className="h-40 rounded-2xl" />
      <Pulso className="h-12 rounded-2xl" />
    </div>
  );
}