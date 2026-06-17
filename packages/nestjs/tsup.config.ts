import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2020',
  external: ['@nestjs/common', 'reflect-metadata', 'rxjs', '@animal-id/partner-core', 'node:crypto'],
});
