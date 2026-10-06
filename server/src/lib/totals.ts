import { countryProfile } from '../data/countries.js';
import { round2, toNumber } from './money.js';
import { resolveTaxTreatment, type TaxTreatment } from './tax.js';

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
  /** ISO country of the seller. Absent means India, which is every older record. */
  supplierCountry?: string | null;
  /** ISO country of the buyer. Absent means the same country as the seller. */
  placeOfSupplyCountry?: string | null;
};

export type TaxSlab = {
  gstRate: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  /** The slab's whole tax, however it is split. */
  tax: number;
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
  /** How this document is taxed, and what to call the tax. */
  treatment: TaxTreatment;
  /** The tax rows to print, already named and totalled. */
  taxLines: { label: string; amount: number }[];
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

  const seller = countryProfile(input.supplierCountry);
  const treatment = resolveTaxTreatment({
    sellerCountry: input.supplierCountry,
    sellerStateCode: input.supplierStateCode,
    buyerCountry: input.placeOfSupplyCountry,
    buyerStateCode: input.placeOfSupplyCode,
  });
  const isIntraState = treatment.splitCgstSgst;
  const untaxed = treatment.zeroRated || treatment.kind === 'NONE';

  const flatRate = toNumber(input.flatGstRate, seller.defaultTaxRate);
  const bySlab = new Map<number, { taxable: number }>();

  items.forEach((item, i) => {
    const share = subtotal > 0 ? itemAmounts[i] / subtotal : 0;
    const lineTaxable = round2(itemAmounts[i] - discountAmount * share);
    const rate = input.taxMode === 'FLAT' ? flatRate : toNumber(item.gstRate, seller.defaultTaxRate);
    const slab = bySlab.get(rate) ?? { taxable: 0 };
    slab.taxable = round2(slab.taxable + lineTaxable);
    bySlab.set(rate, slab);
  });

  const slabs: TaxSlab[] = [...bySlab.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([gstRate, { taxable }]) => {
      // An export is taxed at zero, so the slabs still show but carry nothing.
      const tax = untaxed ? 0 : round2(taxable * (gstRate / 100));
      const split = treatment.splitCgstSgst;
      return {
        gstRate,
        taxableValue: taxable,
        cgst: split ? round2(tax / 2) : 0,
        sgst: split ? round2(tax - round2(tax / 2)) : 0,
        igst: split || treatment.kind !== 'INDIA_INTER' ? 0 : tax,
        tax,
      };
    });

  const cgst = round2(slabs.reduce((a, s) => a + s.cgst, 0));
  const sgst = round2(slabs.reduce((a, s) => a + s.sgst, 0));
  const igst = round2(slabs.reduce((a, s) => a + s.igst, 0));
  const totalTax = round2(slabs.reduce((a, s) => a + s.tax, 0));

  // Named rows rather than three fixed columns, so a country with one tax line
  // prints one tax line and India still prints its split.
  const taxLines: { label: string; amount: number }[] = [];
  if (treatment.splitCgstSgst) {
    if (cgst) taxLines.push({ label: `C${treatment.label}`, amount: cgst });
    if (sgst) taxLines.push({ label: `S${treatment.label}`, amount: sgst });
  } else if (totalTax) {
    taxLines.push({ label: treatment.label, amount: totalTax });
  }

  // Indian tax invoices round to the whole rupee and show the difference.
  // A dollar invoice of 1,204.37 should stay 1,204.37.
  const preRound = round2(taxableValue + totalTax);
  const grandTotal = seller.roundTotals ? Math.round(preRound) : preRound;
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
    treatment,
    taxLines,
    itemAmounts,
  };
}
