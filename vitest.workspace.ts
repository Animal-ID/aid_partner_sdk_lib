import { fileURLToPath } from 'node:url';
import { defineWorkspace } from 'vitest/config';

// Resolve cross-package imports of @animal-id/partner-core to its TypeScript source,
// so tests run without a prior build and coverage instruments the real source files.
const alias = {
  '@animal-id/partner-core': fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url)),
};

// Angular/NestJS rely on legacy decorators; tell esbuild to keep them.
const decoratorEsbuild = {
  tsconfigRaw: {
    compilerOptions: {
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      useDefineForClassFields: false,
    },
  },
} as const;

export default defineWorkspace([
  {
    resolve: { alias },
    test: {
      name: 'core',
      environment: 'node',
      include: ['packages/core/test/**/*.test.ts'],
    },
  },
  {
    resolve: { alias },
    test: {
      name: 'react',
      environment: 'jsdom',
      include: ['packages/react/test/**/*.test.{ts,tsx}'],
    },
  },
  {
    resolve: { alias },
    test: {
      name: 'vue',
      environment: 'jsdom',
      include: ['packages/vue/test/**/*.test.ts'],
    },
  },
  {
    resolve: { alias },
    esbuild: decoratorEsbuild,
    test: {
      name: 'angular',
      environment: 'node',
      include: ['packages/angular/test/**/*.test.ts'],
    },
  },
  {
    resolve: { alias },
    esbuild: decoratorEsbuild,
    test: {
      name: 'nestjs',
      environment: 'node',
      setupFiles: ['packages/nestjs/test/setup.ts'],
      include: ['packages/nestjs/test/**/*.test.ts'],
    },
  },
]);
