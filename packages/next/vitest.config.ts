import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // A fundação (F1) é entregue em commits incrementais; os testes chegam nas tarefas seguintes.
    passWithNoTests: true,
    // tsyringe precisa do polyfill de metadata carregado antes das classes decoradas.
    setupFiles: ['reflect-metadata'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
    },
  },
});
