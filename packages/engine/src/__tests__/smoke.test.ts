import { describe, expect, it } from 'vitest';

import { CONFIG_SCHEMA_VERSION, ENGINE_VERSION } from '../index';

describe('engine package', () => {
  it('exposes the engine version', () => {
    expect(ENGINE_VERSION).toBe('0.0.0');
  });

  it('exposes a numeric config schema version', () => {
    expect(CONFIG_SCHEMA_VERSION).toBeTypeOf('number');
  });
});
