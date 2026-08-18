import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { z } from 'zod';
import { BRANDING_DIR } from '../config.js';
import { prisma } from '../db.js';
import { badRequest, h, notFound, parseDate } from '../lib/http.js';
import { nextNumber, quotePrefix } from '../lib/numbering.js';
import { getOrg } from './settings.js';

export const transferRouter = Router();

/**
 * Portable files for working as a team before there is a central server.
 *
 * Two kinds:
 *   zenstudios.setup     — company identity, lines of business, pipelines and
 *                          catalog. What a new colleague opens to be configured
 *                          identically. Carries no clients or documents.
 *   zenstudios.quotation — one quotation with its client and line items, so a
 *                          colleague can open, review or continue it.
 *
 * Both are plain JSON: readable, diffable, and safe to send over email or chat.
 */

const FILE_VERSION = 1;

/* --------------------------------- setup -------------------------------- */

const ORG_FIELDS = [
  'brandName', 'legalName', 'trademarkLine', 'cin', 'pan', 'tan', 'gstin',
  'addressLine1', 'addressLine2', 'city', 'state', 'stateCode', 'pincode', 'country',
  'email', 'phone', 'altPhone', 'website', 'brandColor', 'accentColor',
  'bankName', 'bankAccountName', 'bankAccountNo', 'bankIfsc', 'bankBranch', 'upiId',
  'defaultTerms', 'defaultInvoiceTerms', 'defaultValidityDays', 'invoicePrefix', 'proformaPrefix',
] as const;

transferRouter.get(
  '/setup',
  h(async (req, res) => {
    const org = await getOrg();
    const includeCatalog = req.query.catalog !== '0';

    const businessTypes = await prisma.businessType.findMany({
      include: { stages: { orderBy: { order: 'asc' } } },
      orderBy: { order: 'asc' },
    });

    const catalog: Record<string, unknown[]> = {};
    if (includeCatalog) {
      for (const bt of businessTypes) {
        const items = await prisma.catalogItem.findMany({
          where: { businessTypeId: bt.id },
          orderBy: [{ category: 'asc' }, { name: 'asc' }],
        });
        catalog[bt.key] = items.map(({ id, businessTypeId, createdAt, updatedAt, ...item }) => item);
      }
    }

    // The logo travels inside the file so the recipient needs nothing else.
    let logo: { filename: string; base64: string } | null = null;
    if (org.logoPath) {
      const file = path.join(BRANDING_DIR, path.basename(org.logoPath));
      if (fs.existsSync(file)) {
        logo = { filename: path.basename(org.logoPath), base64: fs.readFileSync(file).toString('base64') };
      }
    }

    const payload = {
      kind: 'zenstudios.setup',
      version: FILE_VERSION,
      exportedAt: new Date().toISOString(),
      exportedBy: org.legalName,
      organization: Object.fromEntries(ORG_FIELDS.map((f) => [f, (org as any)[f]])),
      logo,
      businessTypes: businessTypes.map((bt) => ({
        key: bt.key,
        name: bt.name,
        shortCode: bt.shortCode,
        layout: bt.layout,
        sectionLabel: bt.sectionLabel,
        description: bt.description,
        color: bt.color,
        order: bt.order,
        enableBenchmark: bt.enableBenchmark,
        defaultTerms: bt.defaultTerms,
        stages: bt.stages.map((s) => ({
          name: s.name, color: s.color, isTerminal: s.isTerminal, isWon: s.isWon,
        })),
      })),
      catalog,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${org.brandName.replace(/\W+/g, '-').toLowerCase()}-setup.zenstudios.json"`,
    );
    res.send(JSON.stringify(payload, null, 2));
  }),
);

const setupSchema = z.object({
  kind: z.literal('zenstudios.setup'),
  version: z.number(),
  organization: z.record(z.string(), z.any()),
  logo: z.object({ filename: z.string(), base64: z.string() }).nullish(),
  businessTypes: z.array(z.any()).default([]),
  catalog: z.record(z.string(), z.array(z.any())).default({}),
});

transferRouter.post(
  '/setup',
  h(async (req, res) => {
    const file = setupSchema.parse(req.body);
    if (file.version > FILE_VERSION) {
      throw badRequest('This setup file was made by a newer version of ZenStudios. Update the app first.');
    }

    const applied = { organization: false, businessTypes: 0, stages: 0, catalogItems: 0, logo: false };

    // Company identity is shared across the team, so it is applied wholesale.
    const orgData = Object.fromEntries(
      ORG_FIELDS.filter((f) => f in file.organization).map((f) => [f, file.organization[f]]),
    );
    await getOrg();
    await prisma.organization.update({ where: { id: 'org' }, data: orgData as any });
    applied.organization = true;

    if (file.logo?.base64) {
      fs.mkdirSync(BRANDING_DIR, { recursive: true });
      const safeName = path.basename(file.logo.filename);
      fs.writeFileSync(path.join(BRANDING_DIR, safeName), Buffer.from(file.logo.base64, 'base64'));
      await prisma.organization.update({ where: { id: 'org' }, data: { logoPath: safeName } });
      applied.logo = true;
    }

    // Lines of business and catalog are add-only: a colleague's own edits and
    // any local rates they have corrected are never overwritten.
    for (const bt of file.businessTypes as any[]) {
      let existing = await prisma.businessType.findUnique({ where: { key: bt.key } });
      if (!existing) {
        existing = await prisma.businessType.create({
          data: {
            key: bt.key, name: bt.name, shortCode: bt.shortCode, layout: bt.layout,
            sectionLabel: bt.sectionLabel, description: bt.description, color: bt.color,
            order: bt.order ?? 0, enableBenchmark: !!bt.enableBenchmark, defaultTerms: bt.defaultTerms,
            stages: {
              create: (bt.stages ?? []).map((s: any, order: number) => ({
                name: s.name, color: s.color ?? '#64748B', order,
                isTerminal: !!s.isTerminal, isWon: !!s.isWon,
              })),
            },
          },
        });
        applied.businessTypes++;
        applied.stages += (bt.stages ?? []).length;
      }

      const items = (file.catalog[bt.key] ?? []) as any[];
      if (!items.length) continue;

      const present = new Set(
        (await prisma.catalogItem.findMany({
          where: { businessTypeId: existing.id },
          select: { name: true, unit: true },
        })).map((e) => `${e.name.trim().toLowerCase()}|${e.unit.toLowerCase()}`),
      );

      const missing = items.filter(
        (i) => !present.has(`${String(i.name).trim().toLowerCase()}|${String(i.unit).toLowerCase()}`),
      );
      if (missing.length) {
        await prisma.catalogItem.createMany({
          data: missing.map((i) => ({
            businessTypeId: existing!.id,
            name: i.name, sku: i.sku ?? null, brand: i.brand ?? null, category: i.category ?? null,
            unit: i.unit ?? 'Nos', defaultRate: Number(i.defaultRate) || 0,
            costPrice: Number(i.costPrice) || 0, hsnSac: i.hsnSac ?? null,
            gstRate: Number(i.gstRate) || 18, specNote: i.specNote ?? null,
            active: i.active ?? true,
          })),
        });
        applied.catalogItems += missing.length;
      }
    }

    res.json(applied);
  }),
);

/* ------------------------------- quotation ------------------------------ */

transferRouter.get(
  '/quotation/:id',
  h(async (req, res) => {
    const includeCosts = req.query.costs !== '0';
    const quote = await prisma.quotation.findUnique({
      where: { id: String(req.params.id) },
      include: {
        client: true,
        businessType: true,
        sections: { orderBy: { order: 'asc' }, include: { items: { orderBy: { order: 'asc' } } } },
      },
    });
    if (!quote) throw notFound('Quotation');
    const org = await getOrg();

    const payload = {
      kind: 'zenstudios.quotation',
      version: FILE_VERSION,
      exportedAt: new Date().toISOString(),
      exportedBy: org.legalName,
      sourceNumber: quote.number,
      includesCostPrices: includeCosts,
      businessTypeKey: quote.businessType.key,
      client: {
        name: quote.client.name, kind: quote.client.kind, contactPerson: quote.client.contactPerson,
        email: quote.client.email, phone: quote.client.phone, gstin: quote.client.gstin,
        pan: quote.client.pan, addressLine1: quote.client.addressLine1,
        addressLine2: quote.client.addressLine2, city: quote.client.city, state: quote.client.state,
        stateCode: quote.client.stateCode, pincode: quote.client.pincode,
      },
      quotation: {
        title: quote.title, quoteDate: quote.quoteDate, validUntil: quote.validUntil,
        taxMode: quote.taxMode, flatGstRate: quote.flatGstRate,
        placeOfSupplyState: quote.placeOfSupplyState, placeOfSupplyCode: quote.placeOfSupplyCode,
        discountType: quote.discountType, discountValue: quote.discountValue,
        notes: quote.notes, termsText: quote.termsText,
      },
      sections: quote.sections.map((s) => ({
        name: s.name,
        notes: s.notes,
        items: s.items.map((i) => ({
          description: i.description, specNote: i.specNote, hsnSac: i.hsnSac, unit: i.unit,
          quantity: i.quantity, rate: i.rate, discountPct: i.discountPct, gstRate: i.gstRate,
          // Cost is internal. Dropped when the file is meant to leave the company.
          costPrice: includeCosts ? i.costPrice : 0,
        })),
      })),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${quote.number.replace(/[\\/]/g, '-')}.zenstudios.json"`,
    );
    res.send(JSON.stringify(payload, null, 2));
  }),
);

const quotationFileSchema = z.object({
  kind: z.literal('zenstudios.quotation'),
  version: z.number(),
  sourceNumber: z.string().nullish(),
  exportedBy: z.string().nullish(),
  businessTypeKey: z.string(),
  client: z.object({ name: z.string().min(1) }).passthrough(),
  quotation: z.object({ title: z.string().min(1) }).passthrough(),
  sections: z
    .array(
      z.object({
        name: z.string(),
        notes: z.string().nullish(),
        items: z.array(z.object({ description: z.string() }).passthrough()),
      }),
    )
    .min(1),
});

transferRouter.post(
  '/quotation',
  h(async (req, res) => {
    const file = quotationFileSchema.parse(req.body);
    if (file.version > FILE_VERSION) {
      throw badRequest('This quotation file was made by a newer version of ZenStudios. Update the app first.');
    }

    const businessType = await prisma.businessType.findUnique({ where: { key: file.businessTypeKey } });
    if (!businessType) {
      throw badRequest(
        `This quotation belongs to a line of business you do not have ("${file.businessTypeKey}"). ` +
          'Import the setup file from your colleague first, then try again.',
      );
    }

    // Reuse a matching client rather than creating a duplicate.
    const c = file.client as any;
    let client =
      (c.gstin ? await prisma.client.findFirst({ where: { gstin: c.gstin } }) : null) ??
      (await prisma.client.findFirst({ where: { name: c.name } }));

    let clientCreated = false;
    if (!client) {
      client = await prisma.client.create({
        data: {
          name: c.name, kind: c.kind ?? 'COMPANY', contactPerson: c.contactPerson ?? null,
          email: c.email ?? null, phone: c.phone ?? null, gstin: c.gstin ?? null, pan: c.pan ?? null,
          addressLine1: c.addressLine1 ?? null, addressLine2: c.addressLine2 ?? null,
          city: c.city ?? null, state: c.state ?? null, stateCode: c.stateCode ?? null,
          pincode: c.pincode ?? null,
        },
      });
      clientCreated = true;
    }

    const q = file.quotation as any;
    const quoteDate = parseDate(q.quoteDate) ?? new Date();
    // A local number in the recipient's own series — two people must never end
    // up believing they own the same document number.
    const number = await nextNumber(quotePrefix(businessType.shortCode), quoteDate);

    const created = await prisma.quotation.create({
      data: {
        number,
        businessTypeId: businessType.id,
        clientId: client.id,
        title: q.title,
        status: 'DRAFT',
        quoteDate,
        validUntil: parseDate(q.validUntil),
        taxMode: q.taxMode ?? 'FULL_GST',
        flatGstRate: Number(q.flatGstRate) || 18,
        placeOfSupplyState: q.placeOfSupplyState ?? null,
        placeOfSupplyCode: q.placeOfSupplyCode ?? null,
        discountType: q.discountType ?? 'NONE',
        discountValue: Number(q.discountValue) || 0,
        notes: q.notes ?? null,
        termsText: q.termsText ?? businessType.defaultTerms,
        sections: {
          create: file.sections.map((s, si) => ({
            name: s.name || businessType.sectionLabel,
            notes: s.notes ?? null,
            order: si,
            items: {
              create: s.items.map((i: any, ii) => ({
                description: i.description,
                specNote: i.specNote ?? null,
                hsnSac: i.hsnSac ?? null,
                unit: i.unit ?? 'Nos',
                quantity: Number(i.quantity) || 0,
                rate: Number(i.rate) || 0,
                costPrice: Number(i.costPrice) || 0,
                discountPct: Number(i.discountPct) || 0,
                gstRate: Number(i.gstRate) || 18,
                order: ii,
                amount: 0,
              })),
            },
          })),
        },
      },
    });

    // Totals are recomputed locally rather than trusted from the file.
    const { recalculateQuotation } = await import('./quotations.js');
    const recalculated = await recalculateQuotation(created.id);

    await prisma.note.create({
      data: {
        quotationId: created.id,
        kind: 'SYSTEM',
        body:
          `Imported from ${file.exportedBy ?? 'a colleague'}` +
          (file.sourceNumber ? ` (their ${file.sourceNumber})` : '') +
          `. Issued locally as ${number}.`,
      },
    });

    res.status(201).json({ ...recalculated, clientCreated, sourceNumber: file.sourceNumber ?? null });
  }),
);
