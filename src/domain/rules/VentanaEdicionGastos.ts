/**
 * Resultado de la ventana de edición de gastos.
 */
export type EstadoEdicion =
  | 'editable' // mes actual: crear/editar/eliminar
  | 'gracia' // mes anterior hasta el día 5: crear/editar/eliminar
  | 'solo_altas' // mes anterior a partir del día 6: solo crear
  | 'congelado'; // 2 meses atrás o más: solo lectura

export interface PermisosEdicion {
  estado: EstadoEdicion;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
}

interface FechaContexto {
  /** Fecha en la que se realiza la consulta (normalmente "hoy"). */
  hoy: Date;
  /** Mes de la fecha del gasto (1-12). Determina a qué mes pertenece. */
  mesGasto: number;
  /** Año de la fecha del gasto. */
  anioGasto: number;
}

function diffMeses(anioHoy: number, mesHoy: number, anioGasto: number, mesGasto: number): number {
  return (anioHoy - anioGasto) * 12 + (mesHoy - mesGasto);
}

function esMismoMes(anioHoy: number, mesHoy: number, anioGasto: number, mesGasto: number): boolean {
  return anioHoy === anioGasto && mesHoy === mesGasto;
}

/**
 * Regla pura que determina qué se puede hacer con un gasto según la fecha
 * de su gasto (mes de la fecha del gasto, no el mes de registro).
 *
 * - Mes actual → editable/eliminable/crear.
 * - Mes anterior, hoy día ≤ 5 → editable/eliminable/crear (ventana de gracia).
 * - Mes anterior, hoy día ≥ 6 → solo crear (altas por olvidos).
 * - Hace 2 meses o más → congelado (solo lectura).
 */
export function ventanaEdicionGastos(contexto: FechaContexto): PermisosEdicion {
  const { hoy, mesGasto, anioGasto } = contexto;

  const anioHoy = hoy.getFullYear();
  const mesHoy = hoy.getMonth() + 1; // 1-12
  const diaHoy = hoy.getDate();

  const diferencia = diffMeses(anioHoy, mesHoy, anioGasto, mesGasto);

  if (esMismoMes(anioHoy, mesHoy, anioGasto, mesGasto)) {
    return {
      estado: 'editable',
      puedeCrear: true,
      puedeEditar: true,
      puedeEliminar: true,
    };
  }

  if (diferencia === 1) {
    if (diaHoy <= 5) {
      return {
        estado: 'gracia',
        puedeCrear: true,
        puedeEditar: true,
        puedeEliminar: true,
      };
    }

    return {
      estado: 'solo_altas',
      puedeCrear: true,
      puedeEditar: false,
      puedeEliminar: false,
    };
  }

  return {
    estado: 'congelado',
    puedeCrear: false,
    puedeEditar: false,
    puedeEliminar: false,
  };
}

/**
 * Helper: determina la ventana para un mes concreto (por ejemplo un mes del histórico)
 * dado el "hoy" de referencia.
 */
export function ventanaDeMes(
  hoy: Date,
  anioMes: number,
  mesNumero: number,
): PermisosEdicion {
  // Usamos el día 1 del mes como fecha de referencia del gasto: solo importa el mes.
  return ventanaEdicionGastos({
    hoy,
    anioGasto: anioMes,
    mesGasto: mesNumero,
  });
}