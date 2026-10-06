/**
 * Add-only starter-data sync.
 *
 * Brings an existing database up to date with the shipped starter data:
 * creates any line of business that is missing (with its pipeline, terms and
 * specification tiers), and adds catalog items that are not there yet.
 *
 * It never edits or deletes anything that already exists. Rates, cost prices and
 * specifications you have corrected are left exactly as they are, so this is
 * safe to re-run after every update.
 *
 * The lines of business and their tiers run on every server start, because an
 * install that updated from an earlier build has a database with no row for a
 * line of business added since — and without it whole screens have nothing to
 * show. The catalog does not: those items are the owner's to curate, and one
 * deleted on purpose should stay deleted rather than return at every launch.
 */
import { BUSINESS_TYPES, CATALOGS, SPEC_TIERS, type CatalogSeed } from './data/index.js';
import { prisma } from './db.js';

const key = (name: string, unit: string) => `${name.trim().toLowerCase()}|${unit.trim().toLowerCase()}`;

export async function syncStarterData(
  { includeCatalog = true, quiet = false }: { includeCatalog?: boolean; quiet?: boolean } = {},
) {
  const log = (...args: unknown[]) => {
    if (!quiet) console.log(...args);
  };
  log('\nSyncing starter data — existing records are never modified.\n');

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
          protected: !!seed.protected,
          agreementLabel: seed.agreementLabel ?? 'Quotation',
          agreementVerb: seed.agreementVerb ?? 'Accepted',
          agreementDates: seed.agreementDates ?? 'VALIDITY',
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
      log(`+ line of business: ${seed.name} (${seed.shortCode}) with ${seed.stages.length} stages`);
    }

    /*
     * Agreement wording, for a line of business that already existed when the
     * columns were added. Those rows were created with the column defaults —
     * every line called its document a Quotation — so a seed that says
     * otherwise is filling a blank, not overriding a choice. Once the wording
     * differs from the default it is the owner's, and this leaves it alone.
     */
    if (seed.agreementLabel || seed.agreementVerb || seed.agreementDates) {
      const untouched =
        businessType.agreementLabel === 'Quotation' &&
        businessType.agreementVerb === 'Accepted' &&
        businessType.agreementDates === 'VALIDITY';
      const wanted = {
        agreementLabel: seed.agreementLabel ?? 'Quotation',
        agreementVerb: seed.agreementVerb ?? 'Accepted',
        agreementDates: seed.agreementDates ?? 'VALIDITY',
      };
      const differs = Object.entries(wanted).some(
        ([k, v]) => businessType![k as keyof typeof wanted] !== v,
      );
      if (untouched && differs) {
        businessType = await prisma.businessType.update({
          where: { id: businessType.id },
          data: wanted,
        });
        log(`  ${seed.name}: agreement document set to "${wanted.agreementLabel}"`);
      }
    }

    // Specification tiers — add-only, like everything else here, so rates the
    // owner has corrected are never overwritten.
    const tierSeeds = SPEC_TIERS[seed.key] ?? [];
    if (tierSeeds.length) {
      const have = new Set(
        (await prisma.specTier.findMany({
          where: { businessTypeId: businessType.id },
          select: { kind: true, key: true },
        })).map((t) => `${t.kind}|${t.key}`),
      );
      const missing = tierSeeds.filter((t) => !have.has(`${t.kind}|${t.key}`));
      if (missing.length) {
        await prisma.specTier.createMany({
          data: missing.map((t) => ({
            businessTypeId: businessType!.id,
            kind: t.kind,
            key: t.key,
            name: t.name,
            brands: t.brands ?? null,
            specNote: t.specNote ?? null,
            order: t.order,
            rateDelta: t.rateDelta ?? 0,
            costDelta: t.costDelta ?? 0,
            rateDelta19: t.rateDelta19 ?? 0,
            costDelta19: t.costDelta19 ?? 0,
            multiplier: t.multiplier ?? 1,
            isDefault: !!t.isDefault,
          })),
        });
        const by = (k: string) => missing.filter((t) => t.kind === k).length;
        log(`\n  ${seed.name}: ${by('WOOD')} material, ${by('LAMINATE')} laminate, ${by('HARDWARE')} hardware tier(s) added`);
      }
    }

    if (!includeCatalog) continue;

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
      log(`\n  ${seed.name}: ${missing.length} new item(s), ${existing.length} left untouched`);
      for (const [category, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
        log(`    ${String(count).padStart(3)}  ${category}`);
      }
    } else {
      log(`\n  ${seed.name}: already up to date (${existing.length} items)`);
    }
  }

  const totals = includeCatalog ? await prisma.catalogItem.count() : 0;
  log(
    `\n✓ ${typesAdded} line(s) of business and ${itemsAdded} catalog item(s) added. ` +
      `${totals} items in the catalog now.\n`,
  );
  return { typesAdded, itemsAdded };
}
