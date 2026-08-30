import { pgEnum, pgTable, uuid, text, integer, numeric, timestamp, date, boolean, jsonb } from 'drizzle-orm/pg-core';

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
  nombre: text('nombre').notNull(),
});

export const meses = pgTable('meses', {
  id: uuid('id').primaryKey().defaultRandom(),
  anio: integer('anio').notNull(),
  mes: integer('mes').notNull(),
  porcentaje: numeric('porcentaje', { precision: 5, scale: 2, mode: 'number' }),
  porcentajeFijadoPor: uuid('porcentaje_fijado_por').references(() => usuarios.id),
  porcentajeFechaRegistro: timestamp('porcentaje_fecha_registro'),
  fechaApertura: timestamp('fecha_apertura').defaultNow().notNull(),
});

export const aportaciones = pgTable('aportaciones', {
  id: uuid('id').primaryKey().defaultRandom(),
  mesId: uuid('mes_id').references(() => meses.id).notNull(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id).notNull(),
  sueldo: numeric('sueldo', { precision: 10, scale: 2, mode: 'number' }).notNull(),
  importeAportado: numeric('importe_aportado', { precision: 10, scale: 2, mode: 'number' }),
  fechaRegistro: timestamp('fecha_registro').defaultNow().notNull(),
});

export const gastos = pgTable('gastos', {
  id: uuid('id').primaryKey().defaultRandom(),
  mesId: uuid('mes_id').references(() => meses.id).notNull(),
  categoria: categoriaEnum('categoria').notNull(),
  detalle: text('detalle').notNull(),
  importe: numeric('importe', { precision: 10, scale: 2, mode: 'number' }).notNull(),
  fechaGasto: date('fecha_gasto', { mode: 'string' }).notNull(),
  esRecurrente: boolean('es_recurrente').default(false).notNull(),
  gastoRecurrenteOrigenId: uuid('gasto_recurrente_origen_id'),
  creadoPor: uuid('creado_por').references(() => usuarios.id).notNull(),
  fechaCreacion: timestamp('fecha_creacion').defaultNow().notNull(),
});

export const accionEnum = pgEnum('accion_enum', ['crear', 'editar', 'eliminar']);

export const historicoMovimientos = pgTable('historico_movimientos', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id).notNull(),
  entidad: text('entidad').notNull(),
  entidadId: uuid('entidad_id').notNull(),
  accion: accionEnum('accion').notNull(),
  valorAnterior: jsonb('valor_anterior'),
  valorNuevo: jsonb('valor_nuevo'),
  fecha: timestamp('fecha').defaultNow().notNull(),
});
