import { z } from 'zod';

/**
 * Input schemas for the investments slice (manual, Parte 2.5). All three are
 * read-only GETs keyed by the `customerId` from the resolved `executionContext`.
 */
const customerId = z.string().min(1, 'Customer ID is required');

export const GetInvestmentsCategorySchema = z.object({ customerId });

export const GetInvestmentsProductsSchema = z.object({ customerId });

export const GetInvestmentsProductsSummarySchema = z.object({ customerId });
