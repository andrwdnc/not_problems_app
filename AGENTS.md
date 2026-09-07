# AGENTS.md — Instrucciones y Arquitectura para el Agente de Desarrollo AI

Este documento es la guía definitiva de desarrollo para cualquier Agente de Inteligencia Artificial (Codex, Cursor, opencode, Claude Code, etc.) que trabaje en esta base de código. Define la arquitectura, reglas de negocio, estándares de código SOLID, sistema de diseño y convenciones del proyecto.

> **Documentos relacionados:**
> - `docs/spec.md` — Especificación funcional completa: modelo de datos detallado, reglas de negocio y diseño de las 5 pantallas, con mockups en `docs/mockups/`.
> - Este archivo define **CÓMO** trabajar; la spec define **QUÉ** construir. Ante cualquier conflicto, prevalecen las reglas de negocio de la §8 de este archivo.

---

## 1. Visión General del Proyecto

Aplicación web mobile-first **Nest — Tu espacio financiero compartido** (2 usuarios).
- **Objetivo:** Gestionar sueldos, un porcentaje compartido de aportación a una cuenta común, gastos comunes y balance mensual (aportado / gastado / disponible).
- **En evolución:** la app está orientada a compartir gastos entre dos usuarios y evolucionará hacia el **control de gastos individuales**. Mantén el lenguaje de la interfaz y del código **neutral** (consulta `src/literals/`) para no anclar la UI al concepto de "pareja".
- **Filosofía de Código:** Clean Architecture + Principios SOLID, tipado estricto con TypeScript, desacoplamiento de la lógica de negocio respecto a la UI y la base de datos.

---

## 2. Stack Tecnológico y Entorno

| Capa | Tecnología | Función |
|---|---|---|
| **Framework** | Next.js 14+ (App Router) | React Server Components (RSC) + Server Actions |
| **Lenguaje** | TypeScript | Tipado estricto (`noImplicitAny: true`, `strict: true`) |
| **Base de Datos** | Supabase (Postgres) | Persistencia |
| **Autenticación** | Propia (username + bcrypt + cookie) | Login por nombre de usuario + contraseña hasheada, sesión en cookie HTTP-only firmada (HMAC-SHA256) |
| **ORM** | Drizzle ORM | Schema SQL explícito y consultas desacopladas |
| **Validación** | Zod | Validación de entradas en Server Actions y formularios |
| **Estilos** | Tailwind CSS v4 | Utility-first con tokens de diseño personalizados (`@theme`) |
| **Iconos** | Lucide React | Iconografía técnica simple y limpia |
| **Testing** | Vitest | Tests unitarios de las reglas puras del dominio |

---

## 3. Arquitectura del Proyecto (Clean Architecture)

El proyecto sigue una adaptación de **Clean Architecture** para Next.js App Router para garantizar mantenibilidad, testabilidad y separación estricta de responsabilidades.

```text
src/
├── app/                        # Capa de Presentación / Rutas (Next.js App Router)
│   ├── (auth)/                 # Rutas de autenticación (Login, Signup)
│   ├── (dashboard)/            # Rutas de la app (Inicio, Gastos, Aportar, Histórico)
│   ├── layout.tsx              # Layout principal con navegación inferior móvil
│   └── globals.css             # Estilos globales y tokens Tailwind v4 (@theme)
├── components/                 # Componentes UI
│   ├── ui/                     # Componentes atómicos/reutilizables (Button, Card, Input, Badge)
│   ├── features/               # Componentes ligados a casos de uso (p.ej. AnilloProgreso, GastosList)
│   └── layout/                 # Layouts específicos y Navegación Inferior
├── domain/                     # Capa del Dominio (Lógica de Negocio Pura)
│   ├── entities/               # Tipos e interfaces del dominio (Mes, Usuario, Gasto, Aportacion)
│   ├── ports/                  # Puertos: interfaces de repositorio (contratos a implementar por infra)
│   ├── rules/                  # Reglas de negocio puras (CalculadoraAportacion, VentanaEdicionGastos, GastosRecurrentes)
│   └── value-objects/          # Objetos de valor (ImporteMoneda, Porcentaje, Categoria)
├── infrastructure/             # Capa de Infraestructura (DB & Servicios Externos)
│   ├── db/                     # Drizzle Schema, conexión lazy (getDb) y migraciones
│   ├── repositories/           # Implementación Drizzle de los puertos del dominio (DIP)
│   ├── audit/                  # Helper de auditoría (auditarMovimiento)
│   └── config.ts               # Configuración validada con Zod (getConnectionUrl, getAuthSecret, esProduccion)
├── server-actions/             # Casos de Uso / Controladores (Server Actions de Next.js)
│   ├── gastos-actions.ts       # Acciones relativas a gastos (crear, editar, eliminar)
│   ├── aportaciones-actions.ts # Acciones de sueldo y porcentaje
│   ├── auth-actions.ts         # Acciones de login/signup/logout
│   ├── meses-actions.ts        # Apertura y generación automática de meses
│   ├── queries.ts              # Resumen del mes actual
│   ├── historico-queries.ts    # Consultas del histórico de meses
│   └── schemas/                # Esquemas de validación Zod (auth, gasto, aportacion)
├── server/auth/                # Autenticación de servidor (getCurrentUser, getCurrentUserId)
├── literals/                   # Textos centralizados de la interfaz (namespace por área)
├── middleware.ts               # Protección de rutas (Edge runtime, Web Crypto)
└── lib/                        # Utilidades y Helper Functions
    ├── session/                # Sesión propia (cookie HTTP-only firmada HMAC-SHA256)
    ├── formatters/             # Formateadores de moneda (EUR), fechas y porcentajes
    └── utils.ts                # Merge de clases Tailwind (cn) y helpers generales
```

> **Convención obligatoria de literales:** todo texto visible de la interfaz y los mensajes de validación deben vivir en `src/literals/` (importado como `literalesX`), **nunca** hardcodeado en un componente o server action. Incluye los marcadores de formato neutros (`formatos.vacio`, `formatos.sufijoEuro`, `formatos.importeEjemplo`) y etiquetas de accesibilidad (`app.cargando`). Esto mantiene la UI neutra y lista para la futura evolución individual.

> **Configuración centralizada:** el acceso a variables de entorno pasa siempre por `src/infrastructure/config.ts` (validado con Zod), nunca por `process.env` directo en el cuerpo de funciones.

---

## 4. Aplicación de Principios SOLID

El agente **DEBE** respetar estrictamente los siguientes principios al generar o refactorizar código:

### S — Single Responsibility Principle (SRP)
- **Componentes React (`/components`):** Solo se encargan del renderizado visual y eventos de usuario. No ejecutan lógica SQL ni calculan reglas financieras complejas.
- **Server Actions (`/server-actions`):** Actúan como orquestadores de casos de uso (validador Zod -> invocar regla de dominio -> guardar en repositorio -> registrar auditoría -> revalidar path).
- **Reglas del Dominio (`/domain/rules`):** Funciones puras que reciben datos y devuelven cálculos o booleanos de permiso. No dependen de Next.js ni de Drizzle.

### O — Open/Closed Principle (OCP)
- Las reglas con estados o variantes están declaradas como **tablas de reglas** (datos) en lugar de cadenas `if/else`. Ejemplo: `VentanaEdicionGastos` decide el estado de cada mes mediante una tabla `REGLAS` + `PERMISOS`; añadir un nuevo estado (p. ej. "solo_altas hasta el día 10") significa añadir una entrada en su tabla, sin modificar la función.

### L — Liskov Substitution Principle (LSP)
- Las capas de infraestructura implementan las interfaces declaradas en `src/domain/ports/repositories.ts`. Se debe poder sustituir un repositorio de Drizzle por un mock en tests unitarios sin romper la aplicación.

### I — Interface Segregation Principle (ISP)
- No pasar objetos gigantes a los componentes visuales. Si un componente solo necesita el `importe` y la `categoria` de un gasto, su `props` debe requerir únicamente esos campos.
- El usuario canónico de dominio es público (`{ id, username }`). Las credenciales (`passwordHash`) son internas de la autenticación (`UsuarioConCredenciales`) y **nunca** deben llegar a la capa de presentación.

### D — Dependency Inversion Principle (DIP)
- Los contratos de persistencia se declaran en el dominio (`src/domain/ports/repositories.ts`) y las Server Actions, queries y páginas dependen de esas abstracciones. La infraestructura (`infrastructure/repositories`) **implementa** esos puertos y los re-exporta por conveniencia (DIP).
- Las Server Actions no deben importar directamente librerías o SQL crudo en medio de la función. Deben apoyarse en los repositorios (`infrastructure/repositories`) y en la capa de configuración (`infrastructure/config.ts`) para las variables de entorno (incluido `esProduccion()`, nunca `process.env.NODE_ENV` suelto).
- Todo texto visible de la interfaz y de validación se importa desde `src/literals/`, manteniendo la UI desacoplada de valores hardcodeados.

---

## 5. Reglas de Negocio Inviolables (Domain Constraints)

El Agente de IA debe velar por que estas reglas se cumplan al 100%:

1. **Porcentaje Único y Compartido:**
   - `meses.porcentaje` es un valor **único para todo el mes** que aplica por igual a los dos usuarios.
   - **PROHIBIDO** crear campos de porcentaje por usuario o tarjetas con porcentajes distintos.

2. **Inmutabilidad de Sueldos y Porcentaje:**
   - Una vez fijado y guardado un `sueldo` o el `porcentaje` del mes, no se pueden editar ni borrar (marca visual 🔒).

3. **Cálculo Automático de `importe_aportado`:**
   - `importe_aportado = sueldo * (porcentaje / 100)`.
   - Se debe calcular y persistir de forma reactiva en el momento en que **ambos datos estén presentes** en la base de datos (sea cual sea el orden de registro).

4. **Regla de Ventana de Gracia para Gastos:**
   - **Mes actual:** Gastos totalmente editables y eliminables.
   - **Mes anterior (hasta el día 5 inclusive):** Editable, eliminable y admite gastos nuevos.
   - **Mes anterior (a partir del día 6):** Congelado. Solo se permiten **altas nuevas** (olvidos).
   - **Hace 2 meses o más:** Completamente congelado (solo lectura).
   - *Nota:* La fecha del gasto (`fecha_gasto`) determina a qué mes pertenece, no el día de su registro.

5. **Auditoría Obligatoria (`historico_movimientos`):**
   - Toda creación, edición o eliminación de un registro (`meses`, `aportaciones`, `gastos`) debe escribir una entrada de auditoría guardando: `usuario_id`, `entidad`, `entidad_id`, `accion`, `valor_anterior`, `valor_nuevo` y `fecha`.

6. **Generación Automática de Mes:**
   - El día 1 de cada mes se debe inicializar el nuevo registro en `meses` y duplicar automáticamente los gastos marcados como `es_recurrente = true` del mes anterior.

---

## 6. Sistema de Diseño y Frontend Rules

### 6.1 Paleta de Colores (Tokens Tailwind CSS v4)

El proyecto usa **Tailwind CSS v4**: no existe `tailwind.config.ts`; los tokens se definen con `@theme` en `src/app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-brand-navy: #0B3D66;       /* Cabeceras, tarjetas de total, títulos principales */
  --color-brand-primary: #1B6FD1;    /* Botones principales, acentos, cifra "Aportado" */
  --color-brand-sky: #6FB1F0;        /* Elementos secundarios */
  --color-brand-pale: #DCEBFB;       /* Fondos suaves, chips inactivos */
  --color-brand-bg: #EEF4FA;         /* Fondo general de la app */
  --color-brand-surface: #FFFFFF;    /* Tarjetas / Contenedores */
  --color-brand-ink: #12293F;        /* Texto principal */
  --color-brand-muted: #6B8299;      /* Texto secundario / Etiquetas */
  --color-brand-border: #D7E4F0;     /* Bordes suaves */

  --color-financial-positive: #1F9E6D;    /* Verde: Exclusivo dinero a favor / Disponible / Ahorro */
  --color-financial-positiveBg: #E4F5EE;  /* Fondo verde suave */
  --color-financial-negative: #E2574C;    /* Coral: Exclusivo dinero gastado / Déficit */
  --color-financial-negativeBg: #FCEAE8;  /* Fondo coral suave */
  --color-financial-amber: #D98E1B;       /* Ámbar: Estado "editable hasta el día 5" */
}
```

Consumo como utilidades: `bg-brand-navy`, `text-financial-negative`, `bg-financial-positiveBg`, etc.

> **REGLA DE COLOR:** `financial.positive` (verde) y `financial.negative` (coral) están **estrictamente reservados para significado financiero**. Nunca usarlos como decoración general.

### 6.2 Tipografía y Números
- **Texto General:** Inter, Manrope o `sans-serif`.
- **Cifras Monetarias (Sueldos, Gastos, Totales):** **OBLIGATORIO** usar tipografía monoespaciada (`font-mono` / `JetBrains Mono` / `font-numeric: tabular-nums`). Esto garantiza alineación perfecta y claridad auditables.

### 6.3 Pautas de Layout Mobile-First
- Diseñado para móvil (390px - 430px de ancho base).
- Tarjetas con esquinas amplias (`rounded-2xl` o `rounded-3xl`, ~18px–28px).
- Navegación fija en la parte inferior (Bottom Navigation Bar) con 4 ítems: `Inicio`, `Gastos`, `Aportar`, `Histórico`.
- Botón flotante de acción rápida (+) en la pantalla de Gastos, accesible con el pulgar.

---

## 7. Esquema de Base de Datos (Drizzle ORM Guidelines)

Al definir o consultar con Drizzle (schema real en `src/infrastructure/db/schema.ts`):

```typescript
import { pgEnum, pgTable, uuid, text, integer, numeric, timestamp, date, boolean, jsonb, uniqueIndex, bigint, index } from 'drizzle-orm/pg-core';

export const categoriaEnum = pgEnum('categoria_enum', [
  'Vivienda', 'Suministros', 'Alimentacion', 'Ocio', 'Transporte', 'Salud', 'Otros',
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
  presupuesto: bigint('presupuesto', { mode: 'number' }), // céntimos; único e inmutable
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
  sueldo: bigint('sueldo', { mode: 'number' }).notNull(), // céntimos
  importeAportado: bigint('importe_aportado', { mode: 'number' }), // céntimos
  fechaRegistro: timestamp('fecha_registro', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('aportaciones_mes_usuario_unique').on(table.mesId, table.usuarioId),
]);

export const gastos = pgTable('gastos', {
  id: uuid('id').primaryKey().defaultRandom(),
  mesId: uuid('mes_id').references(() => meses.id).notNull(),
  categoria: categoriaEnum('categoria').notNull(),
  detalle: text('detalle').notNull(),
  importe: bigint('importe', { mode: 'number' }).notNull(), // céntimos
  fechaGasto: date('fecha_gasto', { mode: 'string' }).notNull(),
  esRecurrente: boolean('es_recurrente').default(false).notNull(),
  gastoRecurrenteOrigenId: uuid('gasto_recurrente_origen_id'),
  creadoPor: uuid('creado_por').references(() => usuarios.id).notNull(),
  fechaCreacion: timestamp('fecha_creacion', { withTimezone: true }).defaultNow().notNull(),
});

export const accionEnum = pgEnum('accion_enum', ['crear', 'editar', 'eliminar']);
export const entidadEnum = pgEnum('entidad_enum', ['meses', 'aportaciones', 'gastos']);

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
  index('historico_usuario_idx').on(table.usuarioId),
]);
```

> **Convención monetaria:** todos los importes monetarios (`sueldo`, `importeAportado`, `presupuesto`, `importe`) se guardan como `bigint` en **céntimos enteros** (`mode: 'number'`), nunca como `numeric`/`float`, para evitar errores de coma flotante. El único campo `numeric` es `meses.porcentaje` (%).

> **Conexión lazy (serverless):** la DB se accede siempre mediante `getDb()` (`src/infrastructure/db/connection.ts`), que crea un pool singleton cacheado a nivel global y establece la conexión **al primer uso**, no al importar el módulo. Esto evita fugas de sockets en Vercel (serverless) y permite que el build funcione sin la DB. Nunca crear un `Pool` nuevo en el cuerpo de una Server Action.

---

## 8. Comandos de Desarrollo

| Comando | Función |
|---|---|
| `npm install` | Instalar dependencias |
| `npm run dev` | Servidor de desarrollo en `http://localhost:3000` |
| `npm run build` | Build de producción (debe pasar sin errores antes de pushear) |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificación de tipos sin emitir (`tsc --noEmit`) |
| `npm run test` | Ejecutar tests unitarios una vez (Vitest) |
| `npm run test:watch` | Vitest en modo watch durante desarrollo |
| `npm run db:generate` | Generar migraciones SQL a partir del schema |
| `npm run db:push` | Aplicar el schema Drizzle a Supabase (desarrollo) |
| `npm run db:migrate` | Aplicar las migraciones SQL generadas (producción) |
| `npm run db:studio` | Abrir Drizzle Studio |
| `npm run db:vaciar` | Reset de la DB local (solo dev; script excluido del build) |

> Si algún script aún no existe en `package.json`, créalo en lugar de asumir que funciona.

---

## 9. Testing

- **Framework:** Vitest.
- Las **reglas puras del dominio** (`src/domain/rules/**`) deben tener **tests unitarios obligatorios**: `VentanaEdicionGastos` (ventana de gracia, §5.4) y `CalculadoraAportacion` (§5.3, incluyendo los totales agregados) son críticas.
- Los **value objects** (`src/domain/value-objects/**`) también llevan tests: `ImporteMoneda`, `Porcentaje` y `Categoria`.
- Los tests viven junto al código testado, con sufijo `.test.ts` (ej. `src/domain/rules/VentanaEdicionGastos.test.ts`).
- Las reglas del dominio son funciones puras: no requieren mocks ni conexión a base de datos.
- Antes de cada commit: `npm run typecheck && npm run lint && npm run test`.

---

## 10. Convenciones de Git

- Mensajes de commit **en inglés**, siguiendo [Conventional Commits](https://www.conventionalcommits.org/):
  - `feat:` nueva funcionalidad · `fix:` corrección · `refactor:` reestructura sin cambio de comportamiento · `test:` tests · `docs:` documentación · `chore:` mantenimiento/configuración
  - Ejemplos: `feat: add monthly summary ring on home screen`, `fix: prevent editing expenses after grace period`
- Commits pequeños y atómicos: una responsabilidad por commit, modo imperativo ("add", no "added").
- Nunca commitear: `.env*`, claves, tokens ni `node_modules`.
- **Flujo de ramas / despliegue:** el desarrollo se hace sobre `develop`; `master` es la rama de producción con despliegue automático a Vercel. Los commits de trabajos intermedios y de documentación quedan en `develop`. Promociona a `master` (con su commit en Conventional Commits) cuando el trabajo esté listo y verificado para producción.
- Antes de confirmar un trabajo: `npm run typecheck && npm run lint && npm run test` (y `npm run build` si es un cambio relevante).

---

## 11. Variables de Entorno y Secretos

Definir en `.env.local` (ya ignorado por Git en proyectos Next.js — verificar antes del primer commit):

```bash
DATABASE_URL=...                  # Conexión Postgres de Supabase (pooler) — servidor
DIRECT_URL=...                    # Conexión directa para migraciones de Drizzle
AUTH_SECRET=...                   # Secreto (>= 32 chars) para firmar la cookie de sesión (HMAC-SHA256)
```

Reglas:
- **PROHIBIDO** commitear cualquier archivo con secretos reales. Los valores de ejemplo van en `.env.example` (sin valores reales).
- Ninguna variable sin prefijo `NEXT_PUBLIC_` puede llegar al bundle del cliente.
- No loguear secretos ni valores completos de tokens en consola.

---

## 12. Guía de Trabajo Incremental para el Agente

Cuando el usuario te pida construir o avanzar en la aplicación, sigue esta secuencia de pasos ordenada. Los pasos 1-4 describen la base ya construida: al ampliar la app (p. ej. hacia el control de gastos individuales), respétales como estándar de referencia en lugar de reimplementarlos.

1. **Paso 1: Setup inicial y Configuración Base**
   - Asegurar que Tailwind tiene los tokens de color e incluye tipografía monoespaciada.
   - Configurar conexión de Supabase y Drizzle ORM (vía `src/infrastructure/config.ts` y `getDb()` lazy).

2. **Paso 2: Capa de Dominio (Domain Layer)**
   - Implementar las interfaces puras de las entidades.
   - Crear el módulo de reglas puras: `VentanaEdicionGastos` (valida día 5, mes actual vs anterior) y `CalculadoraAportacion`.
   - Escribir los tests unitarios de ambas reglas (§9).

3. **Paso 3: Infraestructura y Repositorios**
   - Declarar los **puertos** (`src/domain/ports/repositories.ts`) y que los repositorios Drizzle los implementen (DIP).
   - Implementar las queries de Drizzle desacopladas de las Server Actions.
   - Añadir la función helper de auditoría para que sea trivial llamar `auditarMovimiento(...)` tras cada mutación (incluida la creación de `meses`, §5.5).

4. **Paso 4: Server Actions y Validaciones**
   - Crear Server Actions con esquemas de validación Zod.
   - Implementar el cálculo reactivo de `importe_aportado`.

5. **Paso 5: Componentes UI y Pantallas**
   - **Inicio (`/`):** Anillo visual de porcentaje gastado + 3 tarjetas estadísticas (Aportado / Gastado / Disponible) + Lista de últimos 3 gastos.
   - **Aportaciones (`/aportar`):** Formulario de sueldo + porcentaje compartido único.
   - **Gastos (`/gastos` y `/gastos/nuevo`):** Listado filtrable por categoría + Formulario con bloque de importe grande en tipografía mono.
   - **Histórico (`/historico`):** Tarjetas resumen de meses cerrados con badges de estado ("Editable hasta el 5" / "Cerrado").
   - Replicar layout, espaciado y color desde los mockups de `docs/mockups/`, no solo desde la descripción textual de `docs/spec.md`.

6. **Paso 6: Verificación y Testing Manual**
   - Comprobar que no hay errores de TypeScript (`npm run typecheck`), lint limpio y tests en verde.
   - Verificar que los números se muestran en formato `X.XXX,XX €` con fuentes monoespaciadas.
