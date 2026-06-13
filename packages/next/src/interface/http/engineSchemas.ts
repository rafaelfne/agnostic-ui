import type { z } from 'zod';

import { GetCatalogProductDetailsSchema } from '../controllers/catalog/schemas';
import { PostInvestAmountSchema, PostInvestIntentionSchema } from '../controllers/invest/schemas';
import {
  GetPortfolioBuilderPreviewSchema,
  PostPortfolioBuilderCreatePortfolioSchema,
} from '../controllers/portfolioBuilder/schemas';

/**
 * Named schemas the engine's `validate` operator resolves by reference (Fase C).
 * Reuses the controllers' Zod schemas — single source of truth — so an
 * engine-served flow rejects the same inputs (with the same 422 message) as its
 * hardcoded counterpart. The engine stays schema-agnostic; this is the host registry.
 */
const SCHEMAS: Record<string, z.ZodTypeAny> = {
  GetCatalogProductDetails: GetCatalogProductDetailsSchema,
  GetPortfolioBuilderPreview: GetPortfolioBuilderPreviewSchema,
  PostInvestAmount: PostInvestAmountSchema,
  PostInvestIntention: PostInvestIntentionSchema,
  PostPortfolioBuilderCreatePortfolio: PostPortfolioBuilderCreatePortfolioSchema,
};

export function resolveSchema(ref: string): z.ZodTypeAny | undefined {
  return SCHEMAS[ref];
}
