import type { Scope } from '../context/flowContext';
import { ExpressionError } from '../errors';

/** Segments that could reach the prototype chain are never traversable. */
const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor']);

/**
 * Reads a dotted path from the scope safely: own enumerable-or-indexed props
 * only, never the prototype chain, and a hard block on pollution segments. A
 * missing hop yields `undefined` (back-compat with the spike's reduce) rather
 * than throwing.
 */
export function readPath(path: string, scope: Scope): unknown {
  let current: unknown = scope;
  for (const segment of path.split('.')) {
    if (FORBIDDEN_SEGMENTS.has(segment)) {
      throw new ExpressionError(`forbidden path segment: ${segment}`);
    }
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    if (!Object.prototype.hasOwnProperty.call(current, segment)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}
