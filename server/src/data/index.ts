import { B2B_CATALOG } from './catalog-b2b.js';
import { RESIDENTIAL_CATALOG } from './catalog-residential.js';
import { RETAIL_CATALOG } from './catalog-retail.js';
import type { CatalogSeed } from './catalog-types.js';
import { HARDWARE_TIERS, LAMINATE_TIERS, WOOD_TIERS, type SpecTierSeed } from './spec-tiers.js';

export * from './business-types.js';
export * from './spec-tiers.js';
export * from './company.js';
export type { CatalogSeed } from './catalog-types.js';

/** Starter catalog per business-type key. */
export const CATALOGS: Record<string, CatalogSeed[]> = {
  INTERIOR: RESIDENTIAL_CATALOG,
  RETAIL_BRANDING: RETAIL_CATALOG,
  B2B_PROCUREMENT: B2B_CATALOG,
};

/**
 * Specification tiers per business-type key. Only interiors is tiered today —
 * retail branding and procurement price from their own catalogues.
 */
export const SPEC_TIERS: Record<string, SpecTierSeed[]> = {
  INTERIOR: [...WOOD_TIERS, ...LAMINATE_TIERS, ...HARDWARE_TIERS],
};
