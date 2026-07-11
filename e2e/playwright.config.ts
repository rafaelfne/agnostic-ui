import path from 'node:path';

import { defineConfig, devices } from '@playwright/test';

import { BFF_PORT, BFF_URL, SPA_URL } from './helpers/env';

const REPO_ROOT = path.resolve(__dirname, '..');

/**
 * Respostas canned p/ a IA (Frente I) — o BFF de E2E roda com o seam FakeLlm
 * (`BUILDER_FAKE_LLM` em getLlm.ts). O propose chama o LLM duas vezes: triagem (veredito
 * `composition`) e geração (um ScreenDef válido). Determinístico, sem rede nem chave.
 */
const CANNED_LLM = JSON.stringify({
  triage: {
    config: { resolution: 'composition', rationale: 'compõe screen/kpi já existentes' },
    rationale: 'Resolve compondo o vocabulário existente.',
  },
  generate: {
    config: {
      id: 'e2e-ai-screen',
      route: '/e2e-ai-screen',
      dataFlow: 'get-balance',
      root: {
        type: 'screen',
        children: [{ type: 'kpi', props: { label: 'Saldo', value: '{{ balance.available }}' } }],
      },
    },
    rationale: 'Proposta canned do E2E (FakeLlm determinístico).',
  },
});

export default defineConfig({
  testDir: './tests',
  // Serial + 1 worker: o E2E bate num Supabase/store compartilhado; determinismo > velocidade.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: SPA_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: '.auth/publisher.json' },
      dependencies: ['setup'],
    },
  ],
  // Sobe o BFF (:3100, com FakeLlm) e o builder (:5173, proxy → :3100). Assume o Supabase
  // local de pé (pnpm setup:local). reuseExistingServer no dev; sempre fresco no CI.
  webServer: [
    {
      command: 'pnpm --filter @yukilabs/agnostic-ui-next dev',
      cwd: REPO_ROOT,
      url: BFF_URL,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: { PORT: String(BFF_PORT), BUILDER_FAKE_LLM: CANNED_LLM },
    },
    {
      command: 'pnpm --filter @yukilabs/agnostic-ui-builder dev',
      cwd: REPO_ROOT,
      url: SPA_URL,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: { VITE_PROXY_TARGET: BFF_URL },
    },
  ],
});
