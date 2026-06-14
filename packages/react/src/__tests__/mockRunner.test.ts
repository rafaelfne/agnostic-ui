import { describe, expect, it } from 'vitest';

import { type MockFixtures, createMockRunner } from '../mockRunner';

const fixtures: MockFixtures = {
  core: {
    getBalance: {
      happyPath: () => ({ netWorth: 10 }),
      empty: () => ({ netWorth: 0 }),
    },
  },
};

const call = (operation: string, profile: 'happyPath' | 'empty' | 'error' | undefined) => ({
  integration: 'core',
  operation,
  input: {},
  profile,
});

describe('createMockRunner', () => {
  it('returns the happyPath fixture by default', async () => {
    await expect(createMockRunner(fixtures).run(call('getBalance', 'happyPath'))).resolves.toEqual({
      netWorth: 10,
    });
  });

  it('returns the empty fixture for the empty profile', async () => {
    await expect(createMockRunner(fixtures).run(call('getBalance', 'empty'))).resolves.toEqual({
      netWorth: 0,
    });
  });

  it('throws a mock_gateway_error for the error profile', async () => {
    await expect(createMockRunner(fixtures).run(call('getBalance', 'error'))).rejects.toMatchObject(
      {
        code: 'mock_gateway_error',
      },
    );
  });

  it('rejects an unknown operation', async () => {
    await expect(createMockRunner(fixtures).run(call('nope', 'happyPath'))).rejects.toThrow(
      /unknown integration op/,
    );
  });
});
