import fs from 'node:fs';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { badRequest, h, parsePatch } from '../lib/http.js';
import { upload } from '../lib/upload.js';
import { AiNotConfiguredError, parseRateCard } from '../services/ai.js';
import { extractPdfText } from '../services/pdfText.js';

export const catalogRouter = Router();

const itemSchema = z.object({
  businessTypeId: z.string().min(1),
  name: z.string().min(1),
  sku: z.string().nullish(),
  brand: z.string().nullish(),
  category: z.string().nullish(),
  unit: z.string().default('Nos'),
  defaultRate: z.coerce.number().min(0).default(0),
  costPrice: z.coerce.number().min(0).default(0),
  hsnSac: z.string().nullish(),
  gstRate: z.coerce.number().min(0).max(50).default(18),
  specNote: z.string().nullish(),
  active: z.boolean().default(true),
});

catalogRouter.get(
  '/',
  h(async (req, res) => {
    const { businessTypeId, q, category } = req.query as Record<string, string | undefined>;
    const items = await prisma.catalogItem.findMany({
      where: {
        ...(businessTypeId ? { businessTypeId } : {}),
        ...(category ? { category } : {}),
        ...(req.query.all === '1' ? {} : { active: true }),
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { sku: { contains: q } },
                { brand: { contains: q } },
                { category: { contains: q } },
                { specNote: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    res.json(items);
  }),
);

catalogRouter.get(
  '/categories',
  h(async (req, res) => {
    const rows = await prisma.catalogItem.findMany({
      where: req.query.businessTypeId ? { businessTypeId: String(req.query.businessTypeId) } : {},
      select: { category: true },
      distinct: ['category'],
    });
    res.json(rows.map((r) => r.category).filter(Boolean).sort());
  }),
);

catalogRouter.post(
  '/',
  h(async (req, res) => {
    res.status(201).json(await prisma.catalogItem.create({ data: itemSchema.parse(req.body) as any }));
  }),
);

const ALLOWED_UNITS = new Set([
  'Sq.ft', 'R.ft', 'Nos', 'Set', 'Lump sum', 'Sq.mt', 'Kg', 'Litre', 'Hour', 'Day', 'Month',
]);

/**
 * Read a rate card PDF or photo into proposed rows. Deliberately saves nothing —
 * the Catalog screen shows these for review and edit, then commits via /bulk.
 * Rates are the studio's own pricing, so they may feed the catalog; that is the
 * opposite of the competitor benchmark, which is walled off from pricing.
 */
catalogRouter.post(
  '/parse-document',
  upload.single('file'),
  h(async (req, res) => {
    if (!req.file) throw badRequest('Upload the rate card as a PDF or an image.');

    // multer has already written the upload to disk by this point, so every exit
    // path from here — including validation failures — must go through the
    // finally block, or rejected uploads pile up in data/uploads.
    try {
      const businessTypeId = String(req.body.businessTypeId ?? '');
      if (!businessTypeId) throw badRequest('Pick which catalog these rows belong to.');

      const buffer = fs.readFileSync(req.file.path);
      const extracted =
        req.file.mimetype === 'application/pdf' ? await extractPdfText(buffer) : null;

      const parsed = await parseRateCard({
        mimeType: req.file.mimetype,
        base64: buffer.toString('base64'),
        extractedText: extracted?.text,
        hint: typeof req.body.hint === 'string' ? req.body.hint : null,
      });

      // Flag rows that already exist so a re-import cannot silently duplicate.
      const existing = await prisma.catalogItem.findMany({
        where: { businessTypeId },
        select: { id: true, name: true, unit: true, defaultRate: true },
      });
      const key = (name: string, unit: string) => `${name.trim().toLowerCase()}|${unit.toLowerCase()}`;
      const byKey = new Map(existing.map((e) => [key(e.name, e.unit), e]));

      const items = parsed.items.map((item) => {
        const unit = ALLOWED_UNITS.has(item.unit) ? item.unit : 'Nos';
        const match = byKey.get(key(item.name, unit));
        return {
          name: item.name.trim(),
          category: item.category?.trim() || null,
          brand: item.brand?.trim() || null,
          sku: item.sku?.trim() || null,
          unit,
          defaultRate: Number(item.rate) || 0,
          costPrice: Number(item.costPrice) || 0,
          hsnSac: item.hsnSac?.trim() || null,
          gstRate: item.gstRate ?? 18,
          specNote: item.specNote?.trim() || null,
          unitWasNormalised: !ALLOWED_UNITS.has(item.unit),
          originalUnit: item.unit,
          duplicateOf: match ? { id: match.id, currentRate: match.defaultRate } : null,
        };
      });

      res.json({
        items,
        sourceTitle: parsed.sourceTitle,
        ratesIncludeGst: parsed.ratesIncludeGst,
        notes: parsed.notes,
        confidence: parsed.confidence,
        fileName: req.file.originalname,
        pageCount: extracted?.pageCount ?? null,
      });
    } catch (err) {
      if (err instanceof AiNotConfiguredError) throw badRequest(err.message);
      throw err;
    } finally {
      // The document is only a means to the rows; nothing to retain.
      fs.rmSync(req.file.path, { force: true });
    }
  }),
);

/** Update the rate on rows the importer matched to existing catalog items. */
catalogRouter.post(
  '/bulk-update-rates',
  h(async (req, res) => {
    const updates = z
      .array(
        z.object({
          id: z.string().min(1),
          defaultRate: z.coerce.number().min(0),
          costPrice: z.coerce.number().min(0).optional(),
          specNote: z.string().nullish(),
        }),
      )
      .min(1)
      .max(2000)
      .parse(req.body.updates);

    await prisma.$transaction(
      updates.map((u) =>
        prisma.catalogItem.update({
          where: { id: u.id },
          data: {
            defaultRate: u.defaultRate,
            ...(u.costPrice !== undefined ? { costPrice: u.costPrice } : {}),
            ...(u.specNote !== undefined ? { specNote: u.specNote ?? null } : {}),
          },
        }),
      ),
    );
    res.json({ updated: updates.length });
  }),
);

/** Bulk create — used by the CSV importer on the Catalog screen. */
catalogRouter.post(
  '/bulk',
  h(async (req, res) => {
    const items = z.array(itemSchema).min(1).max(2000).parse(req.body.items);
    const created = await prisma.$transaction(
      items.map((data) => prisma.catalogItem.create({ data: data as any })),
    );
    res.status(201).json({ created: created.length });
  }),
);

catalogRouter.put(
  '/:id',
  h(async (req, res) => {
    res.json(
      await prisma.catalogItem.update({
        where: { id: String(req.params.id) },
        data: parsePatch(itemSchema, req.body) as any,
      }),
    );
  }),
);

catalogRouter.delete(
  '/:id',
  h(async (req, res) => {
    await prisma.catalogItem.delete({ where: { id: String(req.params.id) } });
    res.status(204).end();
  }),
);
