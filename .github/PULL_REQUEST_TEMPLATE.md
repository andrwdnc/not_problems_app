## Qué cambia este PR

<!-- Una o dos frases. En qué problema del usuario se traduce este cambio. -->

Closes #

## Tipo de cambio

- [ ] Bug fix (no-breaking)
- [ ] Funcionalidad nueva (no-breaking)
- [ ] Refactor / limpieza (sin cambio de comportamiento)
- [ ] Cambio que rompe algo (⚠️ describe el impacto y la ruta de migración)

## Checklist

- [ ] `npm run typecheck` pasa
- [ ] `npm run lint` pasa
- [ ] `npm run test` pasa
- [ ] Si toca `src/domain/**`: hay test nuevo o actualizado que cubre el comportamiento
      (la aritmética del dinero y las ventanas de permiso **exigen** cobertura)
- [ ] Los textos nuevos de interfaz salen de `src/literals/`, no están hardcodeados en el componente
- [ ] Si toca datos: hay migración idempotente en `scripts/` y es seguro ejecutarla dos veces
- [ ] Si toca auth o datos privados: he comprobado que el propietario se sigue derivando de la sesión

## Commit

- [ ] Mensajes en inglés y con [Conventional Commits](https://www.conventionalcommits.org/)
      (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`), modo imperativo
- [ ] Los commits son atómicos: uno por responsabilidad

## Capturas

<!-- ¿Cambia algo visible? Adjunta antes/después. Si es solo backend, dilo aquí. -->

## Notas de implementación

<!--
Decisiones que un revisor no puede inferir del diff: por qué este enfoque y no el
alternativo, qué trade-off se acepta, qué se deja fuera a propósito.
-->