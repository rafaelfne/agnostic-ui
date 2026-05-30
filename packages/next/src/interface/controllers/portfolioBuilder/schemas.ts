import { z } from 'zod';

/**
 * Input schemas for the portfolio-builder slice (manual, Parte 2.5). `risk-select`
 * is keyed only by the `customerId` from the `executionContext`; `preview` requires
 * a `riskLevel` query param (absent → 422); `create` validates a `riskLevel` enum in
 * the POST body (invalid → 422), with `customerId` always sourced from the context.
 */
const customerId = z.string().min(1, 'Customer ID is required');

export const GetPortfolioBuilderRiskSelectSchema = z.object({ customerId });

export const GetPortfolioBuilderPreviewSchema = z.object({
  customerId,
  riskLevel: z.string().min(1, 'Risk level is required'),
});

export const PostPortfolioBuilderCreatePortfolioSchema = z.object({
  customerId,
  riskLevel: z.enum(['low', 'moderate', 'high']),
});
