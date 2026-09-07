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

interface ContextoRegla {
  /** Diferencia en meses (hoy − mes del gasto). Negativa: gasto a futuro. */
  diferencia: number;
  /** Día del mes en el momento de la consulta (1-31). */
  diaHoy: number;
}

interface ReglaVentana {
  estado: EstadoEdicion;
  /** Predicado que decide si esta regla aplica al contexto. */
  aplicar: (contexto: ContextoRegla) => boolean;
}

/**
 * Tabla de reglas de la ventana de edición (OCP): las condiciones están
 * declaradas como datos, de modo que añadir un nuevo estado (p. ej.
 * "solo_altas hasta el día 10") implica añadir una entrada a `REGLAS` y su
 * permiso a `PERMISOS`, sin tocar la estructura de `ventanaEdicionGastos`.
 *
 * Fecha del gasto > mes actual (diferencia negativa): sin regla específica, cae
 * al fallback `congelado` (un gasto del futuro no es éditable).
 */
const REGLAS: ReglaVentana[] = [
  // Mes actual → editable/eliminable/crear.
  {
    estado: 'editable',
    aplicar: ({ diferencia }) => diferencia === 0,
  },
  // Mes anterior, hasta el día 5 inclusive → ventana de gracia (editable).
  {
    estado: 'gracia',
    aplicar: ({ diferencia, diaHoy }) => diferencia === 1 && diaHoy <= 5,
  },
  // Mes anterior, desde el día 6 → solo altas (olvidos).
  {
    estado: 'solo_altas',
    aplicar: ({ diferencia }) => diferencia === 1,
  },
  // Fallback: 2+ meses atrás o gasto del futuro → congelado (solo lectura).
  { estado: 'congelado', aplicar: () => true },
];

const PERMISOS: Record<EstadoEdicion, PermisosEdicion> = {
  editable: { estado: 'editable', puedeCrear: true, puedeEditar: true, puedeEliminar: true },
  gracia: { estado: 'gracia', puedeCrear: true, puedeEditar: true, puedeEliminar: true },
  solo_altas: { estado: 'solo_altas', puedeCrear: true, puedeEditar: false, puedeEliminar: false },
  congelado: { estado: 'congelado', puedeCrear: false, puedeEditar: false, puedeEliminar: false },
};

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

  const regla = REGLAS.find((r) => r.aplicar({ diferencia, diaHoy }));
  return { ...PERMISOS[regla!.estado] };
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