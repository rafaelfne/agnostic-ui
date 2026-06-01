import { z } from 'zod';

/**
 * Input schema for the consolidated-custody slice (manual, Parte 2.5). Keyed only by
 * the `customerId` sourced from the `executionContext`.
 */
const customerId = z.string().min(1, 'Customer ID is required');

export const GetConsolidatedCustodySchema = z.object({ customerId });
