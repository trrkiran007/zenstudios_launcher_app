import type { QuotationSection } from './types';

export const round2 = (n: number) =>
  Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : 0;

export const lineAmount = (item: { quantity?: number; rate?: number; discountPct?: number }) =>
  round2((Number(item.quantity) || 0) * (Number(item.rate) || 0) * (1 - (Number(item.discountPct) || 0) / 100));

export type Totals = ReturnType<typeof computeTotals>;

/**
 * Mirrors the server's arithmetic so the editor can show live totals without a
 * round trip. The server figure is always authoritative on save.
 */
export function computeTotals(input: {
  sections: QuotationSection[];
  taxMode: 'FULL_GST' | 'FLAT';
  flatGstRate: number;
  discountType: 'NONE' | 'PERCENT' | 'AMOUNT';
  discountValue: number;
  supplierStateCode?: string | null;
  placeOfSupplyCode?: string | null;
}) {
  const items = input.sections.flatMap((s) => s.items);
  const amounts = items.map(lineAmount);
  const subtotal = round2(amounts.reduce((a, b) => a + b, 0));

  let discountAmount = 0;
  if (input.discountType === 'PERCENT') discountAmount = round2(subtotal * ((input.discountValue || 0) / 100));
  else if (input.discountType === 'AMOUNT') discountAmount = round2(input.discountValue || 0);
  discountAmount = Math.min(Math.max(discountAmount, 0), subtotal);

  const taxableValue = round2(subtotal - discountAmount);

  const supplier = (input.supplierStateCode || '').trim();
  const place = (input.placeOfSupplyCode || '').trim();
  const isIntraState = !place || !supplier ? true : place === supplier;

  const bySlab = new Map<number, number>();
  items.forEach((item, i) => {
    const share = subtotal > 0 ? amounts[i] / subtotal : 0;
    const lineTaxable = round2(amounts[i] - discountAmount * share);
    const rate = input.taxMode === 'FLAT' ? input.flatGstRate : (Number(item.gstRate) || 0);
    bySlab.set(rate, round2((bySlab.get(rate) ?? 0) + lineTaxable));
  });

  const slabs = [...bySlab.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([gstRate, taxable]) => {
      const tax = round2(taxable * (gstRate / 100));
      const half = round2(tax / 2);
      return {
        gstRate,
        taxableValue: taxable,
        cgst: isIntraState ? half : 0,
        sgst: isIntraState ? round2(tax - half) : 0,
        igst: isIntraState ? 0 : tax,
      };
    });

  const cgst = round2(slabs.reduce((a, s) => a + s.cgst, 0));
  const sgst = round2(slabs.reduce((a, s) => a + s.sgst, 0));
  const igst = round2(slabs.reduce((a, s) => a + s.igst, 0));
  const preRound = round2(taxableValue + cgst + sgst + igst);
  const grandTotal = Math.round(preRound);

  const totalCost = round2(
    items.reduce((a, it) => a + (Number(it.costPrice) || 0) * (Number(it.quantity) || 0), 0),
  );
  const grossProfit = round2(taxableValue - totalCost);

  return {
    subtotal,
    discountAmount,
    taxableValue,
    cgst,
    sgst,
    igst,
    totalTax: round2(cgst + sgst + igst),
    roundOff: round2(grandTotal - preRound),
    grandTotal,
    totalCost,
    grossProfit,
    marginPct: taxableValue > 0 ? round2((grossProfit / taxableValue) * 100) : 0,
    isIntraState,
    slabs,
  };
}
