import { round2, toNumber } from './money.js';

export type ComputableItem = {
  description?: string;
  hsnSac?: string | null;
  unit?: string | null;
  quantity?: number;
  rate?: number;
  costPrice?: number;
  discountPct?: number;
  gstRate?: number;
};

export type ComputableSection = { name?: string; items: ComputableItem[] };

export type TotalsInput = {
  sections: ComputableSection[];
  taxMode: 'FULL_GST' | 'FLAT' | string;
  flatGstRate?: number;
  discountType: 'NONE' | 'PERCENT' | 'AMOUNT' | string;
  discountValue?: number;
  /** GSTIN state code of the seller (Telangana = 36). */
  supplierStateCode?: string | null;
  /** GSTIN state code of the place of supply. */
  placeOfSupplyCode?: string | null;
};

export type TaxSlab = {
  gstRate: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
};

export type Totals = {
  subtotal: number;
  discountAmount: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  totalCost: number;
  grossProfit: number;
  marginPct: number;
  isIntraState: boolean;
  slabs: TaxSlab[];
  /** Per-item amount, aligned to the flattened section/item order. */
  itemAmounts: number[];
};

export function lineAmount(item: ComputableItem): number {
  const gross = toNumber(item.quantity, 0) * toNumber(item.rate, 0);
  const afterDiscount = gross * (1 - toNumber(item.discountPct, 0) / 100);
  return round2(afterDiscount);
}

/**
 * Single source of truth for quote/invoice arithmetic.
 *
 * A document-level discount is spread across lines in proportion to their value
 * so that each line still carries the right GST, and CGST/SGST vs IGST is
 * decided by comparing the seller's state code with the place of supply.
 */
export function computeTotals(input: TotalsInput): Totals {
  const items = input.sections.flatMap((s) => s.items ?? []);
  const itemAmounts = items.map(lineAmount);
  const subtotal = round2(itemAmounts.reduce((a, b) => a + b, 0));

  let discountAmount = 0;
  if (input.discountType === 'PERCENT') {
    discountAmount = round2(subtotal * (toNumber(input.discountValue, 0) / 100));
  } else if (input.discountType === 'AMOUNT') {
    discountAmount = round2(toNumber(input.discountValue, 0));
  }
  discountAmount = Math.min(Math.max(discountAmount, 0), subtotal);

  const taxableValue = round2(subtotal - discountAmount);

  const supplier = (input.supplierStateCode || '').trim();
  const place = (input.placeOfSupplyCode || '').trim();
  // Default to intra-state when the place of supply is unknown — it is the
  // common case for a Telangana studio and keeps totals sane before the client
  // address is filled in.
  const isIntraState = !place || !supplier ? true : place === supplier;

  const flatRate = toNumber(input.flatGstRate, 18);
  const bySlab = new Map<number, { taxable: number }>();

  items.forEach((item, i) => {
    const share = subtotal > 0 ? itemAmounts[i] / subtotal : 0;
    const lineTaxable = round2(itemAmounts[i] - discountAmount * share);
    const rate = input.taxMode === 'FLAT' ? flatRate : toNumber(item.gstRate, 18);
    const slab = bySlab.get(rate) ?? { taxable: 0 };
    slab.taxable = round2(slab.taxable + lineTaxable);
    bySlab.set(rate, slab);
  });

  const slabs: TaxSlab[] = [...bySlab.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([gstRate, { taxable }]) => {
      const tax = round2(taxable * (gstRate / 100));
      return {
        gstRate,
        taxableValue: taxable,
        cgst: isIntraState ? round2(tax / 2) : 0,
        sgst: isIntraState ? round2(tax - round2(tax / 2)) : 0,
        igst: isIntraState ? 0 : tax,
      };
    });

  const cgst = round2(slabs.reduce((a, s) => a + s.cgst, 0));
  const sgst = round2(slabs.reduce((a, s) => a + s.sgst, 0));
  const igst = round2(slabs.reduce((a, s) => a + s.igst, 0));
  const totalTax = round2(cgst + sgst + igst);

  const preRound = round2(taxableValue + totalTax);
  const grandTotal = Math.round(preRound);
  const roundOff = round2(grandTotal - preRound);

  const totalCost = round2(
    items.reduce((a, it) => a + toNumber(it.costPrice, 0) * toNumber(it.quantity, 0), 0),
  );
  const grossProfit = round2(taxableValue - totalCost);
  const marginPct = taxableValue > 0 ? round2((grossProfit / taxableValue) * 100) : 0;

  return {
    subtotal,
    discountAmount,
    taxableValue,
    cgst,
    sgst,
    igst,
    totalTax,
    roundOff,
    grandTotal,
    totalCost,
    grossProfit,
    marginPct,
    isIntraState,
    slabs,
    itemAmounts,
  };
}
