import {
  calcularApartadoDevengado,
  calcularApartadoMes,
  calcularDevengoPrevio,
  calcularVentanaApartado,
} from '@/domain/rules/CalculadoraGastoAnual';
import type { GastoAnual, GastoAnualIndividual, Mes } from '@/domain/entities';

/**
 * Vista de un gasto anual para la lista de gastos.
 *
 * Es un VIEW MODEL, no una entidad: el repositorio devuelve
 * `gastos_anuales` (o `gastos_anuales_individuales`) y la lista necesita datos
 * derivados —cuota del mes, total devengado, posición en la ventana, permisos—
 * que dependen del mes abierto y de la fecha actual.
 *
 * Vive aquí y no en el componente para que las dos áreas de cuenta calcúlenlo con
 * el MISMO código. Cuando esta transformación estaba escrita dentro de la página
 * de la cuenta conjunta, el área individual tenía que reimplementarla (o
 * quedarse sin la sección), y cualquier corrección tenía que aplicarse dos veces.
 */
export interface GastoAnualVista {
  id: string;
  detalle: string;
  /** Importe total del gasto en céntimos enteros. */
  importeTotal: number;
  /** Cuota apartada este mes dentro de la ventana (0 si fuera de la ventana). */
  cuotaMes: number;
  /** Suma de cuotas desde el inicio de la ventana hasta el mes actual (cent-exacto). */
  totalDevengado: number;
  /** Posición 1-indexada del mes dentro de la ventana; 0 si fuera. */
  posicion: number;
  /** Número de meses de la ventana inclusiva actual. */
  numMeses: number;
  puedeEditar: boolean;
  puedeEliminar: boolean;
  mesPago: number;
  anioCiclo: number;
  fechaUltimoPago: Date | null;
  estaPagadaEsteCiclo: boolean;
}

/**
 * Convierte gastos anuales en vista para la lista.
 *
 * Acepta tanto `GastoAnual` (área conjunta, sin dueño) como
 * `GastoAnualIndividual` (área individual, con dueño): la transformación no
 * necesita el `usuarioId` porque solo mira cifras y fechas. Esa es la razón por
 * la que una sola función sirve a las dos áreas.
 *
 * @param gastosAnuales Gastos del dueño correspondiente (ya filtrados por repositorio).
 * @param mes Mes abierto; si es null se usan el año y mes actuales como referencia
 *   y no se filtra por antigüedad.
 */
export function mapearGastosAnualesAVista(
  gastosAnuales: Array<GastoAnual | GastoAnualIndividual>,
  mes: Mes | null,
): GastoAnualVista[] {
  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;
  const anioMes = mes?.anio ?? anioActual;
  const mesMes = mes?.mes ?? mesActual;

  return gastosAnuales
    // Los ciclos anteriores al año del mes abierto ya no aportan nada a la
    // vista, así que se descartan antes de calcular la ventana de apartado.
    .filter((p) => !mes || p.anioCiclo >= mes.anio)
    .map((p) => {
      const ventana = calcularVentanaApartado(
        p.fechaCreacion,
        p.fechaUltimoPago,
        p.anioCiclo,
        p.mesPago,
      );
      const apartado = calcularApartadoMes(p.importeTotal, ventana, anioMes, mesMes);
      const totalDevengado = calcularApartadoDevengado(
        p.importeTotal,
        apartado.numMeses,
        apartado.posicion,
      );
      const devengoPrevio = calcularDevengoPrevio(
        anioActual,
        mesActual,
        p.anioCiclo,
        p.mesPago,
      );

      return {
        id: p.id,
        detalle: p.detalle,
        importeTotal: p.importeTotal,
        cuotaMes: apartado.cuota,
        totalDevengado,
        posicion: apartado.posicion,
        numMeses: apartado.numMeses,
        // Un gasto ya devengado es inmutable en las dos áreas.
        puedeEditar: !devengoPrevio,
        puedeEliminar: !devengoPrevio,
        mesPago: p.mesPago,
        anioCiclo: p.anioCiclo,
        fechaUltimoPago: p.fechaUltimoPago,
        estaPagadaEsteCiclo: p.fechaUltimoPago ? devengoPrevio : false,
      };
    });
}