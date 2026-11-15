import { calcularDevengoPrevio } from '@/domain/rules/CalculadoraGastoAnual';
import { ventanaEdicionGastos } from '@/domain/rules/VentanaEdicionGastos';
import { gastosAnualesErrores, gastoForm } from '@/literals';

/**
 * Auxiliares compartidos por los dos adaptadores de contexto. Solo viven aquí
 * las derivaciones que las DOS áreas calculan con la MISMA regla pura y los
 * mismos rótulos: lo que cambia por área (rotulos, repositorios) va en cada
 * adaptador.
 */

/**
 * Aviso de gasto mensual congelado según la fecha del gasto (regla §5.4), o
 * `null` si todavía es editable. La fecha del gasto, no la de registro, es la
 * que decide a qué mes pertenece.
 */
export function avisoCongeladoDe(fechaGasto: string): string | null {
  const [anio, mes] = fechaGasto.split('-').map(Number);
  const ventana = ventanaEdicionGastos({
    hoy: new Date(),
    anioGasto: anio,
    mesGasto: mes,
  });
  return ventana.puedeEditar ? null : gastoForm.gastoCongelado;
}

/**
 * Devengo previo de un gasto anual (sus cuotas ya entraron en meses
 * anteriores, así que el importe ya no es editable) y su aviso. La regla es la
 * MISMA en las dos cuentas: el criterio de inmutabilidad no puede divergir.
 */
export function devengoPrevioDe(gastoAnual: {
  anioCiclo: number;
  mesPago: number;
}): { devengoPrevio: boolean; aviso: string | null } {
  const hoy = new Date();
  const devengoPrevio = calcularDevengoPrevio(
    hoy.getFullYear(),
    hoy.getMonth() + 1,
    gastoAnual.anioCiclo,
    gastoAnual.mesPago,
  );
  return {
    devengoPrevio,
    aviso: devengoPrevio ? gastosAnualesErrores.devengoPrevio : null,
  };
}
