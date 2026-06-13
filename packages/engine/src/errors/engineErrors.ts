/**
 * Error taxonomy of the engine. The engine is HTTP-agnostic: it never knows
 * about status codes. Every failure carries a stable {@link ErrorKind} + a
 * machine-readable `code`, and the host (BFF) maps those to HTTP — that is where
 * the 422-for-validation / 500-for-integration mapping lives (ADR 0002).
 */
export type ErrorKind = 'validation' | 'integration' | 'expression' | 'config' | 'internal';

/** Base class for every error the engine raises. */
export abstract class EngineError extends Error {
  /** Coarse classification used by the host to pick an HTTP status. */
  abstract readonly kind: ErrorKind;
  /** Stable, machine-readable code for host mapping and structured logs. */
  abstract readonly code: string;
}

/** A single field-level validation problem (host-neutral; e.g. from a Zod issue). */
export interface ValidationIssue {
  path: string;
  message: string;
}

/** Raised by the `validate` operator when fields are missing/empty or fail a schema. */
export class ValidationError extends EngineError {
  readonly kind: ErrorKind = 'validation';
  readonly code = 'validation_failed';
  readonly missing: readonly string[];
  readonly issues: readonly ValidationIssue[];

  constructor(missing: readonly string[], issues: readonly ValidationIssue[] = []) {
    super(`validation_failed: ${missing.join(', ')}`);
    this.name = 'ValidationError';
    this.missing = missing;
    this.issues = issues;
  }
}

/** Raised by `call-integration` when the underlying integration call fails. */
export class IntegrationError extends EngineError {
  readonly kind: ErrorKind = 'integration';
  /** Surfaces the underlying error's `code` when present; generic across adapters. */
  readonly code: string;
  readonly integration: string;
  readonly operation: string;

  constructor(integration: string, operation: string, options?: { cause?: unknown }) {
    super(`integration ${integration}.${operation} failed`, { cause: options?.cause });
    this.name = 'IntegrationError';
    this.integration = integration;
    this.operation = operation;
    this.code = extractCode(options?.cause) ?? 'integration_failed';
  }
}

/** Raised by the expression evaluator on unsafe/invalid expressions. */
export class ExpressionError extends EngineError {
  readonly kind: ErrorKind = 'expression';
  readonly code = 'expression_failed';

  constructor(message: string) {
    super(message);
    this.name = 'ExpressionError';
  }
}

/** Raised when a config artifact fails schema validation or references are broken. */
export class ConfigError extends EngineError {
  readonly kind: ErrorKind = 'config';
  readonly code = 'invalid_config';

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = 'ConfigError';
  }
}

/**
 * Extracts a stable string `code` from an arbitrary thrown value when it exposes
 * one (e.g. the BFF's `MockGatewayError.code === 'mock_gateway_error'`). Keeps
 * the engine generic: it propagates whatever code the integration tagged, and
 * the host decides the HTTP for it.
 */
export function extractCode(cause: unknown): string | undefined {
  if (cause !== null && typeof cause === 'object' && 'code' in cause) {
    const { code } = cause as { code: unknown };
    if (typeof code === 'string') return code;
  }
  return undefined;
}
