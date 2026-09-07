# Seguridad y dependencias pendientes

Estado revisado con `npm audit` (Next.js 14.2.35, Node 20.x). Se documentan los
advisories que quedan **intencionadamente** sin resolver y la decisión tomada,
para no re-plantearlo en cada revisión.

## Resuelto

- **Next.js 14.2.0 → 14.2.35**: corrige el advisory de alta sobre divulgación de
  *function* endpoints del servidor (GHSA-955p-x3mx-jcvp). Actualizado el
  07/09/2026 junto a `eslint-config-next`.
- **Fuga de `passwordHash` al cliente (politica de diseño)**: el usuario canónico
  de dominio es público (`{ id, username }`); las credenciales (`passwordHash`)
  solo se exponen en `UsuarioRepository.findByUsername` (uso exclusivo del login)
  mediante `UsuarioConCredenciales`, y los repositorios (`findById`, `findAll`)
  proyectan el usuario sin el hash. Las Server Actions y los componentes de tipo
  `'use client'` reciben únicamente el objeto público.

## Advisories restantes (12: 5 moderate, 6 high, 1 critical)

| Paquete | Severidad | Impacto | Postura |
|---|---|---|---|
| `vitest` | critical | Lectura/ejecución de archivos cuando el servidor **UI** de Vitest está escuchando (GHSA asociada a `vite`/`vite-node`) | **Dev-only.** No se usa `vitest --ui` en CI ni local. Aceptado. |
| `glob` (vía `eslint-config-next`) | high | Inyección de comandos en la CLI de `glob` con `-c/--cmd` | **Dev-only** (tooling de lint). El fix exige `eslint-config-next@16` (rotura). Aceptado. |
| `postcss` | high | XSS / lectura de archivos vía `sourceMappingURL` malicioso | Transitiva de Next/Tailwind. Fix solo vía major de Next. Aceptado. |
| `next` (DoS) | high | Image optimizer (remotePatterns), deserialización RSC, request smuggling en rewrites, cache de imagen ilimitada | Requieren **Next 16** (major). Evaluar al planificar un salto de major. Aceptado de momento. |

## Decisión

- **Permanecer en Next.js 14.2.35** (mismo minor, estable y probado) mientras la
  app esté en pruebas. Los DoS de `next` y los de `postcss` se limpiarían con un
  salto a Next 15/16, que implica breaking changes (React 19, runtime, params
  async) y se abordará como migración planificada si la app sale a producción.
- Los dev-only (`vitest` UI, `glob`) no afectan al artefacto desplegado y se
  actualizarán con su rotura correspondiente.

## Cuándo re-evaluar

- Antes de un despliegue de producción serio: planificar Next 15/16.
- En cada revisión de dependencias (dependabot/`npm audit`), confirmar que
  aparecen parches de minor dentro de 14.x.