import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/usecases/**/*.ts',
        'src/adapters/parsers/**/*.ts',
        'src/adapters/security/**/*.ts',
        'src/adapters/repositories/**/*.ts',
        'src/config/**/*.ts'
      ],
      exclude: [
        'src/tests/**',
        'src/domain/ports/**'
      ],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 70
      }
    }
  }
});
