import { z } from 'zod';

/**
 * Input schemas for the catalog slice (manual, Parte 2.5). `category` and
 * `portfolios` are keyed only by the `customerId` from the `executionContext`;
 * `product-details` additionally requires a `productId` query param (absent → 422).
 */
const customerId = z.string().min(1, 'Customer ID is required');

export const GetCatalogCategorySchema = z.object({ customerId });

export const GetCatalogProductDetailsSchema = z.object({
  customerId,
  productId: z.string().min(1, 'Product ID is required'),
});

export const GetCatalogPortfoliosSchema = z.object({ customerId });
