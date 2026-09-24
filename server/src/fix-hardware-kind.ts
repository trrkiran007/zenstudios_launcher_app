/**
 * One-off: tag hardware rows saved before QuotationItem.kind was persisted.
 *
 * The field existed in the schema from the tier work but was missing from the
 * API's item schema, so every generated hardware row was stored as LINE. On
 * re-pricing they looked like ordinary cabinet lines, were kept, and a fresh
 * hardware row was added beside them — the quotation total went up when it
 * should have gone down.
 */
import { prisma } from './db.js';

async function main() {
  const rows = await prisma.quotationItem.findMany({
    where: { kind: 'LINE', description: { startsWith: 'Hardware & accessories' } },
    select: { id: true },
  });
  if (!rows.length) {
    console.log('  Nothing to fix — no mis-tagged hardware rows.\n');
    return;
  }
  const { count } = await prisma.quotationItem.updateMany({
    where: { id: { in: rows.map((r) => r.id) } },
    data: { kind: 'HARDWARE' },
  });
  console.log(`  ✓ tagged ${count} hardware row(s) that were stored as LINE.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
