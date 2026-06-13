import { describe, expect, it } from 'vitest';

import {
  ConfigError,
  EngineError,
  ExpressionError,
  IntegrationError,
  ValidationError,
  extractCode,
} from '../errors';

describe('engine errors', () => {
  it('ValidationError carries kind, code and missing fields', () => {
    const err = new ValidationError(['customerId']);
    expect(err).toBeInstanceOf(EngineError);
    expect(err.kind).toBe('validation');
    expect(err.code).toBe('validation_failed');
    expect(err.missing).toEqual(['customerId']);
    expect(err.message).toContain('customerId');
  });

  it('IntegrationError surfaces the underlying error code when present', () => {
    const mockGatewayError = Object.assign(new Error('boom'), { code: 'mock_gateway_error' });
    const err = new IntegrationError('core', 'getBalance', { cause: mockGatewayError });
    expect(err.kind).toBe('integration');
    expect(err.code).toBe('mock_gateway_error');
    expect(err.integration).toBe('core');
    expect(err.operation).toBe('getBalance');
    expect(err.cause).toBe(mockGatewayError);
  });

  it('IntegrationError falls back to a generic code without a coded cause', () => {
    expect(new IntegrationError('core', 'getBalance').code).toBe('integration_failed');
    expect(new IntegrationError('core', 'getBalance', { cause: new Error('x') }).code).toBe(
      'integration_failed',
    );
  });

  it('ExpressionError and ConfigError have stable kinds', () => {
    expect(new ExpressionError('bad path').kind).toBe('expression');
    expect(new ConfigError('bad flow').kind).toBe('config');
  });

  it('extractCode reads a string code, ignores everything else', () => {
    expect(extractCode({ code: 'x' })).toBe('x');
    expect(extractCode({ code: 42 })).toBeUndefined();
    expect(extractCode(null)).toBeUndefined();
    expect(extractCode('str')).toBeUndefined();
  });
});
