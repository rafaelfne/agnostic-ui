import { describe, it, expect, vi, afterEach } from 'vitest';
import { CoreHttpGateway } from '../infra/gateway/http/CoreHttpGateway';

interface FetchInit {
  method: string;
  headers: Record<string, string>;
  body?: string;
}

function fakeResponse(status: number, data: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

function stubFetch(status: number, data: unknown) {
  const fetchMock = vi.fn(async (_url: string, _init: FetchInit) => fakeResponse(status, data));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('CoreHttpGateway', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('issues a GET to the base URL with bearer auth and parses the JSON body', async () => {
    vi.stubEnv('CORE_API_BASE_URL', 'https://core.test');
    const fetchMock = stubFetch(200, { netWorth: 1 });

    await expect(new CoreHttpGateway('tok_live').getBalance()).resolves.toEqual({ netWorth: 1 });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://core.test/balance');
    expect(init.method).toBe('GET');
    expect(init.headers.authorization).toBe('Bearer tok_live');
    expect(init.body).toBeUndefined();
  });

  it('sends a JSON body and content-type for POST operations', async () => {
    vi.stubEnv('CORE_API_BASE_URL', 'https://core.test');
    const fetchMock = stubFetch(200, { orderId: 'ord_1' });

    await expect(
      new CoreHttpGateway('tok_live').postInvestAmount({ amount: 1000 }),
    ).resolves.toEqual({ orderId: 'ord_1' });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://core.test/invest/amount');
    expect(init.method).toBe('POST');
    expect(init.headers['content-type']).toBe('application/json');
    expect(JSON.parse(init.body ?? '')).toEqual({ amount: 1000 });
  });

  it('rejects when the Core responds with a non-2xx status', async () => {
    vi.stubEnv('CORE_API_BASE_URL', 'https://core.test');
    stubFetch(500, { message: 'boom' });

    await expect(new CoreHttpGateway('tok_live').getBalance()).rejects.toThrow('core http 500');
  });
});
