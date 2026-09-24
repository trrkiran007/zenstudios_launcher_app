/**
 * One-off: classify the interiors catalogue and re-base cabinet rates so that
 * hardware leaves the per-sq.ft figure and becomes its own quotation line.
 *
 *   new cabinet rate = old all-in rate − hardware allowance + ₹50 buffer
 *
 * The all-in price a client pays is unchanged apart from the buffer; only the
 * split between the cabinet line and the hardware line moves. Run with
 * --apply to write; without it, it prints the proposal and changes nothing.
 */
import { HARDWARE_RATE_BY_CLASS } from './data/spec-tiers.js';
import { prisma } from './db.js';

const BUFFER = 50;

function hardwareClassOf(name: string, category: string): string | null {
  const n = name.toLowerCase();
  if (category === 'Wardrobe' || n.includes('wardrobe') || n.startsWith('loft') || n.includes('dresser')) {
    return 'WARDROBE';
  }
  if (category === 'Modular Kitchen') {
    if (n.includes('counter top') || n.includes('backsplash')) return null; // surfaces, not cabinets
    return n.includes('wall unit') ? 'KITCHEN_WALL' : 'KITCHEN_BASE';
  }
  // Matched loosely on purpose: categories get renamed in the live catalogue
  // ("Living & Dining" had become "Living"), and an exact list silently skips
  // whatever was renamed.
  const c = category.toLowerCase();
  if (/living|dining|pooja|foyer|bed|bathroom|study/.test(c)) {
    return /unit|storage|cabinet|vanity|rack|shelf|bookshelf|sideboard|dresser/.test(n) ? 'STORAGE' : null;
  }
  return null;
}

function finishClassOf(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('acrylic')) return 'ACRYLIC';
  if (n.includes('pu shutter') || n.includes('pu finish')) return 'PU';
  if (n.includes('veneer')) return 'VENEER';
  if (n.includes('membrane')) return 'MEMBRANE';
  if (n.includes('mirror')) return 'MIRROR';
  if (n.includes('glass')) return 'GLASS';
  return 'LAMINATE';
}

async function main() {
  const apply = process.argv.includes('--apply');
  const items = await prisma.catalogItem.findMany({
    // carcassBuilt already set means this item has been re-based; running twice
    // would subtract the hardware allowance a second time.
    where: { businessType: { key: 'INTERIOR' }, unit: 'Sq.ft', carcassBuilt: false },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  const changes = items.flatMap((it) => {
    const hw = hardwareClassOf(it.name, it.category ?? '');
    if (!hw) return [];
    const allowance = HARDWARE_RATE_BY_CLASS[hw];
    const newRate = Math.round(it.defaultRate - allowance.rate + BUFFER);
    const newCost = Math.round(it.costPrice - allowance.cost + Math.round(BUFFER * 0.655));
    return [{ it, hw, finish: finishClassOf(it.name), allowance, newRate, newCost }];
  });

  let cat = '';
  for (const c of changes) {
    if (c.it.category !== cat) {
      cat = c.it.category ?? '';
      console.log(`\n  ${cat.toUpperCase()}`);
    }
    console.log(
      `    ${c.it.name.slice(0, 44).padEnd(44)}${c.hw.padEnd(14)}${c.finish.padEnd(10)}` +
        `${String(Math.round(c.it.defaultRate)).padStart(6)} -> ${String(c.newRate).padStart(6)}` +
        `  + hw ${String(c.allowance.rate).padStart(4)}  = ${String(c.newRate + c.allowance.rate).padStart(6)}`,
    );
  }

  const negatives = changes.filter((c) => c.newRate <= 0 || c.newCost <= 0);
  if (negatives.length) {
    console.log(`\n  REFUSING — ${negatives.length} item(s) would price at or below zero:`);
    for (const n of negatives) console.log(`    ${n.it.name} -> ${n.newRate}`);
    process.exit(1);
  }

  console.log(`\n  ${changes.length} item(s) to re-base.`);
  if (!apply) {
    console.log('  Nothing written. Re-run with --apply to commit.\n');
    return;
  }

  for (const c of changes) {
    await prisma.catalogItem.update({
      where: { id: c.it.id },
      data: {
        defaultRate: c.newRate,
        costPrice: c.newCost,
        carcassBuilt: true,
        hardwareClass: c.hw,
        finishClass: c.finish,
      },
    });
  }
  console.log(`  ✓ applied to ${changes.length} item(s).\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
