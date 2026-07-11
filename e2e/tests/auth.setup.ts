import { expect, test as setup } from '@playwright/test';

import { SEED } from '../helpers/api';

const AUTH_FILE = '.auth/publisher.json';

/**
 * Autentica o publisher pela UI do SPA (login GoTrue real) e salva o storageState —
 * os demais specs de browser reusam a sessão sem re-logar. Cobre, de passagem, a
 * jornada de login. A sessão persiste em localStorage (`agnostic-builder-session`).
 */
setup('autentica publisher via UI', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#email', SEED.publisher.email);
  await page.fill('#password', SEED.publisher.password);
  await page.click('button[type=submit]');

  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('agnostic-builder-session')), {
      timeout: 10_000,
    })
    .not.toBeNull();

  await page.context().storageState({ path: AUTH_FILE });
});
