import { describe, it, expect, vi } from 'vitest';
import { withProfile, SLOW_PROFILE_DELAY_MS } from '../infra/gateway/mock/withProfile';
import { MockGatewayError } from '../infra/gateway/mock/MockGatewayError';

describe('withProfile', () => {
  it('returns the happyPath fixture when the profile is undefined', async () => {
    await expect(withProfile(undefined, { happyPath: () => 'happy' })).resolves.toBe('happy');
  });

  it('returns the happyPath fixture for the happyPath profile', async () => {
    await expect(withProfile('happyPath', { happyPath: () => 'happy' })).resolves.toBe('happy');
  });

  it('returns the empty fixture for the empty profile when one is provided', async () => {
    await expect(
      withProfile('empty', { happyPath: () => 'happy', empty: () => 'empty' }),
    ).resolves.toBe('empty');
  });

  it('falls back to happyPath with a warning for empty when no empty fixture exists', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(
      withProfile('empty', { happyPath: () => 'happy', operation: 'getInvestFlow' }),
    ).resolves.toBe('happy');
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toContain('getInvestFlow');
    warn.mockRestore();
  });

  it('throws MockGatewayError carrying the operation for the error profile', async () => {
    await expect(
      withProfile('error', { happyPath: () => 'happy', operation: 'getBalance' }),
    ).rejects.toMatchObject({ code: 'mock_gateway_error', operation: 'getBalance' });
    await expect(withProfile('error', { happyPath: () => 'happy' })).rejects.toBeInstanceOf(
      MockGatewayError,
    );
  });

  it('delays then returns happyPath for the slow profile', async () => {
    vi.useFakeTimers();
    try {
      const pending = withProfile('slow', { happyPath: () => 'happy' });
      let settled = false;
      void pending.then(() => {
        settled = true;
      });
      await vi.advanceTimersByTimeAsync(SLOW_PROFILE_DELAY_MS - 1);
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await expect(pending).resolves.toBe('happy');
    } finally {
      vi.useRealTimers();
    }
  });
});
