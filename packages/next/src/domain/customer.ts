/**
 * Entity: the customer of a tenant's embedded experience (manual, Parte 2.2).
 * Identified by `id` (the resolved customerId) plus basic attributes.
 */
export interface Customer {
  readonly id: string;
  readonly displayName?: string;
}
