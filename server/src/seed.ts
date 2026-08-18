/**
 * Fresh-install seed: company identity, the lines of business with their
 * pipelines, and the starter catalogs.
 *
 * Both this and sync.ts read the same data modules, so a fresh install and an
 * updated existing database end up with the same starter content. To top up a
 * database that already has data, run `npm run catalog:sync` instead — it only
 * adds what is missing.
 */
import { BUSINESS_TYPES, CATALOGS, INTERIOR_TERMS, INVOICE_TERMS, loadCompanyProfile } from './data/index.js';
import { prisma } from './db.js';

async function main() {
  console.log('Seeding ZenStudios…');

  // Identity comes from server/company.json (gitignored) so CIN, PAN and TAN
  // never enter version control. See company.example.json.
  const company = loadCompanyProfile();

  const org = await prisma.organization.upsert({
    where: { id: 'org' },
    update: {},
    create: {
      id: 'org',
      ...company,
      accentColor: '#111827',
      defaultTerms: INTERIOR_TERMS,
      defaultInvoiceTerms: INVOICE_TERMS,
      defaultValidityDays: 15,
      invoicePrefix: 'ZS/INV',
      proformaPrefix: 'ZS/PI',
    },
  });
  console.log(`  organization: ${org.legalName}`);

  const created: Record<string, string> = {};

  for (const seed of BUSINESS_TYPES) {
    const existing = await prisma.businessType.findUnique({ where: { key: seed.key } });
    const businessType =
      existing ??
      (await prisma.businessType.create({
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
      }));
    created[seed.key] = businessType.id;
  }
  console.log(`  business types: ${BUSINESS_TYPES.map((b) => b.name).join(', ')}`);

  const existingCatalog = await prisma.catalogItem.count();
  if (existingCatalog === 0) {
    let total = 0;
    for (const [key, items] of Object.entries(CATALOGS)) {
      const businessTypeId = created[key];
      if (!businessTypeId) continue;
      await prisma.catalogItem.createMany({
        data: items.map((item) => ({
          businessTypeId,
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
      total += items.length;
      console.log(`    ${items.length} items — ${key}`);
    }
    console.log(`  catalog: ${total} starter items`);
  } else {
    console.log(`  catalog: ${existingCatalog} items already present, skipped`);
    console.log('           run `npm run catalog:sync` to add anything new without touching your rates');
  }

  console.log('\nDone. Run `npm run dev` and open the app.\n');
  if (!org.gstin) {
    console.log('⚠  GSTIN is empty — add it under Settings → Company before issuing tax invoices.\n');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
