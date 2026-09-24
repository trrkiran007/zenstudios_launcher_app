/**
 * Specification tiers — the material and hardware level a whole quotation is
 * priced at.
 *
 * Rates are derived from ZenStudios' own purchase documents: the Action Tesa /
 * Prelam board lists and the Greenply, Century and Austin plywood lists of
 * 2026, and an Ebco purchase for a live project. Every figure below is ex-GST.
 *
 * Rates are on a 16mm basis — ZenStudios builds in 16mm board and laminates
 * both faces, finishing at 18-19mm. The earlier 19mm assumption overstated the
 * carcass cost by about 14%.
 *
 * WOOD tiers carry a rupee delta per sq.ft rather than a percentage. The
 * carcass is the same whatever the shutter finish, so a laminate wardrobe and a
 * veneer one see the same increase when the plywood grade changes; a percentage
 * would wrongly inflate the expensive finishes.
 *
 * The rates already include a ₹50/sq.ft buffer against board price movement,
 * agreed after a 2.5% hike in September 2026. The hike itself accounts for
 * about ₹11 of that; the rest is deliberate headroom.
 */
export type SpecTierSeed = {
  kind: 'WOOD' | 'LAMINATE' | 'HARDWARE';
  key: string;
  name: string;
  brands?: string;
  specNote?: string;
  order: number;
  rateDelta?: number;
  costDelta?: number;
  rateDelta19?: number;
  costDelta19?: number;
  multiplier?: number;
  isDefault?: boolean;
};

/** Baseline is BWP 710, which is what the rate card was written against. */
export const WOOD_TIERS: SpecTierSeed[] = [
  {
    kind: 'WOOD', key: 'HDHMR', name: 'HDHMR', order: 1,
    brands: 'Action Tesa HDHMR',
    // Priced from an actual purchase at Rs 78/sq.ft incl GST for 16mm.
    specNote: 'High-density high-moisture-resistant board. Dense and screw-holding, best where the carcass stays dry.',
    rateDelta: -97, costDelta: -64, rateDelta19: -7, costDelta19: -5,
  },
  {
    kind: 'WOOD', key: 'MR', name: 'Moisture Resistant (MR)', order: 2,
    brands: 'Century Sainik MR · Greenply Ecotech MR',
    specNote: 'Commercial MR-grade plywood. Suitable for bedrooms and dry areas; not for kitchen or bathroom carcasses.',
    rateDelta: -57, costDelta: -37, rateDelta19: -6, costDelta19: -4,
  },
  {
    kind: 'WOOD', key: 'BWP_710', name: 'BWP 710', order: 3,
    brands: 'Century Sainik 710 · Greenply Ecotec 710 · Austin Lincoln 710',
    specNote: 'IS:710 boiling-water-proof plywood. The standard specification for kitchens, wardrobes and wet areas.',
    rateDelta: 0, costDelta: 0, rateDelta19: 60, costDelta19: 39, isDefault: true,
  },
  {
    kind: 'WOOD', key: 'BWP_PLUS', name: 'BWP 710 — upgraded', order: 4,
    brands: 'Century Bond Shield · Austin Gold · Greenply Optima G',
    specNote: 'Heavier BWP grade with a longer warranty and better core consistency.',
    rateDelta: 68, costDelta: 45, rateDelta19: 132, costDelta19: 86,
  },
  {
    kind: 'WOOD', key: 'MARINE', name: 'Marine grade', order: 5,
    brands: 'Century Bond 710 · Austin Gold · Greenply Green Marine',
    specNote: 'Marine-grade plywood, fully waterproof glue line, for sustained damp exposure.',
    rateDelta: 85, costDelta: 56, rateDelta19: 164, costDelta19: 107,
  },
  {
    kind: 'WOOD', key: 'PREMIUM', name: 'Premium', order: 6,
    brands: 'Century Club Prime · Austin Club Plus · Greenply Platinum, Gold 2.0',
    specNote: 'Premium hardwood-core plywood with lifetime warranty, calibrated thickness and minimal core gaps.',
    rateDelta: 162, costDelta: 106, rateDelta19: 262, costDelta19: 172,
  },
  {
    kind: 'WOOD', key: 'ARCHITECT', name: 'Architect', order: 7,
    brands: 'Century Architect · Austin Platinum Plus · Greenply Club',
    specNote: 'Top of the range. Fully calibrated, gap-free hardwood core with the highest screw-withdrawal strength.',
    rateDelta: 331, costDelta: 217, rateDelta19: 433, costDelta19: 284,
  },
];


/**
 * Laminate grade. Applies only to items whose finish is laminate — an acrylic
 * or veneer shutter carries its own finish cost and is untouched by this.
 *
 * Priced from a real purchase: 0.8mm Phonetouch at ₹500 a sheet through 1mm
 * CMYK at ₹1,400, against a ₹1,800 standard. Roughly 1.5 sq.ft of visible
 * laminate goes on per sq.ft of frontage; cabinet internals stay economy grade
 * whichever tier is chosen.
 */
export const LAMINATE_TIERS: SpecTierSeed[] = [
  {
    kind: 'LAMINATE', key: 'ECONOMY', name: 'Economy laminate', order: 1,
    brands: 'Phonetouch · commercial 0.8mm',
    specNote: '0.8mm laminate in a working range of shades. Sound and durable; fewer textures and no premium decors.',
    rateDelta: -74, costDelta: -48, rateDelta19: -74, costDelta19: -48,
  },
  {
    kind: 'LAMINATE', key: 'STANDARD', name: 'Standard laminate', order: 2,
    brands: 'Greenlam · Merino · Century — ₹1,800–2,500 a sheet',
    specNote: '1mm laminate with a full shade card, textured and matt finishes, colour-matched edge banding.',
    rateDelta: 0, costDelta: 0, rateDelta19: 0, costDelta19: 0, isDefault: true,
  },
  {
    kind: 'LAMINATE', key: 'PREMIUM', name: 'Premium laminate', order: 3,
    brands: 'Designer decors — ₹3,000–4,500 a sheet',
    specNote: '1mm designer laminate: high-gloss, soft-touch, woodgrain and stone decors with matching edge band.',
    rateDelta: 160, costDelta: 105, rateDelta19: 160, costDelta19: 105,
  },
];

/**
 * Hardware tiers multiply the cabinet type's base allowance rather than
 * carrying their own rate, because a kitchen base run needs several times the
 * fittings of a wardrobe of the same frontage.
 *
 * Only the Ebco figure is measured, from an actual purchase. The rest are
 * market estimates and are expected to be corrected per quotation — safe to do,
 * because hardware prints as a single line with no unit prices on it.
 */
export const HARDWARE_TIERS: SpecTierSeed[] = [
  {
    kind: 'HARDWARE', key: 'STANDARD', name: 'Standard soft-close', order: 1,
    specNote: 'Soft-close hinges and telescopic channels, unbranded commercial grade.',
    multiplier: 0.6,
  },
  {
    kind: 'HARDWARE', key: 'EBCO', name: 'Ebco / Nimmi', order: 2,
    brands: 'Ebco · Nimmi',
    specNote: 'Ebco soft-close hinges, telescopic drawer channels, handles and dress accessories.',
    multiplier: 1, isDefault: true,
  },
  {
    kind: 'HARDWARE', key: 'HETTICH', name: 'Hettich', order: 3,
    brands: 'Hettich',
    specNote: 'Hettich Sensys soft-close hinges, Quadro runners, handles and dress accessories.',
    multiplier: 1.8,
  },
  {
    kind: 'HARDWARE', key: 'HAFELE', name: 'Hafele', order: 4,
    brands: 'Häfele',
    specNote: 'Häfele Metalla soft-close hinges, full-extension runners, handles and dress accessories.',
    multiplier: 2.2,
  },
  {
    kind: 'HARDWARE', key: 'BLUM', name: 'Blum', order: 5,
    brands: 'Blum',
    specNote: 'Blum Clip-Top Blumotion hinges, Tandem full-extension runners, handles and dress accessories.',
    multiplier: 3,
  },
];

/**
 * Hardware allowance by cabinet type, in rupees per sq.ft of frontage, at the
 * Ebco tier. Costed from a real Ebco purchase: hinge sets at ₹138, soft-close
 * channels at ₹685, Quadro runners at ₹1,457, Tandem boxes at ₹2,585–3,110.
 *
 * Kitchen rates cover hinges and basic fittings only. Tandem boxes, Quadro
 * runners, magic corners and gas pumps are chosen accessories with their own
 * catalogue lines — a magic corner alone was 26% of the hardware on one
 * project, and burying it here would put ₹47,000 of sell value into every
 * kitchen quotation whether the client ordered one or not.
 */
export const HARDWARE_RATE_BY_CLASS: Record<string, { rate: number; cost: number; label: string }> = {
  WARDROBE:     { rate: 171, cost: 112, label: 'Wardrobe' },
  KITCHEN_BASE: { rate: 160, cost: 105, label: 'Kitchen base unit' },
  KITCHEN_WALL: { rate: 160, cost: 105, label: 'Kitchen wall unit' },
  STORAGE:      { rate: 145, cost: 95,  label: 'Storage / TV unit' },
};
