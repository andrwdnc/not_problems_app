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
  placeholderUsuarioLogin: 'p.ej. andrew',
  placeholderUsuarioSignup: 'Tu nombre de usuario',
  labelContrasena: 'Contraseña',
  iniciarSesion: 'Iniciar sesión',
  entrando: 'Entrando…',
  crearCuenta: 'Crear cuenta',
  creando: 'Creando…',
};

export const authErrores = {
  usuarioObligatorio: 'El nombre de usuario es obligatorio',
  contrasenaCorta: 'La contraseña debe tener al menos 6 caracteres',
  usuarioFormatoInvalido:
    'El nombre solo puede tener letras, números, puntos, guiones y guion bajo',
  credencialesIncorrectas: 'Nombre de usuario o contraseña incorrectos.',
  usuarioEnUso: (username: string) =>
    `El nombre de usuario "${username}" ya está en uso.`,
  noAutenticado: 'No autenticado',
  errorInesperado: 'Error inesperado',
};

export const nav = {
  inicio: 'Inicio',
  gastos: 'Gastos',
  aportar: 'Aportar',
  historico: 'Histórico',
  salir: 'Salir',
  cerrarSesion: 'Cerrar sesión',
};

export const gastoForm = {
  importe: 'Importe',
  categoria: 'Categoría',
  detalle: 'Detalle',
  placeholderDetalle: 'Ej. cerveza Sully',
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
  nuevoGasto: 'Nuevo gasto',
  verDetalle: 'Ver detalle',
};

export const aportar = {
  titulo: 'Aportar',
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
  totalCuentaConjunta: 'Total cuenta conjunta',
  notaInamovible: 'El sueldo y el porcentaje son inamovibles una vez guardados.',
  sinMesAbierto: 'No hay un mes abierto todavía.',
};

export const aportacionErrores = {
  sueldoPositivo: 'El sueldo debe ser mayor que 0',
  porcentajePositivo: 'El porcentaje debe ser mayor que 0',
  porcentajeMaximo: 'El porcentaje no puede superar 100',
  sueldoYaFijado: 'El sueldo ya está fijado y no se puede modificar.',
  porcentajeYaFijado:
    'El porcentaje ya está fijado y no se puede modificar.',
  mesNoEncontrado: 'Mes no encontrado.',
};

export const inicio = {
  sinMesAbierto: 'Sin mes abierto',
  totalAportado: 'Total aportado',
  contadorGastos: (n: number) => `${n} gastos`,
  ultimosGastos: 'Últimos gastos',
  verTodos: 'Ver todos',
  sinGastosMes: 'Aún no hay gastos registrados este mes.',
  sinDatos:
    'Todavía no hay datos para este mes. Aporta tu sueldo o registra un gasto para empezar.',
};

export const resumen = {
  aportado: 'Aportado',
  gastado: 'Gastado',
  disponible: 'Disponible',
  ahorro: 'Ahorro',
  deficit: 'Déficit',
  gastadoRing: 'gastado',
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
