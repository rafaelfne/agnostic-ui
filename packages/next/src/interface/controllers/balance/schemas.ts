import { z } from 'zod';

/**
 * Input schema for `getBalance` (manual, Parte 2.5.2). `customerId` comes from
 * the resolved `executionContext`, never from the client.
 */
export const GetBalanceSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
});
