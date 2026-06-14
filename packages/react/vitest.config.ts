import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
    },
  },
});
