/**
 * Repositorio único de literales (textos) de la aplicación.
 *
 * Todos los textos visibles para el usuario (UI, validaciones, mensajes de
 * error) viven aquí y se importan desde los componentes, páginas y server
 * actions. Así se centraliza el copywriting en un solo lugar y es trivial
 * ajustar, traducir o revisar cualquier literal.
 */

export const app = {
  nombre: 'Nest',
  descripcion: 'Tu espacio financiero compartido',
  cargando: 'Cargando',
};

/** Textos de formato neutros (sin anclar la UI a un idioma concreto). */
export const formatos = {
  /** Marcador de valor vacío/pendiente en cifras. */
  vacio: '—',
  /** Ejemplo de importe para inputs de dinero. */
  importeEjemplo: '0,00 €',
  /** Sufijo de unidad monetaria. */
  sufijoEuro: '€',
};

export const auth = {
  tituloLogin: 'Nest',
  subtituloLogin: 'Tu espacio financiero compartido',
  tituloSignup: 'Crear cuenta',
  subtituloSignup: 'Únete a un espacio financiero compartido',
  iniciaSesion: 'Inicia sesión',
  registrate: 'Regístrate',
  noTienesCuenta: '¿No tienes cuenta?',
  yaTienesCuenta: '¿Ya tienes cuenta?',
  labelUsuario: 'Nombre de usuario',
  placeholderUsuarioLogin: 'ej. Paco',
  placeholderUsuarioSignup: 'Tu nombre de usuario',
  labelContrasena: 'Contraseña',
  iniciarSesion: 'Iniciar sesión',
  entrando: 'Entrando…',
  crearCuenta: 'Crear cuenta',
  creando: 'Creando…',
  espacioCompleto:
    'El espacio compartido ya está completo con 2 usuarios.',
};

export const authErrores = {
  usuarioObligatorio: 'El nombre de usuario es obligatorio',
  contrasenaCorta: 'La contraseña debe tener al menos 6 caracteres',
  usuarioFormatoInvalido:
    'El nombre solo puede tener letras, números, puntos, guiones y guion bajo',
  credencialesIncorrectas: 'Nombre de usuario o contraseña incorrectos.',
  usuarioEnUso: (username: string) =>
    `El nombre de usuario "${username}" ya está en uso.`,
  maximoUsuariosAlcanzado:
    'El espacio compartido ya está completo (2 usuarios). No se pueden registrar más cuentas.',
  noAutenticado: 'No autenticado',
  errorInesperado: 'Error inesperado',
  errorConexion:
    'No se pudo conectar con la base de datos. Revisa la configuración del servidor e inténtalo de nuevo.',
};

export const nav = {
  inicio: 'Inicio',
  gastos: 'Gastos',
  aportar: 'Aportes',
  historico: 'Histórico',
  salir: 'Salir',
  cerrarSesion: 'Cerrar sesión',
};

export const gastoForm = {
  importe: 'Importe',
  categoria: 'Categoría',
  detalle: 'Detalle',
  placeholderDetalle: 'ej. Cerveza Sully',
  fechaGasto: 'Fecha del gasto',
  recurrente: 'Recurrente',
  notaMesGasto:
    'La fecha del gasto decide a qué mes afecta, no el día en que se registra.',
  guardar: 'Guardar gasto',
  guardarCambios: 'Guardar cambios',
  guardando: 'Guardando…',
  eliminar: 'Eliminar gasto',
  confirmarEliminar: '¿Eliminar este gasto?',
  nuevoGasto: 'Nuevo gasto',
  editarGasto: 'Editar gasto',
  sinMesAbierto: 'No hay un mes abierto.',
  gastoCongelado: 'Este gasto está congelado y es de solo lectura.',
};

export const gastoValidaciones = {
  detalleObligatorio: 'El detalle es obligatorio',
  importePositivo: 'El importe debe ser mayor que 0',
  fechaInvalida: 'Fecha inválida',
};

export const gastos = {
  todos: 'Todos',
  sinGastosCategoria: 'No hay gastos en esta categoría.',
  recurrente: 'Recurrente',
  editar: 'Editar',
  eliminar: 'Eliminar',
  eliminando: 'Eliminando…',
  nuevoGasto: 'Nuevo gasto',
  verDetalle: 'Ver detalle',
};

export const gastosErrores = {
  mesCongeladoNuevos:
    'Este mes está congelado y no admite nuevos gastos.',
  gastoNoEncontrado: 'Gasto no encontrado.',
  gastoNoEditable: 'Este gasto ya no es editable.',
  gastoNoEliminable: 'Este gasto ya no se puede eliminar.',
};

export const gastosAnualesValidaciones = {
  detalleObligatorio: 'El detalle es obligatorio',
  importePositivo: 'El importe debe ser mayor que 0',
  mesPagoInvalido: 'El mes de pago debe estar entre 1 y 12',
};

export const gastosAnualesErrores = {
  gastoAnualNoEncontrada: 'Gasto anual no encontrado.',
  gastoAnualYaPagado: 'Este gasto anual ya está pagado para el ciclo actual.',
  devengoPrevio: 'No se puede editar/eliminar: este gasto anual ya tiene meses devengados en el ciclo actual.',
};

export const gastosAnuales = {
  titulo: 'Gastos anuales',
  nuevo: 'Nuevo gasto anual',
  detalle: 'Detalle',
  placeholderDetalle: 'ej. Seguro hogar',
  importeTotal: 'Importe total anual',
  mesPago: 'Mes de pago',
  guardar: 'Guardar gasto anual',
  guardando: 'Guardando…',
  editar: 'Editar',
  eliminar: 'Eliminar',
  pagar: 'Marcar como pagado',
  sinGastosAnuales: 'Aún no hay gastos anuales registrados.',
  nota: 'Los gastos anuales se cubren mes a mes. Al llegar el mes de pago, se marcan como pagados y empieza un nuevo ciclo.',
  /** Progreso dentro de la ventana de apartado: "1/11" (ambos extremos incluidos). */
  ventana: (posicion: number, numMeses: number) => `${posicion}/${numMeses}`,
  /** Etiqueta del ciclo objetivo: "Ciclo 2027". */
  ciclo: (anio: number) => `Ciclo ${anio}`,
  /** Etiqueta del destino de pago: "Para julio 2027". */
  para: (mes: string, anio: number) => `Para ${mes} ${anio}`,
  progreso: (apartado: string, total: string) => `Apartado ${apartado}/${total}`,
  pagado: 'Pagado',
  /** Línea "apartado" dentro del listado de gastos del mes. */
  apartadoLinea: (detalle: string) => `Apartado ${detalle}`,
  /** Título de la sección de apartados en el listado de gastos del mes. */
  apartadoSeccion: 'Apartado este mes',
};

export const aportar = {
  titulo: 'Aportes y presupuesto',
  sueldoIntegro: 'Sueldo íntegro',
  guardarSueldo: 'Guardar sueldo',
  errorGuardarSueldo: 'Error al guardar el sueldo. Inténtalo de nuevo.',
  importeAportado: 'Importe aportado',
  pendientePorcentaje: '— pendiente de porcentaje',
  fijo: 'Fijo',
  pendiente: 'Pendiente',
  porcentajeAportacion: 'Porcentaje de aportación',
  porcentajeUnico: 'Porcentaje único del mes',
  fijarPorcentaje: 'Fijar porcentaje',
  errorFijarPorcentaje: 'Error al fijar el porcentaje. Inténtalo de nuevo.',
  presupuestoGastos: 'Presupuesto de gastos',
  presupuestoUnicoMes: 'Presupuesto de gastos del mes',
  fijarPresupuesto: 'Fijar presupuesto',
  errorFijarPresupuesto:
    'Error al fijar el presupuesto. Inténtalo de nuevo.',
  fijadoPor: (username: string, fecha: string) => `Fijado por ${username} el ${fecha}`,
  totalCuentaConjunta: 'Total cuenta conjunta',
  notaInamovible:
    'El sueldo, el porcentaje y el presupuesto de gastos son inamovibles una vez guardados.',
  sinMesAbierto: 'No hay un mes abierto todavía.',
};

/**
 * Errores de validación de los formularios de la cuenta individual. Los
 * esquemas de servidor (T14) rechazan cualquier campo foráneo (usuarioId,
 * mesId). El porcentaje usa las mismas reglas de rango que la cuenta conjunta,
 * porque las dos áreas fijan el mismo valor único y compartido del mes.
 */
export const individualErrores = {
  campoNoPermitido: 'Campos no permitidos en esta operación',
};

/**
 * Pantalla de elección de cuenta "/" (NAV-1 Chooser). Lenguaje neutro: la UI
 * no se ancla al concepto de "pareja" (la app evolucionará hacia el control de
 * gastos individuales).
 */
export const chooser = {
  titulo: '¿Qué cuenta quieres ver?',
  subtitulo: 'Elige un área para empezar.',
  individual: 'Cuenta individual',
  individualDescripcion: 'Tus gastos, tu sueldo y tu porcentaje propios',
  conjunta: 'Cuenta conjunta',
  conjuntaDescripcion: 'Gastos, aportaciones y presupuesto compartidos',
  volver: 'Cambiar de cuenta',
};

/**
 * Textos del área individual. Cada pantalla muestra SOLO su propio número: la
 * individual muestra X (mi porcentaje), la conjunta lee el complementario
 * almacenado sin invertir de nuevo (MP-1, sin doble inversión).
 */
export const individual = {
  titulo: 'Mi espacio',
  miSueldo: 'Mi sueldo',
  miPorcentaje: 'Mi porcentaje',
  porcentajeUnico: 'Porcentaje individual del mes',
  fijarPorcentaje: 'Fijar mi porcentaje',
  guardarSueldo: 'Guardar mi sueldo',
  miCuota: 'Mi cuota',
  miAportacionMensual: 'Tu aportación mensual',
  deTuCuota: 'de tu cuota',
  cuotaSuperada: 'cuota superada',
  notaPorcentaje:
    'Al fijar tu porcentaje individual, la cuenta conjunta usa el porcentaje complementario.',
  notaInamovible:
    'El sueldo y el porcentaje individuales son inamovibles una vez guardados.',
  sinMesAbierto: 'No hay un mes abierto todavía.',
  sinDatos:
    'Todavía no hay datos para este mes. Registra tu sueldo o un gasto individual para empezar.',
  sinGastosMes: 'Aún no hay gastos individuales este mes.',
  teHasPasado: (monto: string) => `Has gastado ${monto} más de tu cuota.`,
};

export const aportacionErrores = {
  sueldoPositivo: 'El sueldo debe ser mayor que 0',
  porcentajePositivo: 'El porcentaje debe ser mayor que 0',
  porcentajeMaximo: 'El porcentaje no puede superar 100',
  presupuestoPositivo: 'El presupuesto debe ser mayor que 0',
  sueldoYaFijado: 'El sueldo ya está fijado y no se puede modificar.',
  porcentajeYaFijado:
    'El porcentaje ya está fijado y no se puede modificar.',
  presupuestoYaFijado:
    'El presupuesto ya está fijado y no se puede modificar.',
  mesNoEncontrado: 'Mes no encontrado.',
};

export const inicio = {
  sinMesAbierto: 'Sin mes abierto',
  contadorGastos: (n: number) => `${n} gastos`,
  ultimosGastos: 'Últimos gastos',
  verTodos: 'Ver todos',
  sinGastosMes: 'Aún no hay gastos registrados este mes.',
  sinDatos:
    'Todavía no hay datos para este mes. Aporta tu sueldo o registra un gasto para empezar.',
  teHasPasadoPresupuesto: (monto: string) =>
    `Te has pasado ${monto} del presupuesto del mes.`,
};

export const resumen = {
  aportado: 'Aportado',
  gastado: 'Gastado',
  disponible: 'Disponible',
  presupuesto: 'Presupuesto',
  ahorro: 'Ahorro',
  deficit: 'Déficit',
  gastadoRing: 'gastado',
  presupuestoRing: 'del presupuesto',
  superado: 'presupuesto superado',
};

export const historico = {
  titulo: 'Histórico',
  nota:
    'Solo el mes más reciente admite altas nuevas hasta el día 5. Los meses anteriores quedan congelados.',
  sinMeses: 'Aún no hay meses cerrados.',
  enCurso: 'En curso',
  editableHastaEl5: 'Editable hasta el 5',
  cerrado: 'Cerrado',
  verDetalle: 'Ver detalle',
};

export const historicoDetalle = {
  sinGastos: 'Sin gastos en este mes.',
};

export const errores = {
  noEncontradoTitulo: 'Página no encontrada',
  noEncontradoDescripcion:
    'La página que buscas no existe o ha cambiado de dirección.',
  errorTitulo: 'Algo ha ido mal',
  errorDescripcion:
    'Ocurrió un error inesperado. Inténtalo de nuevo en unos segundos.',
  reintentar: 'Reintentar',
  volverInicio: 'Volver al inicio',
};
