import { z } from 'zod';

/**
 * Input schema for the portfolio-details slice (manual, Parte 2.5). Keyed only by
 * the `customerId` sourced from the `executionContext`.
 */
const customerId = z.string().min(1, 'Customer ID is required');

export const GetPortfolioHeroSchema = z.object({ customerId });
