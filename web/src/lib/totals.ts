import type { CountryProfile, QuotationSection, TaxTreatment } from './types';

/**
 * The same decision the server makes in lib/tax.ts, repeated here so the editor
 * can show live totals without a round trip. The server figure is always the
 * one that is saved.
 */
function resolveTaxTreatment(
  seller: CountryProfile | null | undefined,
  buyerCountry: string | null | undefined,
  sellerState: string | null | undefined,
  buyerState: string | null | undefined,
): TaxTreatment {
  const label = seller?.taxLabel ?? 'GST';
  const system = seller?.taxSystem ?? 'INDIA_GST';
  const buyer = (buyerCountry || '').trim().toUpperCase();

  if (seller && buyer && buyer !== seller.code) {
    return { kind: 'EXPORT', label, splitCgstSgst: false, zeroRated: true, note: seller.exportNote };
  }
  if (system === 'NONE') return { kind: 'NONE', label, splitCgstSgst: false, zeroRated: false };
  if (system === 'SINGLE') return { kind: 'SINGLE', label, splitCgstSgst: false, zeroRated: false };

  const a = (sellerState || '').trim();
  const b = (buyerState || '').trim();
  const intra = !a || !b ? true : a === b;
  return intra
    ? { kind: 'INDIA_INTRA', label, splitCgstSgst: true, zeroRated: false }
    : { kind: 'INDIA_INTER', label: `I${label}`, splitCgstSgst: false, zeroRated: false };
}

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
  /** The country profiles, and who is selling to whom. See lib/tax.ts on the server. */
  seller?: CountryProfile | null;
  buyerCountry?: string | null;
}) {
  const items = input.sections.flatMap((s) => s.items);
  const amounts = items.map(lineAmount);
  const subtotal = round2(amounts.reduce((a, b) => a + b, 0));

  let discountAmount = 0;
  if (input.discountType === 'PERCENT') discountAmount = round2(subtotal * ((input.discountValue || 0) / 100));
  else if (input.discountType === 'AMOUNT') discountAmount = round2(input.discountValue || 0);
  discountAmount = Math.min(Math.max(discountAmount, 0), subtotal);

  const taxableValue = round2(subtotal - discountAmount);

  const treatment = resolveTaxTreatment(input.seller, input.buyerCountry, input.supplierStateCode, input.placeOfSupplyCode);
  const isIntraState = treatment.splitCgstSgst;
  const untaxed = treatment.zeroRated || treatment.kind === 'NONE';

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
      const tax = untaxed ? 0 : round2(taxable * (gstRate / 100));
      const half = round2(tax / 2);
      return {
        gstRate,
        taxableValue: taxable,
        cgst: treatment.splitCgstSgst ? half : 0,
        sgst: treatment.splitCgstSgst ? round2(tax - half) : 0,
        igst: treatment.splitCgstSgst || treatment.kind !== 'INDIA_INTER' ? 0 : tax,
        tax,
      };
    });

  const cgst = round2(slabs.reduce((a, s) => a + s.cgst, 0));
  const sgst = round2(slabs.reduce((a, s) => a + s.sgst, 0));
  const igst = round2(slabs.reduce((a, s) => a + s.igst, 0));
  const totalTax = round2(slabs.reduce((a, s) => a + s.tax, 0));
  const taxLines: { label: string; amount: number }[] = [];
  if (treatment.splitCgstSgst) {
    if (cgst) taxLines.push({ label: `C${treatment.label}`, amount: cgst });
    if (sgst) taxLines.push({ label: `S${treatment.label}`, amount: sgst });
  } else if (totalTax) {
    taxLines.push({ label: treatment.label, amount: totalTax });
  }

  const preRound = round2(taxableValue + totalTax);
  const grandTotal = input.seller?.roundTotals === false ? preRound : Math.round(preRound);

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
    totalTax,
    roundOff: round2(grandTotal - preRound),
    grandTotal,
    totalCost,
    grossProfit,
    marginPct: taxableValue > 0 ? round2((grossProfit / taxableValue) * 100) : 0,
    isIntraState,
    slabs,
    treatment,
    taxLines,
  };
}
