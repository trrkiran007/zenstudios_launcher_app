/**
 * Add-only catalog sync.
 *
 * Brings an existing database up to date with the shipped starter data:
 * creates any business type that is missing (with its pipeline and terms), and
 * adds catalog items that are not there yet.
 *
 * It never edits or deletes anything that already exists. Rates, cost prices and
 * specifications you have corrected are left exactly as they are, so this is
 * safe to re-run after every update.
 */
import { BUSINESS_TYPES, CATALOGS, type CatalogSeed } from './data/index.js';
import { prisma } from './db.js';

const key = (name: string, unit: string) => `${name.trim().toLowerCase()}|${unit.trim().toLowerCase()}`;

async function main() {
  console.log('\nSyncing starter data — existing records are never modified.\n');

  let typesAdded = 0;
  let itemsAdded = 0;

  for (const seed of BUSINESS_TYPES) {
    let businessType = await prisma.businessType.findUnique({ where: { key: seed.key } });

    if (!businessType) {
      businessType = await prisma.businessType.create({
        data: {
          key: seed.key,
          name: seed.name,
          shortCode: seed.shortCode,
          layout: seed.layout,
          sectionLabel: seed.sectionLabel,
          description: seed.description,
          color: seed.color,
          order: seed.order,
          enableBenchmark: seed.enableBenchmark,
          defaultTerms: seed.defaultTerms,
          stages: {
            create: seed.stages.map((stage, order) => ({
              name: stage.name,
              color: stage.color,
              order,
              isTerminal: !!stage.isTerminal,
              isWon: !!stage.isWon,
            })),
          },
        },
      });
      typesAdded++;
      console.log(`+ line of business: ${seed.name} (${seed.shortCode}) with ${seed.stages.length} stages`);
    }

    const catalog: CatalogSeed[] = CATALOGS[seed.key] ?? [];
    if (!catalog.length) continue;

    const existing = await prisma.catalogItem.findMany({
      where: { businessTypeId: businessType.id },
      select: { name: true, unit: true },
    });
    const present = new Set(existing.map((e) => key(e.name, e.unit)));

    const missing = catalog.filter((item) => !present.has(key(item.name, item.unit)));

    if (missing.length) {
      await prisma.catalogItem.createMany({
        data: missing.map((item) => ({
          businessTypeId: businessType!.id,
          name: item.name,
          sku: item.sku ?? null,
          brand: item.brand ?? null,
          category: item.category,
          unit: item.unit,
          defaultRate: item.defaultRate,
          costPrice: item.costPrice,
          hsnSac: item.hsnSac,
          gstRate: item.gstRate ?? 18,
          specNote: item.specNote,
        })),
      });
      itemsAdded += missing.length;

      const byCategory = missing.reduce<Record<string, number>>((acc, item) => {
        acc[item.category] = (acc[item.category] ?? 0) + 1;
        return acc;
      }, {});
      console.log(`\n  ${seed.name}: ${missing.length} new item(s), ${existing.length} left untouched`);
      for (const [category, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
        console.log(`    ${String(count).padStart(3)}  ${category}`);
      }
    } else {
      console.log(`\n  ${seed.name}: already up to date (${existing.length} items)`);
    }
  }

  const totals = await prisma.catalogItem.count();
  console.log(
    `\n✓ ${typesAdded} line(s) of business and ${itemsAdded} catalog item(s) added. ` +
      `${totals} items in the catalog now.\n`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
