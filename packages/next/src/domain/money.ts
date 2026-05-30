/**
 * Value object: a monetary amount with consistent formatting (manual, Parte 2.2).
 * The amount is held in major units (e.g. 12.34) alongside an ISO 4217 currency.
 */
export interface Money {
  readonly amount: number;
  readonly currency: string;
}

export function money(amount: number, currency: string): Money {
  return { amount, currency };
}

/** Formats a Money value using the locale's currency conventions. */
export function formatMoney(value: Money, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: value.currency,
  }).format(value.amount);
}
