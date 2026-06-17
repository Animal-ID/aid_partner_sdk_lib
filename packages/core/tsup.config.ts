import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2020',
  // node:crypto is only touched as a runtime fallback for Node < 19; never bundle it.
  external: ['node:crypto'],
});
