import { describe, expect, it } from 'vitest';
import { GET as getHero } from '../app/api/portfolio-details/hero/route';
import { GET as getCustody } from '../app/api/consolidated-custody/route';
import { GET as getWallets } from '../app/api/wallets/route';
import {
  getConsolidatedCustodyMock,
  getPortfolioHeroMock,
  getUserWalletsMock,
} from '../infra/gateway/mock/fixtures';

function req(url: string, profile = 'happyPath'): Request {
  return new Request(url, {
    headers: {
      authorization: `Bearer app_sandbox_partnerco_${profile}`,
      'x-tenant-id': 'partnerco',
    },
  });
}

describe('hero / custody / wallets routes', () => {
  it('GET /api/portfolio-details/hero returns 200 with the happyPath fixture', async () => {
    const response = await getHero(req('https://bff.test/api/portfolio-details/hero'));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(getPortfolioHeroMock());
  });

  it('GET /api/consolidated-custody returns 200 with the happyPath fixture', async () => {
    const response = await getCustody(req('https://bff.test/api/consolidated-custody'));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(getConsolidatedCustodyMock());
  });

  it('GET /api/wallets returns 200 with the happyPath fixture', async () => {
    const response = await getWallets(req('https://bff.test/api/wallets'));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(getUserWalletsMock());
  });

  it('maps the error profile to 500 mock_gateway_error', async () => {
    const response = await getHero(req('https://bff.test/api/portfolio-details/hero', 'error'));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'mock_gateway_error' });
  });
});
