import { pgEnum, pgTable, uuid, text, integer, numeric, timestamp, date, boolean, jsonb, uniqueIndex, bigint, index } from 'drizzle-orm/pg-core';
export const categoriaEnum = pgEnum('categoria_enum', [
  'Ocio',
  'Alimentacion',
  'Vivienda',
  'Transporte',
  'Viajes',
  'Salud',
  'Otros',
]);

export const usuarios = pgTable('usuarios', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull(),
  passwordHash: text('password_hash').notNull(),
}, (table) => [
  uniqueIndex('usuarios_username_unique').on(table.username),
]);

export const meses = pgTable('meses', {
  id: uuid('id').primaryKey().defaultRandom(),
  anio: integer('anio').notNull(),
  mes: integer('mes').notNull(),
  porcentaje: numeric('porcentaje', { precision: 5, scale: 2, mode: 'number' }),
  porcentajeFijadoPor: uuid('porcentaje_fijado_por').references(() => usuarios.id),
  porcentajeFechaRegistro: timestamp('porcentaje_fecha_registro', { withTimezone: true }),
  // Presupuesto de gastos mensual (céntimos), único e inmutable como el porcentaje.
  presupuesto: bigint('presupuesto', { mode: 'number' }),
  presupuestoFijadoPor: uuid('presupuesto_fijado_por').references(() => usuarios.id),
  presupuestoFechaRegistro: timestamp('presupuesto_fecha_registro', { withTimezone: true }),
  fechaApertura: timestamp('fecha_apertura', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('meses_anio_mes_unique').on(table.anio, table.mes),
]);

export const aportaciones = pgTable('aportaciones', {
  id: uuid('id').primaryKey().defaultRandom(),
  mesId: uuid('mes_id').references(() => meses.id).notNull(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id).notNull(),
  // Importes en céntimos enteros (bigint): evitan errores de coma flotante.
  sueldo: bigint('sueldo', { mode: 'number' }).notNull(),
  importeAportado: bigint('importe_aportado', { mode: 'number' }),
  fechaRegistro: timestamp('fecha_registro', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  // Invariante: una única aportación por usuario y mes.
  uniqueIndex('aportaciones_mes_usuario_unique').on(table.mesId, table.usuarioId),
]);

export const gastos = pgTable('gastos', {
  id: uuid('id').primaryKey().defaultRandom(),
  mesId: uuid('mes_id').references(() => meses.id).notNull(),
  categoria: categoriaEnum('categoria').notNull(),
  detalle: text('detalle').notNull(),
  importe: bigint('importe', { mode: 'number' }).notNull(),
  fechaGasto: date('fecha_gasto', { mode: 'string' }).notNull(),
  esRecurrente: boolean('es_recurrente').default(false).notNull(),
  gastoRecurrenteOrigenId: uuid('gasto_recurrente_origen_id'),
  creadoPor: uuid('creado_por').references(() => usuarios.id).notNull(),
  fechaCreacion: timestamp('fecha_creacion', { withTimezone: true }).defaultNow().notNull(),
});

export const gastosIndividuales = pgTable('gastos_individuales', {
  id: uuid('id').primaryKey().defaultRandom(),
  mesId: uuid('mes_id').references(() => meses.id).notNull(),
  // Dueño del gasto individual: frontera de privacidad (siempre desde sesión).
  usuarioId: uuid('usuario_id').references(() => usuarios.id).notNull(),
  categoria: categoriaEnum('categoria').notNull(),
  detalle: text('detalle').notNull(),
  importe: bigint('importe', { mode: 'number' }).notNull(),
  fechaGasto: date('fecha_gasto', { mode: 'string' }).notNull(),
  esRecurrente: boolean('es_recurrente').default(false).notNull(),
  gastoRecurrenteOrigenId: uuid('gasto_recurrente_origen_id'),
  creadoPor: uuid('creado_por').references(() => usuarios.id).notNull(),
  fechaCreacion: timestamp('fecha_creacion', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  // Índice compuesto mes + dueño: consultas de privacidad del área individual.
  index('gastos_individuales_mes_usuario_idx').on(table.mesId, table.usuarioId),
]);

/**
 * Presupuesto de gastos del ÁREA INDIVIDUAL (paridad con `meses.presupuesto`).
 *
 * En la cuenta conjunta el presupuesto vive en `meses.presupuesto`: es UN tope
 * compartido por los dos. Aquí es un tope POR PERSONA, así que necesita su propia
 * tabla: el `usuario_id` es la clave y por eso dos usuarios pueden tener
 * presupuestos distintos para el mismo mes.
 *
 * Hereda las mismas reglas que el de la conjunta: importe en céntimos enteros,
 * único e inmutable una vez fijado (`fijadoPor` + `fechaRegistro` los sellan).
 *
 * El `usuario_id` NUNCA viene del cliente: la Server Action lo deriva de la
 * sesión y el repositorio lo exige en el primer parámetro de cada método.
 */
export const presupuestosIndividuales = pgTable(
  'presupuestos_individuales',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mesId: uuid('mes_id')
      .references(() => meses.id)
      .notNull(),
    // Dueño del presupuesto: frontera de privacidad (siempre desde sesión).
    usuarioId: uuid('usuario_id')
      .references(() => usuarios.id)
      .notNull(),
    // Importe en céntimos enteros. Inmutable una vez fijado (§5.2).
    presupuesto: bigint('presupuesto', { mode: 'number' }).notNull(),
    fijadoPor: uuid('fijado_por')
      .references(() => usuarios.id)
      .notNull(),
    fechaRegistro: timestamp('fecha_registro', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // Un presupuesto por dueño y mes: es lo que separa esta tabla del de la
    // cuenta conjunta, donde el tope es único para el mes.
    uniqueIndex('presupuestos_individuales_mes_usuario_unique').on(
      table.mesId,
      table.usuarioId,
    ),
  ],
);

export const pagosPrevistos = pgTable('pagos_previstos', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Detalle del pago ("Seguro del coche"). */
  detalle: text('detalle').notNull(),
  /** Categoría del gasto que se registrará cuando llegue el mes. */
  categoria: categoriaEnum('categoria').notNull(),
  /** Mes del año en el que vence (1-12). */
  mes: integer('mes').notNull(),
  /** Día del mes en el que suele pagarse (1-31). */
  dia: integer('dia').notNull(),
  /** Importe de referencia en céntimos; null = solo recordatorio. */
  importeReferencia: bigint('importe_referencia', { mode: 'number' }),
  /**
   * Dueño en el área individual; null = cuenta conjunta (compartido).
   * Frontiera de privacidad: solo se filtra en SQL.
   */
  usuarioId: uuid('usuario_id').references(() => usuarios.id),
  /** Año del último pago registrado; null si nunca se pagó. */
  ultimoPagoAnio: integer('ultimo_pago_anio'),
  /** Gasto creado la última vez que se pagó desde este recordatorio. */
  ultimoPagoGastoId: uuid('ultimo_pago_gasto_id'),
  creadoPor: uuid('creado_por').references(() => usuarios.id).notNull(),
  fechaCreacion: timestamp('fecha_creacion', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('pagos_previstos_usuario_idx').on(table.usuarioId),
  index('pagos_previstos_mes_idx').on(table.mes),
]);

export const accionEnum = pgEnum('accion_enum', ['crear', 'editar', 'eliminar']);

export const entidadEnum = pgEnum('entidad_enum', ['meses', 'aportaciones', 'gastos', 'pagos_previstos', 'gastos_individuales', 'presupuestos_individuales']);

export const historicoMovimientos = pgTable('historico_movimientos', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id).notNull(),
  entidad: entidadEnum('entidad').notNull(),
  entidadId: uuid('entidad_id').notNull(),
  accion: accionEnum('accion').notNull(),
  valorAnterior: jsonb('valor_anterior'),
  valorNuevo: jsonb('valor_nuevo'),
  fecha: timestamp('fecha', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  // La auditoría se consultará por usuario; indexa para que no degrade con el tiempo.
  index('historico_usuario_idx').on(table.usuarioId),
]);

/**
 * Contadores de intentos de autenticación para el límite de fuerza bruta.
 *
 * No es parte del dominio de negocio: es infraestructura de seguridad, y por eso
 * no genera entradas en `historico_movimientos` ni aparece en `entidad_enum`.
 *
 * La clave es un digest HMAC del username o de la IP, nunca el valor en claro:
 * así la tabla no almacena datos personales y un volcado accidental no revela
 * qué usuarios existen ni desde dónde se conectan.
 *
 * `clave` es la PK, y eso es lo que permite que el contador se reinicie al
 * vencer la ventana dentro del propio INSERT ... ON CONFLICT, sin necesitar una
 * tarea programada de limpieza.
 */
export const authIntentos = pgTable('auth_intentos', {
  // Digest HMAC-SHA256 en base64url. El ámbito ('usuario:' / 'ip:') entra en el
  // material hasheado para que un username no pueda colisionar con una IP.
  clave: text('clave').primaryKey(),
  intentos: integer('intentos').notNull().default(1),
  // Inicio de la ventana vigente; cuando expira, el intento siguiente la reinicia.
  ventanaInicio: timestamp('ventana_inicio', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
