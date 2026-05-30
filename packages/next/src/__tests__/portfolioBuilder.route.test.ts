import { describe, expect, it } from 'vitest';
import { GET as getRiskSelect } from '../app/api/portfolio-builder/risk-select/route';
import { GET as getPreview } from '../app/api/portfolio-builder/preview/route';
import { POST as postCreate } from '../app/api/portfolio-builder/create/route';
import {
  getPortfolioBuilderPreviewMock,
  getPortfolioBuilderRiskSelectMock,
  postPortfolioBuilderCreatePortfolioMock,
} from '../infra/gateway/mock/fixtures';

const SANDBOX_HEADERS = {
  authorization: 'Bearer app_sandbox_partnerco_happyPath',
  'x-tenant-id': 'partnerco',
};

function getReq(path: string, profile = 'happyPath'): Request {
  return new Request(`https://bff.test/api/portfolio-builder/${path}`, {
    headers: {
      authorization: `Bearer app_sandbox_partnerco_${profile}`,
      'x-tenant-id': 'partnerco',
    },
  });
}

function postReq(body: unknown, headers: Record<string, string> = SANDBOX_HEADERS): Request {
  return new Request('https://bff.test/api/portfolio-builder/create', {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('portfolio-builder routes', () => {
  it('GET /api/portfolio-builder/risk-select returns 200 with the happyPath fixture', async () => {
    const response = await getRiskSelect(getReq('risk-select'));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(getPortfolioBuilderRiskSelectMock());
  });

  it('GET /api/portfolio-builder/preview returns 200 for a valid riskLevel query', async () => {
    const response = await getPreview(getReq('preview?riskLevel=moderate'));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(getPortfolioBuilderPreviewMock());
  });

  it('GET /api/portfolio-builder/preview returns 422 when riskLevel is absent', async () => {
    const response = await getPreview(getReq('preview'));
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ error: 'Validation failed' });
  });

  it('POST /api/portfolio-builder/create returns 200 for a valid riskLevel', async () => {
    const response = await postCreate(postReq({ riskLevel: 'moderate' }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(postPortfolioBuilderCreatePortfolioMock());
  });

  it('POST /api/portfolio-builder/create returns 422 for an invalid riskLevel', async () => {
    const response = await postCreate(postReq({ riskLevel: 'extreme' }));
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ error: 'Validation failed' });
  });

  it('maps the error profile to 500 mock_gateway_error', async () => {
    const response = await getRiskSelect(getReq('risk-select', 'error'));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'mock_gateway_error' });
  });
});
