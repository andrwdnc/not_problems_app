import { formatShortDate } from '@/lib/formatters/date';
import { formatCurrency } from '@/lib/formatters/currency';
import { nombreMes } from '@/lib/formatters/date';
import type { PagoPrevisto } from '@/domain/entities';
import { fechaPrevista, estaPagadoEnAnio } from '@/domain/rules/PagosPrevistosAnuales';
import type { VarianteCuenta } from '@/lib/cuenta';

/**
 * MODELO DE VISTA de los PAGOS PREVISTOS (recordatorios anuales).
 *
 * Hay dos vistas:
 *  - `FilaPagoPrevistoMesVista`: una fila del bloque "Pagos previstos este mes"
 *    en la pantalla de Gastos (solo los que vencen este mes).
 *  - `FilaPagoPrevistoGestionVista`: una fila de la página de gestión
 *    (`/[cuenta]/gastos/previstos`), con todos los previstos ordenados por mes.
 *
 * Lo que NO aparece aquí es ningún importe del mes ni apartado: los pagos
 * previstos no descuentan cifra alguna.
 */

export interface FilaPagoPrevistoMesVista {
  id: string;
  detalle: string;
  categoria: string;
  /** Fecha prevista formateada ("15 oct"). */
  fecha: string;
  /** ISO para precargar el formulario. */
  fechaPrevista: string;
  importeReferencia: number | null;
  /** Importe de referencia formateado para precargar el campo (euros con coma). */
  importeSugerido: string;
  pagado: boolean;
}

export interface FilaPagoPrevistoGestionVista {
  id: string;
  detalle: string;
  categoria: string;
  mes: number;
  nombreMes: string;
  dia: number;
  fechaPrevistaEsteAnio: string;
  importeReferencia: number | null;
  pagadoEsteAnio: boolean;
}

export interface VistaGestionPagosPrevistos {
  variante: VarianteCuenta;
  pagos: FilaPagoPrevistoGestionVista[];
}

/**
 * Deriva las filas del bloque "Pagos previstos este mes" a partir de la lista
 * completa de previstos del área. Solo incluye los que vencen en el mes abierto.
 */
export function mapearPagosPrevistosMes(
  previstos: PagoPrevisto[],
  mes: { anio: number; mes: number },
  hoy: Date,
): FilaPagoPrevistoMesVista[] {
  const anio = mes.anio;
  return previstos
    .filter((p) => p.mes === mes.mes)
    .map((p) => {
      const fp = fechaPrevista(p, anio);
      return {
        id: p.id,
        detalle: p.detalle,
        categoria: p.categoria,
        fecha: formatShortDate(fp),
        fechaPrevista: fp,
        importeReferencia: p.importeReferencia,
        importeSugerido:
          p.importeReferencia != null
            ? (p.importeReferencia / 100).toString().replace('.', ',')
            : '',
        pagado: estaPagadoEnAnio(p, anio),
      };
    });
}

/**
 * Deriva las filas de la página de gestión (todos los previstos, ordenados por
 * mes y día), con su estado de pago del ciclo en curso.
 */
export function mapearGestionPagosPrevistos(
  previstos: PagoPrevisto[],
  hoy: Date,
): FilaPagoPrevistoGestionVista[] {
  const anio = hoy.getFullYear();
  return previstos
    .slice()
    .sort((a, b) => a.mes - b.mes || a.dia - b.dia)
    .map((p) => ({
      id: p.id,
      detalle: p.detalle,
      categoria: p.categoria,
      mes: p.mes,
      nombreMes: nombreMes(p.mes),
      dia: p.dia,
      fechaPrevistaEsteAnio: fechaPrevista(p, anio),
      importeReferencia: p.importeReferencia,
      pagadoEsteAnio: estaPagadoEnAnio(p, anio),
    }));
}
