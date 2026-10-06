/**
 * Decide how a document is taxed, from who is selling and who is buying.
 *
 * Two situations drove this. An Indian company invoicing a US client is making
 * an export: zero-rated, no CGST/SGST/IGST on the face of the invoice. A US
 * company invoicing another US company is a domestic sale under that country's
 * own rules, and nothing about Indian GST applies to it.
 *
 * So the treatment comes from the pair of countries, not from the seller alone.
 *
 * Where the buyer's country is unknown — every client record predating this —
 * the sale is treated as domestic. That is what the app did before, and it
 * keeps existing quotations and invoices computing exactly as they did.
 */
import { countryProfile } from '../data/countries.js';

export type TaxTreatment = {
  kind: 'INDIA_INTRA' | 'INDIA_INTER' | 'SINGLE' | 'EXPORT' | 'NONE';
  /** What to call it on the document. */
  label: string;
  /** India within one state: half CGST, half SGST. */
  splitCgstSgst: boolean;
  /** Taxed at zero rather than untaxed — the difference matters on an export. */
  zeroRated: boolean;
  /** Shown under the totals when there is something the reader needs to know. */
  note?: string;
};

export type TaxParties = {
  sellerCountry?: string | null;
  sellerStateCode?: string | null;
  buyerCountry?: string | null;
  buyerStateCode?: string | null;
};

export function resolveTaxTreatment(parties: TaxParties): TaxTreatment {
  const seller = countryProfile(parties.sellerCountry);
  const buyerCountry = (parties.buyerCountry || '').trim().toUpperCase();

  if (buyerCountry && buyerCountry !== seller.code) {
    return {
      kind: 'EXPORT',
      label: seller.taxLabel,
      splitCgstSgst: false,
      zeroRated: true,
      note: seller.exportNote ?? `Export of services or goods — zero-rated for ${seller.taxLabel}.`,
    };
  }

  if (seller.taxSystem === 'NONE') {
    return { kind: 'NONE', label: seller.taxLabel, splitCgstSgst: false, zeroRated: false };
  }

  if (seller.taxSystem === 'SINGLE') {
    return { kind: 'SINGLE', label: seller.taxLabel, splitCgstSgst: false, zeroRated: false };
  }

  const sellerState = (parties.sellerStateCode || '').trim();
  const buyerState = (parties.buyerStateCode || '').trim();
  // Unknown place of supply means intra-state, as it always has: it is the
  // common case, and it keeps totals sensible before the client address is in.
  const intra = !sellerState || !buyerState ? true : sellerState === buyerState;

  return intra
    ? { kind: 'INDIA_INTRA', label: seller.taxLabel, splitCgstSgst: true, zeroRated: false }
    : { kind: 'INDIA_INTER', label: `I${seller.taxLabel}`, splitCgstSgst: false, zeroRated: false };
}
