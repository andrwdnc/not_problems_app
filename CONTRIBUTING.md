# Cómo contribuir

Gracias por el interés. Este documento tiene lo justo para que tu primer PR no
tenga que preguntar nada: qué ejecutar, cómo se organiza el código y qué se
espera de un cambio.

## Entorno

Requisitos: **Node.js 24.x** (exacta, no un rango abierto) y una base de datos
Postgres accesible.

```bash
git clone https://github.com/andrwdnc/not_problems_app.git
cd not_problems_app
npm install

cp .env.example .env.local   # rellena DATABASE_URL, DIRECT_URL y AUTH_SECRET
npm run db:push              # aplica el schema a la base de datos
npm run dev                  # http://localhost:3000
```

Para generar el secreto de sesión:

```bash
openssl rand -base64 48
```

> **Conexión a Supabase.** El hostname del pooler tiene tres trampas que se
> presentan todas como el mismo error de conexión. Está documentado en
> `README.md` (§ Troubleshooting) y en `AGENTS.md` (§11.1). Si no conecta,
> léelos antes de tocar código.

## Verificación

```bash
npm run typecheck && npm run lint && npm run test
```

Los tres deben pasar antes de abrir un PR. La CI ejecuta exactamente lo mismo y
añade `npm run build`. No hace falta `db:push` para pasar los tests: las reglas
del dominio son funciones puras y no tocan la base de datos.

## Dónde va cada cosa

```
src/
├── domain/          Lógica de negocio pura. Sin Next.js, sin Drizzle, sin DB.
├── infrastructure/  Implementaciones: Drizzle, config, auditoría.
├── server-actions/  Casos de uso. Validan con Zod, llaman al dominio, guardan.
├── components/      Solo render y eventos. Sin SQL ni cálculos financieros.
├── app/             Rutas y layouts.
└── literals/        Todos los textos de la interfaz.
```

Las dependencias apuntan hacia dentro: `app/components → server-actions →
domain`, y `infrastructure → domain` (implementa los puertos que el dominio
declara). El dominio no importa nada hacia fuera.

### Reglas del proyecto

Estas no son preferencias, son invariantes. Si tu cambio las toca, actualiza el
test que las cubre:

1. **Un componente, dos áreas de cuenta.** La app tiene un área conjunta y otra
   individual. Un componente de `components/features/` sirve a las dos o no
   existe. Hay un guard que lo verifica (`arquitectura.test.ts`).
2. **Todo texto visible sale de `src/literals/`.**
3. **Los importes son céntimos enteros.** `bigint`, nunca `float` ni `numeric`.
4. **Las reglas con estados son tablas, no `if`.** Añadir un estado nuevo es
   añadir una fila.
5. **Toda mutación escribe en `historico_movimientos`.**
6. **En el área individual, el propietario se deriva siempre de la sesión.** Los
   esquemas Zod son `.strict()` y rechazan un `usuarioId` enviado por el cliente.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/), **en inglés**,
modo imperativo:

| Prefijo | Uso |
|---|---|
| `feat:` | Funcionalidad nueva |
| `fix:` | Corrección de un bug |
| `refactor:` | Reestructura sin cambio de comportamiento |
| `test:` | Solo tests |
| `docs:` | Documentación |
| `chore:` | Mantenimiento y configuración |

```bash
feat: add grace-period guard to annual expense accrual
fix: keep the pending state when a Server Action returns an error
```

Commits pequeños y atómicos: uno por responsabilidad. Un commit que mezcla
varios conceptos son dos commits.

## Ramas

| Rama | Contenido |
|---|---|
| `develop` | Trabajo en curso. Es la rama por defecto y la que despliega como Preview. |
| `master` | Producción. Solo recibe commits verificados. |

```bash
git switch develop
git switch -c feat/mi-cambio
# ... trabajo ...
git push -u origin feat/mi-cambio   # abre un PR hacia develop
```

## Tests

Vitest, con los tests colocados junto al código (`*.test.ts`).

- Las reglas del dominio y los value objects **exigen** cobertura: contienen la
  aritmética del dinero y las ventanas de permiso.
- Los tests de componentes usan `@testing-library/react`.
- No hacen falta mocks ni base de datos. Si un test necesita una, es señal de
  que la lógica se ha escapado del dominio.

```bash
npm run test           # una pasada
npm run test:watch     # en modo watch
```

## Antes de abrir el PR

- [ ] `typecheck`, `lint` y `test` en verde
- [ ] Commit en inglés con Conventional Commits
- [ ] Textos nuevos en `src/literals/`
- [ ] Test nuevo si tocaste `src/domain/**`
- [ ] Migración idempotente si tocaste el schema (`scripts/`)

## Seguridad

No abras un issue público para un hallazgo de seguridad. Ver `docs/security.md`.
Nunca commitees `.env*`, claves ni tokens; los ejemplos van en `.env.example`.

## Código de conducta

Al participar aceptas el [Código de conducta](.github/CODE_OF_CONDUCT.md).