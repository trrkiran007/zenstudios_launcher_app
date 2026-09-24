/**
 * Client-side mirror of the server's specification pricing.
 *
 * Kept in step with server/src/lib/spec-pricing.ts, the same way lib/totals.ts
 * mirrors the server's tax engine: the editor needs to show the resolved rate
 * the moment an item is picked, without a round trip. The server recomputes
 * everything on save, so this is for display, never the source of truth.
 */
import type { CatalogItem, QuotationItem, SpecTier, SpecTiers } from './types';

/** Prefix every generated hardware row carries, and the fallback used to
 *  recognise rows saved before QuotationItem.kind was persisted. */
export const HARDWARE_PREFIX = 'Hardware & accessories';

export const isHardwareLine = (line: { kind?: string; description?: string }) =>
  line.kind === 'HARDWARE' || (line.description ?? '').startsWith(HARDWARE_PREFIX);

export type Spec = {
  thicknessMm: number;
  wood?: SpecTier;
  laminate?: SpecTier;
  hardware?: SpecTier;
  rates?: SpecTiers['hardwareRates'];
};

export function resolveRate(item: CatalogItem, spec: Spec) {
  const at19 = spec.thicknessMm >= 19;
  let rate = item.defaultRate;
  let cost = item.costPrice;

  if (item.carcassBuilt && spec.wood) {
    rate += at19 ? spec.wood.rateDelta19 : spec.wood.rateDelta;
    cost += at19 ? spec.wood.costDelta19 : spec.wood.costDelta;
  }
  if (item.carcassBuilt && item.finishClass === 'LAMINATE' && spec.laminate) {
    rate += spec.laminate.rateDelta;
    cost += spec.laminate.costDelta;
  }
  return { rate: Math.max(0, Math.round(rate * 100) / 100), cost: Math.max(0, Math.round(cost * 100) / 100) };
}

/** The single hardware line that belongs with a cabinet, priced as one lump. */
export function hardwareLineFor(item: CatalogItem, quantity: number, spec: Spec): QuotationItem | null {
  if (!item.hardwareClass || !spec.hardware || !spec.rates) return null;
  const allowance = spec.rates[item.hardwareClass];
  if (!allowance) return null;

  const mult = spec.hardware.multiplier || 1;
  const rate = Math.round(allowance.rate * mult * quantity * 100) / 100;
  if (rate <= 0) return null;

  return {
    // Tagged and linked to its cabinet so the pair can be found and re-priced
    // when the specification changes.
    kind: 'HARDWARE',
    catalogItemId: item.id,
    description: `${HARDWARE_PREFIX} — ${spec.hardware.name}`,
    specNote: spec.hardware.specNote ?? 'Soft-close hinges, drawer channels, handles and dress accessories.',
    hsnSac: '8302',
    unit: 'Set',
    quantity: 1,
    rate,
    costPrice: Math.round(allowance.cost * mult * quantity * 100) / 100,
    discountPct: 0,
    gstRate: item.gstRate,
  };
}
