import { B2B_CATALOG } from './catalog-b2b.js';
import { RESIDENTIAL_CATALOG } from './catalog-residential.js';
import { RETAIL_CATALOG } from './catalog-retail.js';
import type { CatalogSeed } from './catalog-types.js';

export * from './business-types.js';
export * from './company.js';
export type { CatalogSeed } from './catalog-types.js';

/** Starter catalog per business-type key. */
export const CATALOGS: Record<string, CatalogSeed[]> = {
  INTERIOR: RESIDENTIAL_CATALOG,
  RETAIL_BRANDING: RETAIL_CATALOG,
  B2B_PROCUREMENT: B2B_CATALOG,
};
