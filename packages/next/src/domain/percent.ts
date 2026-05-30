/**
 * Value object: a percentage with controlled precision (manual, Parte 2.2).
 * Held as a fraction (0.075 = 7.5%); display precision is chosen at format time.
 */
export interface Percent {
  readonly fraction: number;
}

export function percent(fraction: number): Percent {
  return { fraction };
}

/** Formats a Percent value with a fixed number of fraction digits. */
export function formatPercent(value: Percent, fractionDigits = 2, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value.fraction);
}
