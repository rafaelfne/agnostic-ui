import type { ExpressionFunction } from '../schemas/expression';

export type CuratedFunction = (args: unknown[]) => unknown;

const toText = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value);

/**
 * The curated function library. Every entry is pure and deterministic — no I/O,
 * no access to globals, no locale-dependent formatting.
 */
export const CURATED_FUNCTIONS: Record<ExpressionFunction, CuratedFunction> = {
  upper: (args) => toText(args[0]).toUpperCase(),
  lower: (args) => toText(args[0]).toLowerCase(),
  concat: (args) => args.map(toText).join(''),
  coalesce: (args) => {
    for (const arg of args) {
      if (arg !== null && arg !== undefined) return arg;
    }
    return null;
  },
  format: (args) => {
    const value = args[0];
    if (typeof value === 'number') {
      const digits = typeof args[1] === 'number' ? args[1] : 0;
      return value.toFixed(Math.max(0, Math.min(20, digits)));
    }
    return toText(value);
  },
  len: (args) => {
    const value = args[0];
    if (typeof value === 'string' || Array.isArray(value)) return value.length;
    return 0;
  },
};
