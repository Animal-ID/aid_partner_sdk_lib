import { defineConfig } from 'vitest/config';

// Per-package coverage thresholds. The user requirement is ≥85% per package on the
// primary metrics (lines / functions / statements). Branch coverage is held a little
// lower (defensive fallbacks — e.g. crypto/uuid polyfill paths — are not all reachable).
const perPackage = { lines: 85, functions: 85, statements: 85, branches: 75 };

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      all: true,
      reporter: ['text', 'text-summary', 'html', 'json-summary'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts'],
      thresholds: {
        '**/packages/core/src/**': perPackage,
        '**/packages/react/src/**': perPackage,
        '**/packages/vue/src/**': perPackage,
        '**/packages/angular/src/**': perPackage,
        '**/packages/nestjs/src/**': perPackage,
      },
    },
  },
});
