import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Las reglas de dominio y los repositorios se prueban en node; los
    // componentes de React necesitan DOM. `environmentMatchGlobs` mantiene
    // ambos mundos en un único comando sin Annotation por fichero.
    environment: 'node',
    environmentMatchGlobs: [['**/*.test.tsx', 'jsdom']],
    globals: true,
    // `.test.tsx` añade cobertura de UI: sin esto no había forma de comprobar
    // los componentes compartidos por las dos áreas de cuenta.
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', '.next'],
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});