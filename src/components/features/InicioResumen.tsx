import { AnilloProgreso } from '@/components/features/AnilloProgreso';
import { TarjetaEstado } from '@/components/features/TarjetaEstado';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/formatters/currency';
import { formatos } from '@/literals';
import type { InicioResumenVista } from '@/components/features/vista-inicio';

/**
 * Bloque de resumen de la pantalla de Inicio. UNO para las dos áreas de cuenta.
 *
 * Es deliberadamente tonto: no consulta nada, no sabe de qué área viene y no
 * decide nada. Solo pinta el `InicioResumenVista` que le pasa la página. Esa
 * separación es la que hace imposible que las dos pantallas se separen por
 * accidente: la conjunta y la individual llaman a este MISMO componente con
 * modelos distintos, así que la estructura de la pantalla es una sola por
 * definición y no por disciplina.
 *
 * Qué NO se unifica aquí, y por qué es correcto: los rótulos. Cada área nombra las
 * cifras según su vocabulario ("Aportado" / "Mi sueldo", "Ahorro" / "Disponible")
 * y el color financiero sigue reservando el mismo significado en las dos. El
 * modelo de vista lleva los textos ya resueltos, de modo que esta capa no
 * necesita saber qué área es.
 *
 * No es un Client Component: solo compone y formatea. Cada sección de la
 * pantalla se resuelve en el servidor y se envía por streaming dentro de su
 * propio `Suspense`, así que el anillo aparece en cuanto responde la query del
 * resumen sin esperar a la lista de últimos gastos.
 */
export function InicioResumen({ vista }: { vista: InicioResumenVista }) {
  return (
    <>
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand-navy">{vista.titulo}</h1>
      </header>

      {vista.hayDatos ? (
        <>
          <Card className="flex flex-col items-center gap-4 py-6">
            <AnilloProgreso
              porcentaje={vista.anillo.porcentaje}
              etiqueta={vista.anillo.etiqueta}
              etiquetaSuperada={vista.anillo.etiquetaSuperada}
            />
            <p className="text-center text-sm text-brand-muted">
              {vista.cifraAnillo.etiqueta}:{' '}
              {vista.cifraAnillo.valor != null ? (
                <span className="font-mono font-semibold text-brand-ink">
                  {formatCurrency(vista.cifraAnillo.valor)}
                </span>
              ) : (
                <span className="font-mono font-semibold text-brand-muted">
                  {formatos.vacio}
                </span>
              )}{' '}
              {vista.notaCifraAnillo}
            </p>
          </Card>

          <div className="flex min-w-0 flex-wrap gap-2 sm:flex-nowrap sm:gap-3">
            {vista.tarjetas.map((t) => (
              <TarjetaEstado
                key={t.variante}
                variante={t.variante}
                etiqueta={t.etiqueta}
                importe={t.importe}
              />
            ))}
          </div>

          {vista.avisoSuperado && (
            <p className="rounded-xl bg-financial-negativeBg p-3 text-center text-sm font-medium text-financial-negative">
              {vista.avisoSuperado}
            </p>
          )}
        </>
      ) : (
        <Card>
          <p className="text-sm text-brand-muted">{vista.mensajeSinDatos}</p>
        </Card>
      )}
    </>
  );
}
