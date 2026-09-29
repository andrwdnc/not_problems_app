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
├── domain/                 # Entidades, reglas puras, puertos y value objects
├── infrastructure/         # Drizzle (db/), implementación de repositorios y auditoría
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
npx drizzle-kit push   # Aplicar el schema a la Supabase (única: dev y prod comparten)
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
| `npm run db:push` | Aplicar schema a la Supabase (única: dev y prod comparten instancia) |
| `npm run db:migrate` | Aplicar migraciones SQL (producción) |
| `npm run db:studio` | Abrir Drizzle Studio |
| `npm run db:vaciar` | Vaciar la Supabase. **Afecta a dev y prod** porque comparten la misma BD; solo para fase de pruebas |

## Despliegue (Vercel)

- **Producción**: solo desde `master` (rama de producción). Despliegue automático por push.
- **Preview**: otras ramas (p. ej. `develop`) generan despliegues de vista previa.
- Las variables de entorno se configuran como **Secrets** en Vercel (nunca en el repo).
- URL de producción: `https://notproblems.vercel.app` (proyecto `andrew-67d3/not_problems_app`)
- **Base de datos compartida:** mientras la app está en pruebas, `DATABASE_URL`/`DIRECT_URL` apuntan a la **misma** Supabase en todos los entornos de Vercel (sin separación dev/prod). `db:push`, `db:migrate` y `db:vaciar` afectan por igual a preview y producción.

> **Entornos de Vercel y variables:** las variables se configuran **por separado** para `Preview` (limitada a la rama `develop`) y `Production`. Arreglar `.env.local` **no** arregla Vercel: son configuraciones independientes, y una credencial válida en local puede seguir rota en el despliegue. Tras cambiar una variable hay que **relanzar el deployment** (`npx vercel redeploy <url>`), porque Vercel no las re-aplica a un despliegue ya construido.

> **Previews protegidos por SSO:** los previews de este proyecto responden `302` a `vercel.com/sso-api`. Para probarlos desde la terminal hay que saltarse la protección con `npx vercel curl /ruta --deployment <url>`, que genera un bypass automático. Un `curl` normal contra un preview solo ve el SSO, no la app.

> **Verificar un despliegue sin credenciales:** una Server Action se puede invocar directamente con la cabecera `Next-Action: <id>`, donde el id está en el chunk de la ruta (`/_next/static/chunks/app/.../page-*.js`). Es la única forma de comprobar desde fuera si la BD responde en un entorno protegido.

## Convenciones de Git

- Commits en inglés con [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).
- Trabajar en `develop`; promocionar a `master` para producción.
- Nunca commitear `.env*`, claves, tokens ni `node_modules`.
