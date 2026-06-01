/**
 * Thrown by the mock gateway when the `error` profile is active (manual, Parte
 * 2.4.2 / 6.3). Carries the failing operation for diagnostics; the HTTP mapping
 * (`mock_gateway_error` → 500) is applied by the route/controller layer in F3.
 */
export class MockGatewayError extends Error {
  readonly code = 'mock_gateway_error' as const;

  constructor(readonly operation?: string) {
    super(operation ? `mock gateway error in ${operation}` : 'mock gateway error');
    this.name = 'MockGatewayError';
  }
}
