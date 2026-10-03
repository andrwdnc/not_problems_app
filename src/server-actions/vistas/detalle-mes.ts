import type { CifrasMes } from './cifras-mes';
import type {
  CartaDetalleMesVista,
  DetalleMesVista,
  GastoFilaDetalleVista,
} from '@/components/features/vista-detalle-mes';

/**
 * Derivación PURA del detalle de mes. Las dos áreas de cuenta la llaman con SUS
 * cifras ya normalizadas (`CifrasMes`) y SUS rótulos, y sale una sola lista de
 * cartas: la estructura de la pantalla no puede separarse porque solo existe en
 * este archivo.
 *
 * Nada aquí consulta la base de datos ni decide permisos: eso llega resuelto. Solo
 * traduce datos en la forma exacta que el markup necesita (rótulos, présence de
 * la quinta carta, signo absoluto del saldo), y por eso se testea sin renderizar.
 */

export interface RotulosDetalleMes {
  /** "Aportado" en la conjunta, "Mi sueldo" en la individual. */
  aportacion: string;
  gastado: string;
  /** "Presupuesto" / "Mi presupuesto". */
  presupuesto: string;
  /** "Ahorro" / "Disponible": el rótulo neutro del saldo. */
  saldo: string;
  /** "Déficit" en las dos áreas: el mismo término para el mismo hecho. */
  deficit: string;
  /** "Apartado": rótulo de la tarjeta de gastos anuales. */
  apartado: string;
}

/** Fila de gasto mínima para la lista del detalle. */
export interface GastoDetalleLike {
  id: string;
  detalle: string;
  categoria: string;
  importe: number;
  fechaGasto: string;
  esRecurrente: boolean;
}

export interface EntradaDetalleMes {
  cifras: CifrasMes;
  rotulos: RotulosDetalleMes;
  hrefVolver: string;
  titulo: string;
  gastos: GastoDetalleLike[];
  /** Fecha corta ya formateada por mes → texto, para no importar el formateador aquí. */
  formatearFecha: (fechaGasto: string) => string;
  sinGastos: string;
  recurrente: string;
  variante: 'conjunta' | 'individual';
  puedeEditar: boolean;
  puedeEliminar: boolean;
}

/**
 * Construye las cartas del detalle. El orden es PARTE DEL CONTRATO: aportación,
 * gastado, presupuesto, saldo y, solo si aparta algo, el apartado.
 *
 * La quinta carta es condicional a propósito y no un "0 €" fijo: en la cuenta
 * conjunta ya era condicional, y en la individual desaparece cuando el usuario
 * no tiene gastos anuales, igual que en la otra cuenta.
 */
export function derivarCartasDetalle(
  cifras: CifrasMes,
  rotulos: RotulosDetalleMes,
): CartaDetalleMesVista[] {
  const cartas: CartaDetalleMesVista[] = [
    { etiqueta: rotulos.aportacion, valor: cifras.aportacion, tono: 'aportado', absoluto: false },
    { etiqueta: rotulos.gastado, valor: cifras.gastado, tono: 'gastado', absoluto: false },
    { etiqueta: rotulos.presupuesto, valor: cifras.presupuesto, tono: 'neutro', absoluto: false },
    {
      etiqueta:
        cifras.saldo != null && cifras.saldo < 0 ? rotulos.deficit : rotulos.saldo,
      valor: cifras.saldo,
      tono: 'saldo',
      // El saldo es la única cifra que puede ser negativa: se pinta en absoluto
      // para que el signo lo cuente el rótulo y el color, no el número.
      absoluto: true,
    },
  ];

  if (cifras.apartado > 0) {
    cartas.push({
      etiqueta: rotulos.apartado,
      valor: cifras.apartado,
      tono: 'aportado',
      absoluto: false,
    });
  }

  return cartas;
}

export function derivarDetalleMesVista(entrada: EntradaDetalleMes): DetalleMesVista {
  const gastos: GastoFilaDetalleVista[] = entrada.gastos.map((g) => ({
    id: g.id,
    detalle: g.detalle,
    categoria: g.categoria,
    fecha: entrada.formatearFecha(g.fechaGasto),
    importe: g.importe,
    esRecurrente: g.esRecurrente,
  }));

  return {
    hrefVolver: entrada.hrefVolver,
    titulo: entrada.titulo,
    cartas: derivarCartasDetalle(entrada.cifras, entrada.rotulos),
    gastos,
    sinGastos: entrada.sinGastos,
    recurrente: entrada.recurrente,
    variante: entrada.variante,
    puedeEditar: entrada.puedeEditar,
    puedeEliminar: entrada.puedeEliminar,
  };
}