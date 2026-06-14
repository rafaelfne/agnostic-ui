import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // A fundação (F1) é entregue em commits incrementais; os testes chegam nas tarefas seguintes.
    passWithNoTests: true,
    // Os testes do config store sobem um Postgres real em processo (pglite) + migrations
    // por caso; com o suite inteiro em paralelo a CPU satura e o default de 5s estoura.
    testTimeout: 30_000,
    // tsyringe precisa do polyfill de metadata carregado antes das classes decoradas.
    setupFiles: ['reflect-metadata'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
    },
  },
});
