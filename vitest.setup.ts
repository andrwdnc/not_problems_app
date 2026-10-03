/**
 * Setup global de Vitest.
 *
 * Solo aporta los matchers de jest-dom, que se usan desde los tests de
 * componentes (`.test.tsx`). Los tests de dominio y repositorios (`.test.ts`)
 * corren en node y no dependen de nada de aquí.
 */
import '@testing-library/jest-dom/vitest';