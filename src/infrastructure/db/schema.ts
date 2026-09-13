import { pgEnum, pgTable, uuid, text, integer, numeric, timestamp, date, boolean, jsonb, uniqueIndex, bigint, index } from 'drizzle-orm/pg-core';
export const categoriaEnum = pgEnum('categoria_enum', [
  'Vivienda',
  'Suministros',
  'Alimentacion',
  'Ocio',
  'Transporte',
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

export const gastosAnuales = pgTable('gastos_anuales', {
  id: uuid('id').primaryKey().defaultRandom(),
  importeTotal: bigint('importe_total', { mode: 'number' }).notNull(), // céntimos
  mesPago: integer('mes_pago').notNull(), // 1-12
  anioCiclo: integer('anio_ciclo').notNull(),
  detalle: text('detalle').notNull(),
  fechaUltimoPago: timestamp('fecha_ultimo_pago', { withTimezone: true }),
  creadoPor: uuid('creado_por').references(() => usuarios.id).notNull(),
  fechaCreacion: timestamp('fecha_creacion', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  // Un gasto anual por ciclo (año de ciclo) y mes de pago.
  uniqueIndex('gastos_anuales_anio_ciclo_mes_pago_unique').on(table.anioCiclo, table.mesPago),
]);

export const accionEnum = pgEnum('accion_enum', ['crear', 'editar', 'eliminar']);

export const entidadEnum = pgEnum('entidad_enum', ['meses', 'aportaciones', 'gastos', 'gastos_anuales']);

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
