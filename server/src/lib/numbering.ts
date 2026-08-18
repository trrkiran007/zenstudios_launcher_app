import { prisma } from '../db.js';
import { financialYear } from './money.js';

/**
 * Atomically allocate the next number for a document series.
 * Series are scoped per prefix and per financial year, so counters restart
 * every April as Indian bookkeeping expects.
 */
export async function nextNumber(prefix: string, date: Date = new Date()): Promise<string> {
  const fy = financialYear(date);
  const key = `${prefix}:${fy}`;

  const seq = await prisma.$transaction(async (tx) => {
    const existing = await tx.sequence.findUnique({ where: { key } });
    if (!existing) {
      await tx.sequence.create({ data: { key, value: 1 } });
      return 1;
    }
    const updated = await tx.sequence.update({
      where: { key },
      data: { value: { increment: 1 } },
    });
    return updated.value;
  });

  return `${prefix}/${fy}/${String(seq).padStart(3, '0')}`;
}

export const quotePrefix = (shortCode: string) => `ZS/${shortCode}`;
export const projectPrefix = (shortCode: string) => `PRJ/${shortCode}`;
