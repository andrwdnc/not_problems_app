# Nest — Tu espacio financiero compartido

Aplicación web **mobile-first** para gestionar el dinero de dos usuarios que aportan a una cuenta común: sueldos, un porcentaje único de aportación, gastos compartidos y el balance mensual (aportado / gastado / disponible).

> **En evolución:** hoy la app está orientada a compartir gastos entre dos usuarios. Como siguiente paso se contempla ampliarla hacia el **control de gastos individuales**, por lo que el lenguaje de la interfaz y los documentos se mantienen voluntariamente neutros.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14 (App Router) — React Server Components + Server Actions |
| Lenguaje | TypeScript (estricto) |
| Base de datos | Supabase (Postgres) |
| ORM | Drizzle ORM |
| Autenticación | **Propia** — username + bcrypt + cookie HTTP-only firmada (HMAC-SHA256) |
| Validación | Zod |
| Estilos | Tailwind CSS v4 (tokens en `@theme`) |
| Iconos | Lucide React |
| Testing | Vitest (reglas puras del dominio) |

## Estructura del proyecto

Clean Architecture. Los textos de la interfaz están centralizados en `src/literals/`.

```text
src/
├── app/                    # Rutas (auth + dashboard) y layouts
├── components/             # Componentes UI (ui/, features/, layout/)
├── domain/                 # Entidades, reglas puras y value objects
├── infrastructure/         # Drizzle (db/), repositorios y auditoría
├── server-actions/         # Casos de uso / Server Actions y queries
├── server/auth/            # Autenticación de servidor (sesión actual)
├── literals/               # Textos centralizados de la interfaz
├── lib/                    # Sesión, formateadores (EUR/es) y utils
└── middleware.ts           # Protección de rutas (Edge / Web Crypto)
```

## Requisitos previos

Variables de entorno en `.env.local` (nunca se commitean):

```bash
DATABASE_URL=...   # Conexión Postgres de Supabase (pooler) — servidor
DIRECT_URL=...     # Conexión directa para migraciones de Drizzle
AUTH_SECRET=...    # Secreto (>= 32 chars) para firmar la cookie de sesión (HMAC-SHA256)
```

## Setup local

```bash
npm install            # Instalar dependencias
cp .env.example .env.local   # Y rellena con tus credenciales reales
npx drizzle-kit push   # Aplicar el schema a Supabase (desarrollo)
npm run dev            # http://localhost:3000
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
| `npm run db:generate` | Generar migraciones SQL |
| `npm run db:push` | Aplicar schema a la DB |
| `npm run db:studio` | Abrir Drizzle Studio |
| `npm run db:vaciar` | Reset de la DB local (solo dev) |

## Despliegue (Vercel)

- **Producción**: solo desde `master` (rama de producción). Despliegue automático por push.
- **Preview**: otras ramas (p. ej. `develop`) generan despliegues de vista previa.
- Las variables de entorno se configuran como **Secrets** en Vercel (nunca en el repo).
- URL de producción: `https://notproblemsapp.vercel.app`

## Convenciones de Git

- Commits en inglés con [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).
- Trabajar en `develop`; promocionar a `master` para producción.
- Nunca commitear `.env*`, claves, tokens ni `node_modules`.
