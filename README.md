# Nest — Tu espacio financiero compartido

Aplicación web **mobile-first** (PWA) para gestionar el dinero de dos personas. Tiene **dos áreas separadas** que comparten la misma base de datos y el mismo mes:

- **Cuenta conjunta** — sueldos, un porcentaje único de aportación a una cuenta común, presupuesto mensual, gastos compartidos, gastos anuales y balance mensual (aportado / gastado / disponible).
- **Cuenta individual** — control de gastos **privados** de cada usuario: los ve y edita solo él. Comparte el mismo sueldo y el mismo mes, pero su presupuesto es su *cuota* (`sueldo × su porcentaje`).

Al entrar, `/` ofrece un **selector de cuenta** para elegir en cuál trabajar. La navegación es idéntica en ambas áreas; solo cambia el prefijo de ruta.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14.2.35 (App Router) — React Server Components + Server Actions |
| Lenguaje | TypeScript 5.4 (modo estricto) |
| Runtime | Node.js `^20` |
| Base de datos | Supabase (Postgres) |
| ORM | Drizzle ORM 0.45 |
| Autenticación | **Propia** — username + bcrypt + cookie HTTP-only firmada (HMAC-SHA256) |
| Validación | Zod |
| Estilos | Tailwind CSS v4 (tokens en `@theme`, sin `tailwind.config.ts`) |
| Iconos | Lucide React |
| Testing | Vitest |

## Estructura del proyecto

Clean Architecture. Los textos de la interfaz están centralizados en `src/literals/` (namespace por área).

```text
src/
├── app/                        # Rutas
│   ├── page.tsx                # Selector de cuenta ("/")
│   ├── (auth)/                 # /login, /signup
│   ├── (dashboard)/            # Área conjunta: /inicio, /gastos, /aportar, /historico
│   └── individual/             # Área individual: /individual/*
├── components/
│   ├── ui/                     # Button, Card, Input, Badge, Chip, Spinner
│   ├── features/               # Formularios y listas ligadas a casos de uso
│   └── layout/                 # BottomNav, NavigationShell, LogoutButton
├── domain/                     # Lógica de negocio pura (sin Next.js ni Drizzle)
│   ├── entities/               # Tipos del dominio
│   ├── ports/                  # Interfaces de repositorio (contratos)
│   ├── rules/                  # Calculadoras y ventanas de permiso (+ tests)
│   └── value-objects/          # ImporteMoneda, Porcentaje, Categoria
├── infrastructure/
│   ├── db/                     # Schema Drizzle, conexión lazy
│   ├── repositories/           # Implementaciones de los puertos
│   ├── audit/                  # auditarMovimiento(...)
│   └── config.ts               # Env validado con Zod
├── server-actions/             # Casos de uso + queries (+ tests)
├── server/auth/                # getCurrentUser, getCurrentUserId, espacioCompleto
├── literals/                   # Textos de la interfaz
├── lib/                        # Sesión, formateadores, utils, cuenta, navegacion
└── middleware.ts               # Protección de rutas (Edge / Web Crypto)
```

## Rutas

| Ruta | Área | Descripción |
|---|---|---|
| `/` | — | Selector de cuenta (redirige a `/login` sin sesión) |
| `/login`, `/signup` | Auth | Acceso y registro (ver cap de 2 usuarios) |
| `/inicio` | Conjunta | Anillo de progreso + 3 tarjetas + últimos 3 gastos |
| `/gastos` | Conjunta | Listado filtrable **+ sección de gastos anuales** |
| `/gastos/nuevo`, `/gastos/[id]` | Conjunta | Alta y edición de gasto |
| `/gastos/anuales/nueva`, `/gastos/anuales/[id]` | Conjunta | Alta y edición de gasto anual |
| `/aportar` | Conjunta | Sueldo, porcentaje único del mes y presupuesto |
| `/historico`, `/historico/[id]` | Conjunta | Meses cerrados y detalle de mes |
| `/individual/inicio` | Individual | Anillo vs. tu cuota + Mi sueldo / Gastado / Disponible |
| `/individual/aportar` | Individual | Tu sueldo y tu porcentaje (derivado) |
| `/individual/gastos`, `/nuevo`, `/[id]` | Individual | Tus gastos privados |
| `/individual/historico`, `/[id]` | Individual | Tu histórico |

No hay API routes: todo pasa por Server Components y Server Actions.

## Reglas de negocio

- **Porcentaje único e inmutable.** `meses.porcentaje` es un solo valor para todo el mes, igual para ambos usuarios. En el área individual se ve como `100 − porcentaje_conjunto`; escribirlo invierte esa operación una única vez y recalcula `importe_aportado`.
- **Inmutabilidad.** Sueldo, porcentaje y presupuesto quedan fijos una vez guardados (🔒). No se editan ni se borran.
- **Importes en céntimos.** Todos los campos monetarios son `bigint` en céntimos enteros (`sueldo`, `importe_aportado`, `presupuesto`, `importe`). Solo `meses.porcentaje` es `numeric`.
- **Cálculo reactivo.** `importe_aportado = sueldo × porcentaje / 100`, recalculado en cuanto ambos datos existen, sea cual sea el orden.
- **Ventana de gracia** (regla de tablas, no de `if`): mes actual editable · mes anterior hasta el **día 5 inclusive** editable · mes anterior desde el día 6 solo admite altas · 2 meses o más (y gastos con fecha futura) congelados. Lo determina `fecha_gasto`, no la fecha de registro.
- **Gastos recurrentes.** Al abrir un mes se duplican los marcados como `es_recurrente`, ajustando el día al último día válido del mes destino.
- **Gastos anuales.** Un gasto anual tiene `importeTotal` + `mesPago` + `anioCiclo` (único por ciclo y mes). Se **devenga** repartiendo el total en cuotas mensuales: `cuotaBase = floor(total / numMeses)` y el resto se reparte **+1 céntimo** en los primeros meses, de forma que la suma de la ventana es exactamente `importeTotal`. La ventana va del mes de creación (o el mes siguiente al último pago) hasta `(anioCiclo, mesPago)`, con ambos extremos incluidos. Una vez devengado, el registro es inmutable (se revalida en el servidor, no solo ocultando botones). «Marcar como pagado» hace rodar el gasto al ciclo siguiente y reinicia el apartado.
- **Apartado vs. gastado.** El apartado mensual solo afecta al **anillo**, al `% gastado` y al `disponible`. No altera el Gastado real ni el ahorro.
- **Privacidad del área individual.** El propietario se toma **siempre de la sesión**; los esquemas Zod son `.strict()` y rechazan un `usuarioId`/`mesId` enviado por el cliente. Los repositorios son *owner-first*: `findById(usuarioId, id)` devuelve `null` si la fila no es suya. Los gastos anuales y el presupuesto son exclusivos del área conjunta.
- **Auditoría.** Toda creación, edición o borrado escribe en `historico_movimientos` (`usuario_id`, `entidad`, `entidad_id`, `accion`, `valor_anterior`, `valor_nuevo`, `fecha`).
- **Dos usuarios.** El registro se cierra al llegar a 2 cuentas (`espacioCompleto()`); la Server Action lo vuelve a comprobar.

### Color

`financial.positive` (verde) y `financial.negative` (coral) están **reservados a significado financiero**. Nunca decorativos. Las cifras monetarias usan tipografía monoespaciada (`font-mono`) para alineación auditable.

## Requisitos previos

Variables de entorno en `.env.local` (nunca se commitean):

```bash
DATABASE_URL=...   # Conexión Postgres de Supabase (pooler) — servidor
DIRECT_URL=...     # Conexión directa para migraciones de Drizzle
AUTH_SECRET=...    # Secreto (>= 32 chars) para firmar la cookie de sesión (HMAC-SHA256)
```

> **Trampa de conexión:** el hostname del pooler de Supabase tiene tres fallos que todos se presentan como «no se pudo conectar con la base de datos» (la app no los distingue): el prefijo `aws-N` **forma parte del DNS** y con el equivocado el Supavisor responde `tenant not found`; el puerto que autentica es el **6543** (transaction mode), no el 5432; y los caracteres especiales de la contraseña van percent-encoded. Además `db.<ref>.supabase.co` es **IPv6-only**, así que `DIRECT_URL` debe apuntar a la misma URL que `DATABASE_URL` si no hay IPv6 global. Detalles en `AGENTS.md` §11.1.

## Setup local

```bash
npm install                  # Instalar dependencias
cp .env.example .env.local   # Rellena con tus credenciales reales
npm run db:push              # Aplicar el schema a la Supabase
npm run dev                  # http://localhost:3000
```

## Comandos

| Comando | Función |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificación de tipos (`tsc --noEmit`) |
| `npm run test` | Tests unitarios (Vitest) |
| `npm run test:watch` | Vitest en modo watch |
| `npm run db:generate` | Generar migraciones SQL a partir del schema |
| `npm run db:push` | Aplicar el schema a la Supabase |
| `npm run db:migrate` | Aplicar las migraciones SQL generadas |
| `npm run db:studio` | Abrir Drizzle Studio |
| `npm run db:migrate:gastos-anuales` | Migrar el esquema de gastos anuales (idempotente) |
| `npm run db:migrate:individual-accounts` | Migrar el esquema de gastos individuales (idempotente) |

> **Base de datos compartida:** en fase de pruebas, `DATABASE_URL`/`DIRECT_URL` apuntan a la **misma** Supabase en todos los entornos. No hay dataset separado por dev/prod: `db:push` y `db:migrate` afectan igual a preview y producción. No hay comando de borrado masivo: el reset se hace a mano y con precaución.

## Testing

Vitest, con los tests **colocados junto al código** (`*.test.ts`). Las reglas puras del dominio llevan cobertura obligatoria porque contienen la aritmética del dinero y las ventanas de permiso: `CalculadoraAportacion`, `CalculadoraGastoAnual`, `CalculadoraIndividual`, `GastosRecurrentes`, `VentanaEdicionGastos`, los value objects, y además `lib/cuenta`, `lib/navegacion`, `lib/session/token` y varias Server Actions. No requieren mocks ni base de datos.

Antes de confirmar: `npm run typecheck && npm run lint && npm run test`.

## Despliegue (Vercel)

- **Producción**: `master` (despliegue automático). **Preview**: `develop` (limitada a esa rama).
- Variables de entorno como **Secrets** en Vercel, configuradas **por separado** para `Preview` y `Production`. Arreglar `.env.local` **no** arregla Vercel: son independientes. Tras cambiar una variable hay que **relanzar** el deployment (`npx vercel redeploy <url>`).
- La URL y el nombre del proyecto no se documentan aquí por ser datos públicos del despliegue.
- **Previews protegidos por SSO**: responden `302` a `vercel.com/sso-api`; un `curl` normal no llega a la app. Usa `npx vercel curl /ruta --deployment <url>`.

## Documentación

- `AGENTS.md` — guía de desarrollo para agentes: arquitectura, principios SOLID, reglas de negocio, comandos, convenciones y diagnóstico de conexión.
- `docs/spec.md` — especificación funcional: modelo de datos, reglas y diseño de pantallas.
- `docs/security.md` — advisories aceptados a propósito y cuándo re-evaluarlos.
- `docs/mockups/` — mockups de las 5 pantallas de la área conjunta.

## Convenciones de Git

- Commits en inglés con [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).
- Desarrollo en `develop`; promoción a `master` para producción.
- Nunca commitear `.env*`, claves, tokens ni `node_modules`.
- `.atl/` es estado generado local y está ignorado a propósito.