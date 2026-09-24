/**
 * Push the seeded tier definitions onto the rows that already exist.
 *
 * catalog:sync is deliberately add-only so corrected rates survive, but the
 * tier names, brand lists and deltas are ours to maintain rather than the
 * owner's. Matching on key means any quotation already pointing at a tier keeps
 * pointing at it.
 */
import { SPEC_TIERS } from './data/index.js';
import { prisma } from './db.js';

async function main() {
  let updated = 0;
  for (const [key, seeds] of Object.entries(SPEC_TIERS)) {
    const bt = await prisma.businessType.findUnique({ where: { key } });
    if (!bt) continue;

    for (const t of seeds) {
      const existing = await prisma.specTier.findFirst({
        where: { businessTypeId: bt.id, kind: t.kind, key: t.key },
      });
      if (!existing) continue;

      const data = {
        name: t.name,
        brands: t.brands ?? null,
        specNote: t.specNote ?? null,
        order: t.order,
        rateDelta: t.rateDelta ?? 0,
        costDelta: t.costDelta ?? 0,
        rateDelta19: t.rateDelta19 ?? 0,
        costDelta19: t.costDelta19 ?? 0,
        multiplier: t.multiplier ?? 1,
      };
      const changed = (Object.keys(data) as (keyof typeof data)[]).some(
        (k) => existing[k] !== data[k],
      );
      if (!changed) continue;

      await prisma.specTier.update({ where: { id: existing.id }, data });
      console.log(`  ${t.kind.padEnd(9)} ${existing.name}  ->  ${t.name}`);
      updated++;
    }
  }
  console.log(updated ? `\n  ✓ ${updated} tier(s) updated.\n` : '  Tiers already current.\n');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
