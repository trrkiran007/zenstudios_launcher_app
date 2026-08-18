import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { badRequest, h, notFound, parseDate } from '../lib/http.js';
import { round2 } from '../lib/money.js';
import { nextNumber, projectPrefix, quotePrefix } from '../lib/numbering.js';
import { htmlToPdf } from '../lib/pdf.js';
import { computeTotals, lineAmount } from '../lib/totals.js';
import { renderDocumentHtml, type DocumentModel } from '../templates/document.js';
import { getOrg } from './settings.js';

export const quotationsRouter = Router();

const itemSchema = z.object({
  catalogItemId: z.string().nullish(),
  description: z.string().min(1),
  specNote: z.string().nullish(),
  hsnSac: z.string().nullish(),
  unit: z.string().default('Nos'),
  quantity: z.coerce.number().default(1),
  rate: z.coerce.number().default(0),
  costPrice: z.coerce.number().default(0),
  discountPct: z.coerce.number().min(0).max(100).default(0),
  gstRate: z.coerce.number().min(0).max(50).default(18),
});

const sectionSchema = z.object({
  name: z.string().min(1),
  notes: z.string().nullish(),
  items: z.array(itemSchema).default([]),
});

const quotationSchema = z.object({
  businessTypeId: z.string().min(1),
  clientId: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'SUPERSEDED']).optional(),
  quoteDate: z.string().nullish(),
  validUntil: z.string().nullish(),
  taxMode: z.enum(['FULL_GST', 'FLAT']).default('FULL_GST'),
  flatGstRate: z.coerce.number().min(0).max(50).default(18),
  placeOfSupplyState: z.string().nullish(),
  placeOfSupplyCode: z.string().nullish(),
  discountType: z.enum(['NONE', 'PERCENT', 'AMOUNT']).default('NONE'),
  discountValue: z.coerce.number().min(0).default(0),
  notes: z.string().nullish(),
  termsText: z.string().nullish(),
  sections: z.array(sectionSchema).default([]),
});

const fullInclude = {
  businessType: true,
  client: true,
  sections: { orderBy: { order: 'asc' as const }, include: { items: { orderBy: { order: 'asc' as const } } } },
  project: { include: { stage: true } },
  revisions: { select: { id: true, number: true, version: true, status: true } },
  parent: { select: { id: true, number: true, version: true } },
  notesLog: { orderBy: { createdAt: 'desc' as const }, include: { attachments: true } },
  attachments: true,
};

/**
 * Resolve the place of supply the same way the printed document does: an
 * explicit override wins, otherwise the client's own state. Without this the
 * stored totals and the PDF could disagree on IGST vs CGST+SGST.
 */
async function placeOfSupplyFor(input: z.infer<typeof quotationSchema>) {
  if (input.placeOfSupplyCode) return input.placeOfSupplyCode;
  const client = await prisma.client.findUnique({
    where: { id: input.clientId },
    select: { stateCode: true },
  });
  return client?.stateCode ?? null;
}

async function totalsFor(input: z.infer<typeof quotationSchema>) {
  const org = await getOrg();
  return computeTotals({
    sections: input.sections,
    taxMode: input.taxMode,
    flatGstRate: input.flatGstRate,
    discountType: input.discountType,
    discountValue: input.discountValue,
    supplierStateCode: org.stateCode,
    placeOfSupplyCode: await placeOfSupplyFor(input),
  });
}

function nestedSectionCreate(sections: z.infer<typeof sectionSchema>[]) {
  return sections.map((section, si) => ({
    name: section.name,
    notes: section.notes ?? null,
    order: si,
    items: {
      create: section.items.map((item, ii) => ({
        ...item,
        catalogItemId: item.catalogItemId ?? null,
        specNote: item.specNote ?? null,
        hsnSac: item.hsnSac ?? null,
        order: ii,
        amount: lineAmount(item),
      })),
    },
  }));
}

quotationsRouter.get(
  '/',
  h(async (req, res) => {
    const { businessTypeId, status, clientId, q } = req.query as Record<string, string | undefined>;
    const archived = req.query.archived === '1';
    const rows = await prisma.quotation.findMany({
      where: {
        ...(businessTypeId ? { businessTypeId } : {}),
        ...(status ? { status } : {}),
        ...(clientId ? { clientId } : {}),
        ...(archived ? { NOT: { archivedAt: null } } : { archivedAt: null }),
        ...(q
          ? { OR: [{ number: { contains: q } }, { title: { contains: q } }, { client: { name: { contains: q } } }] }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        businessType: { select: { id: true, name: true, key: true, color: true, shortCode: true } },
        client: { select: { id: true, name: true, city: true } },
        project: { select: { id: true, code: true } },
        _count: { select: { revisions: true } },
      },
    });
    res.json(rows);
  }),
);

quotationsRouter.get(
  '/:id',
  h(async (req, res) => {
    const quote = await prisma.quotation.findUnique({ where: { id: String(req.params.id) }, include: fullInclude });
    if (!quote) throw notFound('Quotation');
    res.json(quote);
  }),
);

quotationsRouter.post(
  '/',
  h(async (req, res) => {
    const input = quotationSchema.parse(req.body);
    const bt = await prisma.businessType.findUnique({ where: { id: input.businessTypeId } });
    if (!bt) throw badRequest('Unknown business type');

    const org = await getOrg();
    const totals = await totalsFor(input);
    const quoteDate = parseDate(input.quoteDate) ?? new Date();
    const number = await nextNumber(quotePrefix(bt.shortCode), quoteDate);

    const created = await prisma.quotation.create({
      data: {
        number,
        businessTypeId: input.businessTypeId,
        clientId: input.clientId,
        title: input.title,
        status: input.status ?? 'DRAFT',
        quoteDate,
        validUntil:
          parseDate(input.validUntil) ??
          new Date(quoteDate.getTime() + (org.defaultValidityDays || 15) * 86400000),
        taxMode: input.taxMode,
        flatGstRate: input.flatGstRate,
        placeOfSupplyState: input.placeOfSupplyState ?? null,
        placeOfSupplyCode: input.placeOfSupplyCode ?? null,
        discountType: input.discountType,
        discountValue: input.discountValue,
        notes: input.notes ?? null,
        termsText: input.termsText ?? bt.defaultTerms ?? org.defaultTerms ?? null,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxableValue: totals.taxableValue,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        roundOff: totals.roundOff,
        grandTotal: totals.grandTotal,
        totalCost: totals.totalCost,
        grossProfit: totals.grossProfit,
        marginPct: totals.marginPct,
        sections: { create: nestedSectionCreate(input.sections) },
      },
      include: fullInclude,
    });
    res.status(201).json(created);
  }),
);

quotationsRouter.put(
  '/:id',
  h(async (req, res) => {
    const input = quotationSchema.parse(req.body);
    const existing = await prisma.quotation.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) throw notFound('Quotation');
    if (existing.status === 'ACCEPTED') {
      throw badRequest('This quotation is accepted and locked. Create a revision to change it.');
    }

    const totals = await totalsFor(input);

    // Sections/items are replaced wholesale — the editor always posts the full tree.
    await prisma.$transaction([
      prisma.quotationSection.deleteMany({ where: { quotationId: existing.id } }),
      prisma.quotation.update({
        where: { id: existing.id },
        data: {
          businessTypeId: input.businessTypeId,
          clientId: input.clientId,
          title: input.title,
          ...(input.status ? { status: input.status } : {}),
          quoteDate: parseDate(input.quoteDate) ?? existing.quoteDate,
          validUntil: parseDate(input.validUntil),
          taxMode: input.taxMode,
          flatGstRate: input.flatGstRate,
          placeOfSupplyState: input.placeOfSupplyState ?? null,
          placeOfSupplyCode: input.placeOfSupplyCode ?? null,
          discountType: input.discountType,
          discountValue: input.discountValue,
          notes: input.notes ?? null,
          termsText: input.termsText ?? null,
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          taxableValue: totals.taxableValue,
          cgst: totals.cgst,
          sgst: totals.sgst,
          igst: totals.igst,
          roundOff: totals.roundOff,
          grandTotal: totals.grandTotal,
          totalCost: totals.totalCost,
          grossProfit: totals.grossProfit,
          marginPct: totals.marginPct,
          sections: { create: nestedSectionCreate(input.sections) },
        },
      }),
    ]);

    res.json(await prisma.quotation.findUnique({ where: { id: existing.id }, include: fullInclude }));
  }),
);

quotationsRouter.patch(
  '/:id/status',
  h(async (req, res) => {
    const { status, note } = z
      .object({
        status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'SUPERSEDED']),
        note: z.string().nullish(),
      })
      .parse(req.body);

    const quote = await prisma.quotation.findUnique({ where: { id: String(req.params.id) } });
    if (!quote) throw notFound('Quotation');

    const updated = await prisma.quotation.update({
      where: { id: quote.id },
      data: {
        status,
        sentAt: status === 'SENT' ? quote.sentAt ?? new Date() : quote.sentAt,
        decidedAt: ['ACCEPTED', 'REJECTED'].includes(status) ? new Date() : quote.decidedAt,
      },
      include: fullInclude,
    });

    await prisma.note.create({
      data: {
        quotationId: quote.id,
        kind: 'SYSTEM',
        body: `Status changed ${quote.status} → ${status}${note ? `. ${note}` : ''}`,
      },
    });

    res.json(updated);
  }),
);

quotationsRouter.patch(
  '/:id/archive',
  h(async (req, res) => {
    const archive = req.body?.archive !== false;
    res.json(
      await prisma.quotation.update({
        where: { id: String(req.params.id) },
        data: { archivedAt: archive ? new Date() : null },
        include: fullInclude,
      }),
    );
  }),
);

/** Copy a quotation into a fresh DRAFT — either as a new revision or a plain duplicate. */
async function cloneQuotation(id: string, mode: 'revision' | 'duplicate') {
  const src = await prisma.quotation.findUnique({
    where: { id },
    include: { sections: { orderBy: { order: 'asc' }, include: { items: { orderBy: { order: 'asc' } } } }, businessType: true },
  });
  if (!src) throw notFound('Quotation');

  const rootId = src.parentId ?? src.id;
  const number =
    mode === 'revision'
      ? `${(await prisma.quotation.findUnique({ where: { id: rootId } }))!.number}-R${src.version}`
      : await nextNumber(quotePrefix(src.businessType.shortCode));

  const copy = await prisma.quotation.create({
    data: {
      number,
      version: mode === 'revision' ? src.version + 1 : 1,
      parentId: mode === 'revision' ? rootId : null,
      businessTypeId: src.businessTypeId,
      clientId: src.clientId,
      title: mode === 'revision' ? src.title : `${src.title} (copy)`,
      status: 'DRAFT',
      quoteDate: new Date(),
      validUntil: src.validUntil,
      taxMode: src.taxMode,
      flatGstRate: src.flatGstRate,
      placeOfSupplyState: src.placeOfSupplyState,
      placeOfSupplyCode: src.placeOfSupplyCode,
      discountType: src.discountType,
      discountValue: src.discountValue,
      notes: src.notes,
      termsText: src.termsText,
      subtotal: src.subtotal,
      discountAmount: src.discountAmount,
      taxableValue: src.taxableValue,
      cgst: src.cgst,
      sgst: src.sgst,
      igst: src.igst,
      roundOff: src.roundOff,
      grandTotal: src.grandTotal,
      totalCost: src.totalCost,
      grossProfit: src.grossProfit,
      marginPct: src.marginPct,
      sections: {
        create: src.sections.map((s) => ({
          name: s.name,
          notes: s.notes,
          order: s.order,
          items: {
            create: s.items.map(({ id: _id, sectionId: _sid, ...item }) => item),
          },
        })),
      },
    },
    include: fullInclude,
  });

  if (mode === 'revision' && src.status !== 'ACCEPTED') {
    await prisma.quotation.update({ where: { id: src.id }, data: { status: 'SUPERSEDED' } });
  }
  return copy;
}

quotationsRouter.post('/:id/revise', h(async (req, res) => res.status(201).json(await cloneQuotation(String(req.params.id), 'revision'))));
quotationsRouter.post('/:id/duplicate', h(async (req, res) => res.status(201).json(await cloneQuotation(String(req.params.id), 'duplicate'))));

/** Accepted quote -> tracked project sitting in the first pipeline stage. */
quotationsRouter.post(
  '/:id/convert',
  h(async (req, res) => {
    const { name, startDate, targetDate, seedTasks } = z
      .object({
        name: z.string().nullish(),
        startDate: z.string().nullish(),
        targetDate: z.string().nullish(),
        seedTasks: z.boolean().default(true),
      })
      .parse(req.body ?? {});

    const quote = await prisma.quotation.findUnique({
      where: { id: String(req.params.id) },
      include: { businessType: { include: { stages: { orderBy: { order: 'asc' } } } }, project: true },
    });
    if (!quote) throw notFound('Quotation');
    if (quote.project) throw badRequest('This quotation has already been converted.');
    const firstStage = quote.businessType.stages[0];
    if (!firstStage) throw badRequest('This business type has no pipeline stages configured.');

    const code = await nextNumber(projectPrefix(quote.businessType.shortCode));
    const project = await prisma.project.create({
      data: {
        code,
        name: name?.trim() || quote.title,
        businessTypeId: quote.businessTypeId,
        clientId: quote.clientId,
        quotationId: quote.id,
        stageId: firstStage.id,
        contractValue: quote.grandTotal,
        estimatedCost: quote.totalCost,
        startDate: parseDate(startDate) ?? new Date(),
        targetDate: parseDate(targetDate),
        ...(seedTasks
          ? {
              tasks: {
                create: quote.businessType.stages.slice(0, 4).map((stage, i) => ({
                  title: `${stage.name}`,
                  description: `Auto-created from ${quote.number} on conversion.`,
                  order: i,
                  priority: i === 0 ? 'HIGH' : 'MEDIUM',
                })),
              },
            }
          : {}),
        stageEvents: { create: { toStage: firstStage.name, note: `Converted from ${quote.number}` } },
      },
      include: { stage: true, businessType: true, client: true, tasks: true },
    });

    if (quote.status !== 'ACCEPTED') {
      await prisma.quotation.update({
        where: { id: quote.id },
        data: { status: 'ACCEPTED', decidedAt: new Date() },
      });
    }

    res.status(201).json(project);
  }),
);

quotationsRouter.delete(
  '/:id',
  h(async (req, res) => {
    const quote = await prisma.quotation.findUnique({ where: { id: String(req.params.id) }, include: { project: true } });
    if (!quote) throw notFound('Quotation');
    if (quote.project) throw badRequest('Delete or unlink the converted project first.');
    if (quote.status === 'ACCEPTED') throw badRequest('Accepted quotations cannot be deleted. Archive it instead.');
    await prisma.quotation.delete({ where: { id: quote.id } });
    res.status(204).end();
  }),
);

/** Build the print model shared by the HTML preview and the PDF export. */
export async function quotationDocument(id: string): Promise<DocumentModel> {
  const quote = await prisma.quotation.findUnique({
    where: { id },
    include: {
      client: true,
      businessType: true,
      sections: { orderBy: { order: 'asc' }, include: { items: { orderBy: { order: 'asc' } } } },
    },
  });
  if (!quote) throw notFound('Quotation');
  const org = await getOrg();

  const totals = computeTotals({
    sections: quote.sections,
    taxMode: quote.taxMode,
    flatGstRate: quote.flatGstRate,
    discountType: quote.discountType,
    discountValue: quote.discountValue,
    supplierStateCode: org.stateCode,
    placeOfSupplyCode: quote.placeOfSupplyCode || quote.client.stateCode,
  });

  return {
    kind: 'QUOTATION',
    title: quote.title,
    number: quote.number,
    date: quote.quoteDate,
    secondaryDateLabel: 'Valid till',
    secondaryDate: quote.validUntil,
    subject: quote.title,
    org,
    party: {
      ...quote.client,
      stateCode: quote.placeOfSupplyCode || quote.client.stateCode,
      state: quote.placeOfSupplyState || quote.client.state,
    },
    sections: quote.sections.map((s) => ({ name: s.name, notes: s.notes, items: s.items })),
    totals,
    showHsn: quote.taxMode === 'FULL_GST',
    showSectionTotals: quote.businessType.layout === 'SECTIONED',
    notes: quote.notes,
    terms: quote.termsText,
    statusStamp: quote.status === 'DRAFT' ? 'DRAFT' : quote.status === 'ACCEPTED' ? 'ACCEPTED' : null,
  };
}

quotationsRouter.get(
  '/:id/print',
  h(async (req, res) => {
    res.type('html').send(renderDocumentHtml(await quotationDocument(String(req.params.id))));
  }),
);

quotationsRouter.get(
  '/:id/pdf',
  h(async (req, res) => {
    const model = await quotationDocument(String(req.params.id));
    const pdf = await htmlToPdf(renderDocumentHtml(model));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${req.query.download === '1' ? 'attachment' : 'inline'}; filename="${model.number.replace(/[\\/]/g, '-')}.pdf"`,
    );
    res.send(pdf);
  }),
);

/** Margin drill-down used by the quote editor's profitability panel. */
quotationsRouter.get(
  '/:id/margin',
  h(async (req, res) => {
    const quote = await prisma.quotation.findUnique({
      where: { id: String(req.params.id) },
      include: { sections: { orderBy: { order: 'asc' }, include: { items: { orderBy: { order: 'asc' } } } } },
    });
    if (!quote) throw notFound('Quotation');

    const sections = quote.sections.map((s) => {
      const revenue = round2(s.items.reduce((a, i) => a + i.amount, 0));
      const cost = round2(s.items.reduce((a, i) => a + i.costPrice * i.quantity, 0));
      return {
        id: s.id,
        name: s.name,
        revenue,
        cost,
        profit: round2(revenue - cost),
        marginPct: revenue > 0 ? round2(((revenue - cost) / revenue) * 100) : 0,
      };
    });

    res.json({
      taxableValue: quote.taxableValue,
      totalCost: quote.totalCost,
      grossProfit: quote.grossProfit,
      marginPct: quote.marginPct,
      sections,
    });
  }),
);
