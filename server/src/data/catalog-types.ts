/** One row of a starter catalog. Rates are indicative and meant to be edited. */
export type CatalogSeed = {
  name: string;
  category: string;
  unit: string;
  /** Selling rate per unit, excluding GST. */
  defaultRate: number;
  /** What it costs you. Never printed — this is what makes margin real. */
  costPrice: number;
  hsnSac: string;
  /** Defaults to 18 when omitted. */
  gstRate?: number;
  specNote: string;
  sku?: string;
  brand?: string;
};
