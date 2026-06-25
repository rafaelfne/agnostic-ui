import { ExpressionError } from '../errors';
import type { ExpressionFunction } from '../schemas/expression';

/** Locale used by the formatting functions when none is provided. */
export const DEFAULT_LOCALE = 'en-US';

/** Ambient, deterministic context handed to every curated function. */
export interface EvalContext {
  readonly locale: string;
}

export type CuratedFunction = (args: unknown[], ctx: EvalContext) => unknown;

const toText = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value);

function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw new ExpressionError(`expected a finite number, got ${typeof value}`);
  }
  return n;
}

/**
 * The curated function library. Pure given `(args, ctx)`: no I/O, no globals, no
 * ambient clock. The formatting functions use `Intl` with the evaluation locale,
 * and `date` pins UTC so output is reproducible for the conformance corpus.
 */
export const CURATED_FUNCTIONS: Record<ExpressionFunction, CuratedFunction> = {
  upper: (args) => toText(args[0]).toUpperCase(),
  lower: (args) => toText(args[0]).toLowerCase(),
  uppercase: (args) => toText(args[0]).toUpperCase(),
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
  currency: (args, ctx) => {
    const code = toText(args[1]);
    if (!code) throw new ExpressionError('currency(value, code): missing currency code');
    return new Intl.NumberFormat(ctx.locale, {
      style: 'currency',
      currency: code,
    }).format(toNumber(args[0]));
  },
  percent: (args, ctx) => {
    const digits = typeof args[1] === 'number' ? args[1] : 0;
    return new Intl.NumberFormat(ctx.locale, {
      style: 'percent',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(toNumber(args[0]));
  },
  date: (args, ctx) => {
    const input = args[0];
    const date = typeof input === 'number' ? new Date(input) : new Date(toText(input));
    if (Number.isNaN(date.getTime())) {
      throw new ExpressionError(`date(): invalid date ${toText(input)}`);
    }
    return new Intl.DateTimeFormat(ctx.locale, { timeZone: 'UTC' }).format(date);
  },
};
