/**
 * Resolving a catalogue rate against a quotation's specification.
 *
 * A quotation is priced at four settings — board grade, board thickness,
 * laminate grade and hardware brand. Rather than multiplying the catalogue into
 * hundreds of near-identical rows, each setting carries a rupee-per-sq.ft delta
 * that is applied to the items it is relevant to:
 *
 *   wood      → items built from sheet material (carcassBuilt)
 *   laminate  → only items finished in laminate (finishClass = LAMINATE)
 *   hardware  → generates a separate line per cabinet, priced by cabinet type
 *
 * Deltas are absolute rupees, not percentages, because the carcass is identical
 * whatever the shutter finish: a veneer wardrobe and a laminate one see the same
 * increase when the plywood grade changes.
 */
import { HARDWARE_RATE_BY_CLASS } from '../data/spec-tiers.js';
import { round2 } from './money.js';

export type TierLike = {
  id: string;
  kind: string;
  name: string;
  brands?: string | null;
  specNote?: string | null;
  rateDelta: number;
  costDelta: number;
  rateDelta19: number;
  costDelta19: number;
  multiplier: number;
};

export type SpecContext = {
  thicknessMm: number;
  wood?: TierLike | null;
  laminate?: TierLike | null;
  hardware?: TierLike | null;
};

export type PricedItem = {
  name: string;
  defaultRate: number;
  costPrice: number;
  carcassBuilt: boolean;
  hardwareClass?: string | null;
  finishClass?: string | null;
};

const at19 = (spec: SpecContext) => spec.thicknessMm >= 19;

/** The item's rate and cost once the quotation's specification is applied. */
export function resolveItemPrice(item: PricedItem, spec: SpecContext) {
  let rate = item.defaultRate;
  let cost = item.costPrice;

  if (item.carcassBuilt && spec.wood) {
    rate += at19(spec) ? spec.wood.rateDelta19 : spec.wood.rateDelta;
    cost += at19(spec) ? spec.wood.costDelta19 : spec.wood.costDelta;
  }

  // Laminate grade moves only laminate-finished items. An acrylic or veneer
  // shutter already carries its own finish cost.
  if (item.carcassBuilt && item.finishClass === 'LAMINATE' && spec.laminate) {
    rate += spec.laminate.rateDelta;
    cost += spec.laminate.costDelta;
  }

  return { rate: round2(Math.max(0, rate)), cost: round2(Math.max(0, cost)) };
}

/**
 * The hardware line that belongs with a cabinet, or null where the item is not
 * a cabinet. Priced as one lump per cabinet rather than per fitting: the client
 * sees a competitive rate per sq.ft on the cabinet and a single hardware figure,
 * with no unit prices to negotiate line by line.
 */
export function buildHardwareLine(
  item: PricedItem,
  quantity: number,
  spec: SpecContext,
): { description: string; specNote: string; unit: string; quantity: number; rate: number; costPrice: number } | null {
  if (!item.hardwareClass || !spec.hardware) return null;
  const allowance = HARDWARE_RATE_BY_CLASS[item.hardwareClass];
  if (!allowance) return null;

  const mult = spec.hardware.multiplier || 1;
  const total = round2(allowance.rate * mult * quantity);
  const cost = round2(allowance.cost * mult * quantity);
  if (total <= 0) return null;

  return {
    description: `Hardware & accessories — ${spec.hardware.name}`,
    specNote:
      spec.hardware.specNote ??
      'Soft-close hinges, drawer channels, handles and dress accessories.',
    unit: 'Set',
    quantity: 1,
    rate: total,
    costPrice: cost,
  };
}

/** One-line summary of the specification, for the printed document. */
export function describeSpec(spec: SpecContext): string | null {
  const parts = [
    spec.wood && `${spec.wood.name} ${spec.thicknessMm}mm`,
    spec.laminate?.name,
    spec.hardware && `${spec.hardware.name} hardware`,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}
