# Seguridad

Estado revisado el **4 de octubre de 2026** contra `next@14.2.35` y Node 24.x.

Este documento existe para que la postura de seguridad sea **explícita y
reproducible**, no para venderla. Cada advisory que queda abierto lleva el
motivo por el que se acepta y la condición que obliga a revisarlo.

---

## 1. Resumen

```bash
npm audit    # 22 vulnerabilidades: 5 moderate, 15 high, 2 critical
```

Ninguna de las dos *critical* afecta al artefacto desplegado, pero **15 high sí
tienen superficie real** y no son solo ruido de tooling. La decisión de no saltar
a Next 15/16 todavía está vigente; el plan está en §5.

| Superficie | Estado |
|---|---|
| Autenticación | Propia (bcrypt + cookie firmada HMAC-SHA256). Ver §3. |
| Fuerza bruta | Limitada por usuario y por IP, contador en Postgres. Ver §3. |
| Enumeración de usuarios | Mitigada por mensaje **y** por tiempo de respuesta idénticos. |
| Aislamiento de datos privados | Owner-first en repositorios + esquemas `.strict()`. |
| Cabeceras HTTP | CSP, HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`. |
| Cookies | `httpOnly`, `sameSite=lax`, `secure` en producción, `path=/`. |
| Auditoría | Toda mutación escribe en `historico_movimientos`. |
| CSRF | Cobertura implícita de Next (validación de `Origin` en Server Actions) + `form-action 'self'` en la CSP. |
| Migraciones versionadas | **No.** Ver §6, deuda conocida. |

---

## 2. Advisories abiertos

### `next@14.2.35` — 22 avisos (1 critical, 15 high, 6 moderate)

| Advisory | Severidad | ¿Afecta al despliegue? | Motivo |
|---|---|---|---|
| [GHSA-p293-qw3h-jr36](https://github.com/advisories/GHSA-p293-qw3h-jr36) RCE en servidores Windows | critical | **No** | El despliegue es Vercel (Linux). No hay autoalojamiento. |
| [GHSA-2xp9-vwfh-vxw4](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4) RCE en Image Optimization con AVIF | critical | **No** | La app **no usa `next/image`**: no hay un solo `<Image>` en el código. Sin optimizer, sin vector. |
| [GHSA-m99w-x7hq-7vfj](https://github.com/advisories/GHSA-m99w-x7hq-7vfj) DoS en Server Actions (App Router) | high | **Sí** | Es la superficie real de la app. Aceptado mientras se berada en 14.x. |
| [GHSA-4c39-4ccg-62r3](https://github.com/advisories/GHSA-4c39-4ccg-62r3) Payload ilimitado en Server Actions (Edge) | moderate | **Sí** | El middleware corre en Edge. Mitigado en la práctica por el tamaño del cuerpo de los formularios, no por diseño. |
| [GHSA-p9j2-gv94-2wf4](https://github.com/advisories/GHSA-p9j2-gv94-2wf4) SSRF en `rewrites` | high | No | La app **no define `rewrites`**. |
| [GHSA-89xv-2m56-2m9x](https://github.com/advisories/GHSA-89xv-2m56-2m9x) SSRF en Server Actions sobre servidor propio | high | No | No hay servidor propio; todo es Vercel serverless. |
| [GHSA-c4j6-fc7j-m34r](https://github.com/advisories/GHSA-c4j6-fc7j-m34r) SSRF con WebSocket upgrades | high | No | La app no abre WebSockets. |
| [GHSA-q4gf-8mx6-v5v3](https://github.com/advisories/GHSA-q4gf-8mx6-v5v3) / [GHSA-8h8q-6873-q5fj](https://github.com/advisories/GHSA-8h8q-6873-q5fj) DoS con Server Components | high | **Sí** | Aceptado. |
| [GHSA-h25m-26qc-wcjf](https://github.com/advisories/GHSA-h25m-26qc-wcjf) Deserialización RSC → DoS | high | **Sí** | Aceptado. |
| [GHSA-955p-x3mx-jcvp](https://github.com/advisories/GHSA-955p-x3mx-jcvp) Divulgación de endpoints de Server Function | moderate | **Sí** | Aceptado. |
| [GHSA-9g9p-9gw9-jx7f](https://github.com/advisories/GHSA-9g9p-9gw9-jx7f) DoS por `remotePatterns` | moderate | No | No se usa el Image Optimizer. |
| [GHSA-h64f-5h5j-jqjh](https://github.com/advisories/GHSA-h64f-5h5j-jqjh) DoS en Image Optimization API | moderate | No | Igual que el anterior. |
| Resto (`3x4c-7xq6-9pq8`, `ggv3-7p47-pfv8`, `wfc6-r584-vfw7`, `68g3-v927-f742`, `4633-3j49-mh5q`, `3g8h-86w9-wvmq`, `vfv6-92ff-j949`, `gx5p-jg67-6x7h`, `ffhc-5mcf-pf4q`, `36qx-fr4f-26g5`) | low / moderate | Mixto | Cache poisoning, request smuggling y XSS en escenarios (nonces, `beforeInteractive`, Pages Router) que la app **no usa**. Se resuelven con el salto a 15/16. |

### `postcss` — 4 avisos (2 high, 2 moderate)

**Solo en tiempo de build**, al procesar CSS. No hay entrada de usuario en el
pipeline de build: el CSS se genera desde `src/app/globals.css` y se compila en
Vercel. El vector (`sourceMappingURL` manipulado en un `.map` externo) requiere
controlar un fichero de stylesheet que esta app no carga. El fix exige un major
de Next.

### `vitest` / `vite` — 1 critical, 3 high, 4 moderate

**Solo en desarrollo.** El *critical* ([GHSA-5xrq-8626-4rwp](https://github.com/advisories/GHSA-5xrq-8626-4rwp))
requiere que el **servidor UI de Vitest esté escuchando** con acceso externo. Ni
la CI ni el flujo local usan `vitest --ui`; el comando es `vitest run`. Los avisos
de `vite` (`server.fs.deny` bypass, path traversal en `.map`) son del dev server.
Ninguno de estos paquetes llega al bundle de producción.

### `@typescript-eslint/*`, `glob`, `braces`, `micromatch`, `globby`, `fast-glob` — 10 high

**Solo tooling de lint.** `glob` necesita el flag `-c/--cmd` en su CLI, que
`eslint` no pasa. Se resuelven subiendo a `eslint-config-next@16` / ESLint 9, que
es un major con ruptura de configuración.

### `drizzle-kit`, `esbuild`, `@esbuild-kit/*` — 4 moderate

CLI de migraciones en local. No se ejecuta en el pipeline de despliegue: el
schema se aplica con los scripts de `scripts/`.

---

## 3. Medidas implementadas

### Coste constante en el login

`login` ejecutaba `bcrypt.compare` **después** de comprobar que el usuario
existe, así que un nombre inexistente respondía en microsegundos y uno válido en
~100 ms. El mensaje era el mismo, pero el reloj no, y eso basta para enumerar las
cuentas registradas.

Ahora se compara siempre: si no hay usuario, el hash se sustituye por
`HASH_SENUELO` (`src/lib/session/hashSenuelo.ts`), un bcrypt real de coste 12 de
una contraseña aleatoria descartada. Ambos caminos cuestan lo mismo. Cubierto por
`src/server-actions/auth-actions.test.ts`.

### Límite de intentos

La política vive como **tabla** en `src/domain/rules/LimiteIntentosAuth.ts`
(5 intentos por usuario y 20 por IP cada 15 min en login; 3 y 10 por hora en
registro).

Dos decisiones que importan:

- **El contador está en Postgres, no en memoria.** El despliegue es serverless:
  un `Map` en memoria daría `N` intentos por instancia y el límite real sería N
  veces mayor.
- **Las claves son digests HMAC con `AUTH_SECRET`,** no el username ni la IP en
  claro. La tabla no contiene datos personales.

El incremento es un único `INSERT ... ON CONFLICT DO UPDATE`, atómico: leer y
contar en dos sentencias dejaría una ventana en la que dos peticiones
simultáneas pasan el umbral.

Cuando se agota, la respuesta es **exactamente** la misma que con una contraseña
incorrecta. Un texto propio ("demasiados intentos") confirmaría que la cuenta
existe y de cuándo puede volver a probarse.

### El máximo de 2 usuarios lo garantiza la base de datos

`signup` hacía `count() >= 2` y luego `create()`: es un TOCTOU, y dos registros
simultáneos podían dejar 3 cuentas. El trigger `usuarios_max_2`
(`scripts/migrate-auth-seguridad.ts`) comprueba y permite el INSERT **dentro de la
misma transacción**, serializados con `pg_advisory_xact_lock`. Lanza un SQLSTATE
propio (`NST01`) que `src/infrastructure/errores-postgres.ts` traduce al literal
de negocio, para que el usuario vea "el espacio está completo" y no un genérico
de error de conexión.

El `count()` de la aplicación se conserva como *fast-fail* de interfaz: ahorra un
viaje a la base de datos en el caso común, pero no es la garantía.

### Cabeceras de seguridad

Definidas en `next.config.mjs`. La CSP es deliberadamente cerrada porque la app
**no carga nada de terceros**: sin fuentes externas, sin imágenes remotas, sin
analítica. `script-src` conserva `'unsafe-inline'` porque el App Router de Next 14
hidrata el payload de RSC con scripts en línea.

**Deuda conocida:** eliminar `'unsafe-inline'` exige nonces por request
generados en el middleware y propagados a la cabecera. No se hace porque el
beneficio es marginal en una app sin superficie de inyección en cliente, y
`next@14` tiene además un advisory propio sobre CSP con nonces
([GHSA-ffhc-5mcf-pf4q](https://github.com/advisories/GHSA-ffhc-5mcf-pf4q)). Se
reevalúa al saltar a 15/16.

### Separación de datos privados

El área individual nunca confía en el `usuarioId` del cliente: los esquemas Zod son
`.strict()` y lo rechazan; el propietario se deriva **siempre** de la sesión; y
los repositorios son *owner-first* (`findById(usuarioId, id)` devuelve `null` si la
fila no es suya). Los gastos anuales y el presupuesto individual son exclusivos
del área conjunta.

### El hash de la contraseña no sale de la capa de autenticación

`UsuarioConCredenciales` existe solo en `UsuarioRepository.findByUsername`. Los
demás métodos proyectan el usuario público `{ id, username }`. Ningún componente
ni Server Action recibe el hash.

---

## 4. Deuda aceptada a propósito

### Sesión sin revocación

La cookie es un token stateless firmado: `userId.expira.firma` con HMAC-SHA256 y
7 días de vigencia. No hay almacén en servidor, así que **no existe "cerrar
sesión en todos los dispositivos"**, ni rotación de token, ni revocación por
robo de cookie.

Es una decisión coherente con el alcance: la app es para 2 personas que
confían entre sí, y el coste de una tabla de sesiones (una fila por inicio de
sesión, lectura en cada request, invalidación explícita) no se paga con el
beneficio que daría. **La deuda es real y solo es aceptable mientras el
conflicto sea de confianza, no de adversaries.** Si la app creciera en usuarios
o manejara datos de terceros, esto dejaría de ser razonable y habría que migrar
a sesiones en servidor.

Verificado en tiempo constante: `crypto.subtle.verify` no permite el ataque de
tiempo sobre la firma. El mismo código (`src/lib/session/token.ts`) se usa en Node
y en Edge, precisamente para que ambos runtimes no diverjan.

### Sin migraciones versionadas

`drizzle/` está en `.gitignore`. El schema evoluciona con scripts idempotentes
en `scripts/`, y **un clon nuevo no puede reconstruir el historial**: hay que
ejecutar los cuatro scripts a mano y en orden. Es la deuda de ingeniería más
seria del proyecto y la primera que debería cerrarse. Detalle en §6.

### CSP con `'unsafe-inline'`

Ver §3.

### Sin reporte de errores en producción

`src/app/error.tsx` captura y muestra el fallo pero no lo reporta a ningún
servicio externo (`error.digest` se ignora). No hay logging estructurado ni
identificador de petición. Para una app en producción con datos financieros
esto no es suficiente; es una carencia asumida mientras no haya usuarios más
allá de las dos personas del espacio.

---

## 5. Plan de migración a Next 15/16

Cierra los 15 *high* y los 2 *critical* de `next` y `postcss`. Es el trabajo más
grande pendiente y no se ha empezado.

**Orden de ataque:**

1. Subir a **15.x** primero. React 19 es el cambio de fondo.
2. Migrar `params` y `searchParams` a `async` en las 12 páginas que las usan.
   Es el cambio más mecánico y el que más casos rompe.
3. Revisar el runtime: fijar `engines.node` **exacto** (Vercel retiró Node 20 sin
   aviso y tumbó el build en 2 s sin cambios en el repositorio).
4. Comprobar el Image Optimizer: si se sigue sin usar, dejarlo fuera reduce la
   superficie a cero.
5. Solo entonces saltar a **16.x** y reevaluar CSP con nonces.

**Qué no hay que romper:** los 403 tests existentes, la capa de dominio (no toca
Next) y la paridad entre las dos áreas de cuenta, vigilada por `arquitectura.test.ts`.

---

## 6. Deuda de ingeniería

| Deuda | Impacto | Plan |
|---|---|---|
| `drizzle/` sin versionar | Un clon nuevo no reconstruye el schema | Dejar de ignorar la carpeta, generar migraciones y commitearlas |
| Sin cobertura medida | No hay umbral ni número verificable | `@vitest/coverage-v8` + umbral en CI |
| Sin tests E2E | Los flujos críticos no se prueban en un navegador real | Playwright: login, alta de gasto, ventana de gracia, aislamiento del área individual |
| Sin `dotenv` en `devDependencies` | Dependencia de producción innecesaria | Mover: solo se usa en `scripts/` y `drizzle.config.ts` |
| `@types/node@^20` vs `engines.node: 24.x` | Tipos desalineados del runtime real | Subir a `@types/node@^24` |
| Sin `.editorconfig`, `.nvmrc`, `packageManager` | Convenciones implícitas | Añadir |
| ESLint 8 con `.eslintrc.json` | Config legacy | ESLint 9 + flat config, junto con el salto de Next |

---

## 7. Cuándo reevaluar

- **Al planificar el salto a Next 15/16** (§5): es el momento de cerrar los
  advisories de runtime.
- **En cada revisión de dependencias** (Dependabot corre semanalmente): confirmar
  que no aparece un advisory nuevo que afecte al artefacto desplegado, no solo al
  tooling.
- **Si el despliegue deja de ser Vercel o se autoaloja en Windows**, los dos
  *critical* de `next` dejan de ser inocuos y hay que actuar ya.
- **Si aparece un tercer usuario**, la sesión stateless deja de ser aceptable
  (§4).
- **Si la app se expone a Internet con datos de terceros**, hay que añadir CSP con
  nonces y reporte de errores (§3, §4).