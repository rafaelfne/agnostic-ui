import type { Money } from './money';

/** A single holding inside a portfolio. */
export interface Position {
  readonly id: string;
  readonly value: Money;
}

/**
 * Entity: aggregate of a customer's positions (manual, Parte 2.2).
 */
export interface Portfolio {
  readonly id: string;
  readonly positions: readonly Position[];
}
