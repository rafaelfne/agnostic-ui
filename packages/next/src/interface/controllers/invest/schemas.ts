import { z } from 'zod';

/**
 * Input schemas for the invest slice (manual, Parte 2.5). `customerId` always
 * comes from the resolved `executionContext` (never the client). The POST bodies
 * carry client fields and are the showcase for 422 validation.
 */
const customerId = z.string().min(1, 'Customer ID is required');

export const GetInvestFlowSchema = z.object({ customerId });

export const GetInvestReviewSchema = z.object({ customerId });

export const PostInvestAmountSchema = z.object({
  customerId,
  productId: z.string().min(1, 'Product ID is required'),
  amount: z.number().int('Amount must be an integer').positive('Amount must be greater than zero'),
});

export const PostInvestIntentionSchema = z.object({
  customerId,
  productId: z.string().min(1, 'Product ID is required'),
});
