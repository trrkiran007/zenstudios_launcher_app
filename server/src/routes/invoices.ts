import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { badRequest, h, notFound, parseDate } from '../lib/http.js';
import { formatINR, round2 } from '../lib/money.js';
import { nextNumber } from '../lib/numbering.js';
import { htmlToPdf } from '../lib/pdf.js';
import { computeTotals, lineAmount } from '../lib/totals.js';
import { renderDocumentHtml, type DocumentModel } from '../templates/document.js';
import { getOrg } from './settings.js';

export const invoicesRouter = Router();

const itemSchema = z.object({
  description: z.string().min(1),
  specNote: z.string().nullish(),
  hsnSac: z.string().nullish(),
  unit: z.string().default('Nos'),
  quantity: z.coerce.number().default(1),
  rate: z.coerce.number().default(0),
  discountPct: z.coerce.number().min(0).max(100).default(0),
  gstRate: z.coerce.number().min(0).max(50).default(18),
});

const invoiceSchema = z.object({
  type: z.enum(['PROFORMA', 'TAX']).default('TAX'),
  projectId: z.string().nullish(),
  quotationId: z.string().nullish(),
  clientId: z.string().min(1),
  issueDate: z.string().nullish(),
  dueDate: z.string().nullish(),
  poNumber: z.string().nullish(),
  poDate: z.string().nullish(),
  taxMode: z.enum(['FULL_GST', 'FLAT']).default('FULL_GST'),
  flatGstRate: z.coerce.number().min(0).max(50).default(18),
  placeOfSupplyState: z.string().nullish(),
  placeOfSupplyCode: z.string().nullish(),
  discountType: z.enum(['NONE', 'PERCENT', 'AMOUNT']).default('NONE'),
  discountValue: z.coerce.number().min(0).default(0),
  notes: z.string().nullish(),
  termsText: z.string().nullish(),
  items: z.array(itemSchema).default([]),
});


/**
 * The "Subject:" line printed on the document.
 *
 * A buyer with a purchase order reconciles on *their* number, so when a PO is
 * supplied it leads. The quotation is still named after it, because that is
 * what the price was agreed against.
 */
export function invoiceSubject(opts: {
  poNumber?: string | null;
  poDate?: Date | string | null;
  quotationNumber?: string | null;
  title?: string | null;
}) {
  const parts: string[] = [];

  if (opts.poNumber?.trim()) {
    const dated = opts.poDate
      ? ` dated ${new Date(opts.poDate).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric',
        })}`
      : '';
    parts.push(`Against Purchase Order ${opts.poNumber.trim()}${dated}`);
    if (opts.quotationNumber) parts.push(`our quotation ${opts.quotationNumber}`);
  } else if (opts.quotationNumber) {
    parts.push(`Against quotation ${opts.quotationNumber}`);
  }

  const head = parts.join(' · ');
  const title = opts.title?.trim();
  if (head && title) return `${head} — ${title}`;
  return head || title || '';
}

const fullInclude = {
  client: true,
  items: { orderBy: { order: 'asc' as const } },
  payments: { orderBy: { date: 'desc' as const } },
  project: { select: { id: true, code: true, name: true } },
  quotation: { select: { id: true, number: true, title: true } },
};

/** Explicit override wins, else the client's state — matching the printed invoice. */
async function totalsOf(input: z.infer<typeof invoiceSchema>) {
  const org = await getOrg();
  const placeOfSupplyCode =
    input.placeOfSupplyCode ??
    (await prisma.client.findUnique({ where: { id: input.clientId }, select: { stateCode: true } }))
      ?.stateCode ??
    null;

  return computeTotals({
    sections: [{ items: input.items }],
    taxMode: input.taxMode,
    flatGstRate: input.flatGstRate,
    discountType: input.discountType,
    discountValue: input.discountValue,
    supplierStateCode: org.stateCode,
    placeOfSupplyCode,
  });
}

const totalsData = (t: Awaited<ReturnType<typeof totalsOf>>) => ({
  subtotal: t.subtotal,
  discountAmount: t.discountAmount,
  taxableValue: t.taxableValue,
  cgst: t.cgst,
  sgst: t.sgst,
  igst: t.igst,
  roundOff: t.roundOff,
  grandTotal: t.grandTotal,
});

invoicesRouter.get(
  '/',
  h(async (req, res) => {
    const { projectId, clientId, status, type } = req.query as Record<string, string | undefined>;
    res.json(
      await prisma.invoice.findMany({
        where: {
          ...(projectId ? { projectId } : {}),
          ...(clientId ? { clientId } : {}),
          ...(status ? { status } : {}),
          ...(type ? { type } : {}),
        },
        orderBy: { issueDate: 'desc' },
        include: { client: { select: { id: true, name: true } }, payments: true, project: { select: { id: true, code: true, name: true } } },
      }),
    );
  }),
);

invoicesRouter.get(
  '/:id',
  h(async (req, res) => {
    const invoice = await prisma.invoice.findUnique({ where: { id: String(req.params.id) }, include: fullInclude });
    if (!invoice) throw notFound('Invoice');
    res.json(invoice);
  }),
);

invoicesRouter.post(
  '/',
  h(async (req, res) => {
    const input = invoiceSchema.parse(req.body);
    const org = await getOrg();
    const totals = await totalsOf(input);
    const issueDate = parseDate(input.issueDate) ?? new Date();
    const number = await nextNumber(
      input.type === 'PROFORMA' ? org.proformaPrefix : org.invoicePrefix,
      issueDate,
    );

    const created = await prisma.invoice.create({
      data: {
        number,
        type: input.type,
        projectId: input.projectId ?? null,
        quotationId: input.quotationId ?? null,
        clientId: input.clientId,
        issueDate,
        dueDate: parseDate(input.dueDate),
        poNumber: input.poNumber?.trim() || null,
        poDate: parseDate(input.poDate),
        taxMode: input.taxMode,
        flatGstRate: input.flatGstRate,
        placeOfSupplyState: input.placeOfSupplyState ?? null,
        placeOfSupplyCode: input.placeOfSupplyCode ?? null,
        discountType: input.discountType,
        discountValue: input.discountValue,
        notes: input.notes ?? null,
        termsText: input.termsText ?? org.defaultInvoiceTerms ?? null,
        ...totalsData(totals),
        items: {
          create: input.items.map((item, i) => ({
            ...item,
            specNote: item.specNote ?? null,
            hsnSac: item.hsnSac ?? null,
            order: i,
            amount: lineAmount(item),
          })),
        },
      },
      include: fullInclude,
    });
    res.status(201).json(created);
  }),
);

/** Raise a full or part-value invoice straight off a quotation. */
invoicesRouter.post(
  '/from-quotation',
  h(async (req, res) => {
    const { quotationId, type, mode, percentage, label, poNumber, poDate, termsText } = z
      .object({
        quotationId: z.string().min(1),
        type: z.enum(['PROFORMA', 'TAX']).default('TAX'),
        mode: z.enum(['FULL', 'MILESTONE']).default('FULL'),
        percentage: z.coerce.number().min(0.01).max(100).default(100),
        label: z.string().nullish(),
        poNumber: z.string().nullish(),
        poDate: z.string().nullish(),
        termsText: z.string().nullish(),
      })
      .parse(req.body);

    const quote = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        client: true,
        project: true,
        sections: { orderBy: { order: 'asc' }, include: { items: { orderBy: { order: 'asc' } } } },
      },
    });
    if (!quote) throw notFound('Quotation');

    const items: z.infer<typeof itemSchema>[] =
      mode === 'FULL'
        ? quote.sections.flatMap((s) =>
            s.items.map((it) => ({
              description: quote.sections.length > 1 ? `${s.name} — ${it.description}` : it.description,
              specNote: it.specNote,
              hsnSac: it.hsnSac,
              unit: it.unit,
              quantity: it.quantity,
              rate: it.rate,
              discountPct: it.discountPct,
              gstRate: it.gstRate,
            })),
          )
        : [
            {
              description: label?.trim() || `${percentage}% milestone against quotation ${quote.number}`,
              specNote: quote.title,
              hsnSac: quote.sections[0]?.items[0]?.hsnSac ?? null,
              unit: 'Lump sum',
              quantity: 1,
              rate: round2(quote.taxableValue * (percentage / 100)),
              discountPct: 0,
              gstRate: quote.taxMode === 'FLAT' ? quote.flatGstRate : quote.sections[0]?.items[0]?.gstRate ?? 18,
            },
          ];

    if (!items.length) throw badRequest('This quotation has no line items to invoice.');

    const org = await getOrg();
    const input = invoiceSchema.parse({
      type,
      projectId: quote.project?.id ?? null,
      quotationId: quote.id,
      clientId: quote.clientId,
      taxMode: quote.taxMode,
      flatGstRate: quote.flatGstRate,
      placeOfSupplyState: quote.placeOfSupplyState ?? quote.client.state,
      placeOfSupplyCode: quote.placeOfSupplyCode ?? quote.client.stateCode,
      discountType: mode === 'FULL' ? quote.discountType : 'NONE',
      discountValue: mode === 'FULL' ? quote.discountValue : 0,
      poNumber: poNumber?.trim() || null,
      poDate: poDate || null,
      notes: invoiceSubject({
        poNumber,
        poDate,
        quotationNumber: quote.number,
        title: quote.title,
      }),
      // Explicit choice wins; otherwise our standard invoice terms, falling back
      // to the quotation's own so the document is never issued with none.
      termsText: termsText ?? org.defaultInvoiceTerms ?? quote.termsText ?? null,
      items,
    });

    const totals = await totalsOf(input);
    const issueDate = new Date();
    const number = await nextNumber(type === 'PROFORMA' ? org.proformaPrefix : org.invoicePrefix, issueDate);

    const created = await prisma.invoice.create({
      data: {
        number,
        type,
        projectId: input.projectId,
        quotationId: input.quotationId,
        clientId: input.clientId,
        issueDate,
        dueDate: new Date(issueDate.getTime() + 15 * 86400000),
        poNumber: input.poNumber?.trim() || null,
        poDate: parseDate(input.poDate),
        taxMode: input.taxMode,
        flatGstRate: input.flatGstRate,
        placeOfSupplyState: input.placeOfSupplyState ?? null,
        placeOfSupplyCode: input.placeOfSupplyCode ?? null,
        discountType: input.discountType,
        discountValue: input.discountValue,
        notes: input.notes ?? null,
        termsText: input.termsText ?? null,
        status: 'DRAFT',
        ...totalsData(totals),
        items: {
          create: input.items.map((item, i) => ({
            ...item,
            specNote: item.specNote ?? null,
            hsnSac: item.hsnSac ?? null,
            order: i,
            amount: lineAmount(item),
          })),
        },
      },
      include: fullInclude,
    });
    res.status(201).json(created);
  }),
);

invoicesRouter.put(
  '/:id',
  h(async (req, res) => {
    const input = invoiceSchema.parse(req.body);
    const existing = await prisma.invoice.findUnique({ where: { id: String(req.params.id) }, include: { payments: true } });
    if (!existing) throw notFound('Invoice');
    if (existing.payments.length) throw badRequest('This invoice has payments recorded. Cancel it and raise a new one.');

    const totals = await totalsOf(input);
    await prisma.$transaction([
      prisma.invoiceItem.deleteMany({ where: { invoiceId: existing.id } }),
      prisma.invoice.update({
        where: { id: existing.id },
        data: {
          type: input.type,
          projectId: input.projectId ?? null,
          quotationId: input.quotationId ?? null,
          clientId: input.clientId,
          issueDate: parseDate(input.issueDate) ?? existing.issueDate,
          dueDate: parseDate(input.dueDate),
          poNumber: input.poNumber?.trim() || null,
          poDate: parseDate(input.poDate),
          taxMode: input.taxMode,
          flatGstRate: input.flatGstRate,
          placeOfSupplyState: input.placeOfSupplyState ?? null,
          placeOfSupplyCode: input.placeOfSupplyCode ?? null,
          discountType: input.discountType,
          discountValue: input.discountValue,
          notes: input.notes ?? null,
          termsText: input.termsText ?? null,
          ...totalsData(totals),
          items: {
            create: input.items.map((item, i) => ({
              ...item,
              specNote: item.specNote ?? null,
              hsnSac: item.hsnSac ?? null,
              order: i,
              amount: lineAmount(item),
            })),
          },
        },
      }),
    ]);
    res.json(await prisma.invoice.findUnique({ where: { id: existing.id }, include: fullInclude }));
  }),
);

/**
 * Attach or change the buyer's purchase order on an invoice that already
 * exists. Touches no money, so it is safe on an issued document — the subject
 * line is recomposed unless it has been hand-written.
 */
/**
 * What is left to invoice on a project.
 *
 * Everything is compared ex-GST: the contract's taxable value against the
 * taxable value already invoiced. Cancelled invoices do not count. Raising a
 * second tax invoice for money already invoiced would declare the same supply
 * twice and pay GST on it twice, so the caller is given the real remaining
 * figure rather than being left to work it out.
 */
async function projectBilling(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      quotation: { include: { sections: { orderBy: { order: 'asc' }, include: { items: { orderBy: { order: 'asc' } } } } } },
      invoices: { where: { status: { not: 'CANCELLED' } } },
    },
  });
  if (!project) throw notFound('Project');

  const contractTaxable = round2(project.quotation?.taxableValue ?? 0);
  const invoicedTaxable = round2(project.invoices.reduce((a, i) => a + i.taxableValue, 0));
  const receivedTotal = round2(project.invoices.reduce((a, i) => a + i.amountPaid, 0));

  return {
    project,
    contractTaxable,
    invoicedTaxable,
    remainingTaxable: round2(Math.max(0, contractTaxable - invoicedTaxable)),
    receivedTotal,
  };
}

invoicesRouter.get(
  '/billing/project/:id',
  h(async (req, res) => {
    const b = await projectBilling(String(req.params.id));
    res.json({
      contractTaxable: b.contractTaxable,
      invoicedTaxable: b.invoicedTaxable,
      remainingTaxable: b.remainingTaxable,
      receivedTotal: b.receivedTotal,
      invoiceCount: b.project.invoices.length,
      quotationNumber: b.project.quotation?.number ?? null,
      clientName: b.project.client.name,
      clientArchived: b.project.client.archived,
    });
  }),
);

/**
 * Raise an invoice against a project rather than its quotation, so progressive
 * billing knows what has already been invoiced.
 */
invoicesRouter.post(
  '/from-project',
  h(async (req, res) => {
    const input = z
      .object({
        projectId: z.string().min(1),
        type: z.enum(['PROFORMA', 'TAX']).default('TAX'),
        mode: z.enum(['REMAINING', 'PERCENT', 'AMOUNT']).default('REMAINING'),
        percentage: z.coerce.number().min(0.01).max(100).optional(),
        amount: z.coerce.number().positive().optional(),
        label: z.string().nullish(),
        poNumber: z.string().nullish(),
        poDate: z.string().nullish(),
        termsText: z.string().nullish(),
        allowOverInvoice: z.boolean().default(false),
      })
      .parse(req.body);

    const b = await projectBilling(input.projectId);
    const quote = b.project.quotation;
    if (!quote) throw badRequest('This project has no source quotation to bill against.');

    const base =
      input.mode === 'REMAINING'
        ? b.remainingTaxable
        : input.mode === 'PERCENT'
          ? round2(b.contractTaxable * ((input.percentage ?? 0) / 100))
          : round2(input.amount ?? 0);

    if (base <= 0) {
      throw badRequest(
        b.remainingTaxable <= 0
          ? `Nothing left to invoice — the full contract value of this project is already on ${b.project.invoices.length} invoice(s). Record the payment against the existing invoice instead.`
          : 'That works out to zero. Check the percentage or amount.',
      );
    }

    if (!input.allowOverInvoice && round2(b.invoicedTaxable + base) > round2(b.contractTaxable + 0.5)) {
      throw badRequest(
        `That would invoice ${formatINR(b.invoicedTaxable + base)} against a contract of ${formatINR(b.contractTaxable)} — ` +
          `${formatINR(b.remainingTaxable)} is left. Invoicing the same work twice also pays GST on it twice.`,
      );
    }

    const gstRate = quote.taxMode === 'FLAT' ? quote.flatGstRate : quote.sections[0]?.items[0]?.gstRate ?? 18;
    const org = await getOrg();

    const parsed = invoiceSchema.parse({
      type: input.type,
      projectId: b.project.id,
      quotationId: quote.id,
      clientId: b.project.clientId,
      taxMode: quote.taxMode,
      flatGstRate: quote.flatGstRate,
      placeOfSupplyState: quote.placeOfSupplyState ?? b.project.client.state,
      placeOfSupplyCode: quote.placeOfSupplyCode ?? b.project.client.stateCode,
      discountType: 'NONE',
      discountValue: 0,
      poNumber: input.poNumber?.trim() || null,
      poDate: input.poDate || null,
      notes: invoiceSubject({
        poNumber: input.poNumber,
        poDate: input.poDate,
        quotationNumber: quote.number,
        title: quote.title,
      }),
      termsText: input.termsText ?? org.defaultInvoiceTerms ?? quote.termsText ?? null,
      items: [
        {
          description:
            input.label?.trim() ||
            (input.mode === 'REMAINING'
              ? `Balance against ${quote.number} — ${quote.title}`
              : `Progress claim against ${quote.number} — ${quote.title}`),
          specNote: b.invoicedTaxable > 0 ? `Contract ${formatINR(b.contractTaxable)}, already invoiced ${formatINR(b.invoicedTaxable)}` : quote.title,
          hsnSac: quote.sections[0]?.items[0]?.hsnSac ?? null,
          unit: 'Lump sum',
          quantity: 1,
          rate: base,
          discountPct: 0,
          gstRate,
        },
      ],
    });

    const totals = await totalsOf(parsed);
    const issueDate = new Date();
    const number = await nextNumber(input.type === 'PROFORMA' ? org.proformaPrefix : org.invoicePrefix, issueDate);

    const created = await prisma.invoice.create({
      data: {
        number,
        type: parsed.type,
        projectId: parsed.projectId ?? null,
        quotationId: parsed.quotationId ?? null,
        clientId: parsed.clientId,
        issueDate,
        dueDate: new Date(issueDate.getTime() + 15 * 86400000),
        poNumber: parsed.poNumber?.trim() || null,
        poDate: parseDate(parsed.poDate),
        taxMode: parsed.taxMode,
        flatGstRate: parsed.flatGstRate,
        placeOfSupplyState: parsed.placeOfSupplyState ?? null,
        placeOfSupplyCode: parsed.placeOfSupplyCode ?? null,
        discountType: parsed.discountType,
        discountValue: parsed.discountValue,
        notes: parsed.notes ?? null,
        termsText: parsed.termsText ?? null,
        status: 'DRAFT',
        ...totalsData(totals),
        items: {
          create: parsed.items.map((item, i) => ({
            ...item,
            specNote: item.specNote ?? null,
            hsnSac: item.hsnSac ?? null,
            order: i,
            amount: lineAmount(item),
          })),
        },
      },
      include: fullInclude,
    });

    res.status(201).json(created);
  }),
);

/**
 * Point an invoice at a different client.
 *
 * Needed when the client record was wrong or has been superseded — a contact
 * name that should not have been on the document, a corrected registered
 * address. Totals are recomputed because the place of supply travels with the
 * client, and a different state flips CGST + SGST to IGST.
 */
invoicesRouter.patch(
  '/:id/client',
  h(async (req, res) => {
    const { clientId } = z.object({ clientId: z.string().min(1) }).parse(req.body);

    const existing = await prisma.invoice.findUnique({
      where: { id: String(req.params.id) },
      include: { items: { orderBy: { order: 'asc' } } },
    });
    if (!existing) throw notFound('Invoice');

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw notFound('Client');

    const totals = await totalsOf({
      ...existing,
      clientId,
      // An override pinned to the old client would defeat the point.
      placeOfSupplyCode: client.stateCode ?? null,
      items: existing.items,
    } as never);

    res.json(
      await prisma.invoice.update({
        where: { id: existing.id },
        data: {
          clientId,
          placeOfSupplyState: client.state ?? null,
          placeOfSupplyCode: client.stateCode ?? null,
          ...totalsData(totals),
        },
        include: fullInclude,
      }),
    );
  }),
);

invoicesRouter.patch(
  '/:id/reference',
  h(async (req, res) => {
    const { poNumber, poDate, notes } = z
      .object({
        poNumber: z.string().nullish(),
        poDate: z.string().nullish(),
        notes: z.string().nullish(),
      })
      .parse(req.body);

    const id = String(req.params.id);
    const existing = await prisma.invoice.findUnique({
      where: { id },
      include: { quotation: { select: { number: true, title: true } } },
    });
    if (!existing) throw notFound('Invoice');

    // Only regenerate the subject if it still looks auto-generated, so a
    // hand-edited subject is never overwritten.
    const autoNow = invoiceSubject({
      poNumber: existing.poNumber,
      poDate: existing.poDate,
      quotationNumber: existing.quotation?.number ?? null,
      title: existing.quotation?.title ?? null,
    });
    const auto = invoiceSubject({
      poNumber,
      poDate,
      quotationNumber: existing.quotation?.number ?? null,
      title: existing.quotation?.title ?? null,
    });

    // Three distinct intents, and null must not be confused with absent:
    //   omitted -> follow the PO, unless the subject was hand-written
    //   null    -> explicitly reset to the automatic wording
    //   string  -> use exactly this
    const subject =
      notes === undefined
        ? !existing.notes || existing.notes === autoNow
          ? auto
          : existing.notes
        : notes === null
          ? auto
          : notes;

    res.json(
      await prisma.invoice.update({
        where: { id },
        data: {
          poNumber: poNumber?.trim() || null,
          poDate: parseDate(poDate),
          notes: subject || null,
        },
        include: fullInclude,
      }),
    );
  }),
);

invoicesRouter.patch(
  '/:id/status',
  h(async (req, res) => {
    const { status } = z
      .object({ status: z.enum(['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED']) })
      .parse(req.body);
    res.json(await prisma.invoice.update({ where: { id: String(req.params.id) }, data: { status }, include: fullInclude }));
  }),
);

invoicesRouter.delete(
  '/:id',
  h(async (req, res) => {
    const invoice = await prisma.invoice.findUnique({ where: { id: String(req.params.id) }, include: { payments: true } });
    if (!invoice) throw notFound('Invoice');
    if (invoice.payments.length) throw badRequest('Cancel this invoice instead — payments are recorded against it.');
    await prisma.invoice.delete({ where: { id: invoice.id } });
    res.status(204).end();
  }),
);

/* ------------------------------ payments -------------------------------- */

async function syncPaymentStatus(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: { payments: true } });
  if (!invoice) return;
  const paid = round2(invoice.payments.reduce((a, p) => a + p.amount, 0));
  const status =
    invoice.status === 'CANCELLED'
      ? 'CANCELLED'
      : paid <= 0
        ? invoice.status === 'DRAFT'
          ? 'DRAFT'
          : 'ISSUED'
        : paid + 0.5 >= invoice.grandTotal
          ? 'PAID'
          : 'PARTIALLY_PAID';
  await prisma.invoice.update({ where: { id: invoiceId }, data: { amountPaid: paid, status } });
}

invoicesRouter.post(
  '/:id/payments',
  h(async (req, res) => {
    const data = z
      .object({
        date: z.string().nullish(),
        amount: z.coerce.number().positive(),
        mode: z.enum(['BANK', 'UPI', 'CASH', 'CHEQUE', 'CARD', 'OTHER']).default('BANK'),
        reference: z.string().nullish(),
        notes: z.string().nullish(),
      })
      .parse(req.body);

    const invoice = await prisma.invoice.findUnique({ where: { id: String(req.params.id) } });
    if (!invoice) throw notFound('Invoice');

    await prisma.payment.create({
      data: { ...data, invoiceId: invoice.id, date: parseDate(data.date) ?? new Date() },
    });
    await syncPaymentStatus(invoice.id);
    res.status(201).json(await prisma.invoice.findUnique({ where: { id: invoice.id }, include: fullInclude }));
  }),
);

invoicesRouter.delete(
  '/payments/:paymentId',
  h(async (req, res) => {
    const payment = await prisma.payment.findUnique({ where: { id: String(req.params.paymentId) } });
    if (!payment) throw notFound('Payment');
    await prisma.payment.delete({ where: { id: payment.id } });
    await syncPaymentStatus(payment.invoiceId);
    res.status(204).end();
  }),
);

/* -------------------------------- print --------------------------------- */

async function invoiceDocument(id: string): Promise<DocumentModel> {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { client: true, items: { orderBy: { order: 'asc' } } },
  });
  if (!invoice) throw notFound('Invoice');
  const org = await getOrg();

  const totals = computeTotals({
    sections: [{ items: invoice.items }],
    taxMode: invoice.taxMode,
    flatGstRate: invoice.flatGstRate,
    discountType: invoice.discountType,
    discountValue: invoice.discountValue,
    supplierStateCode: org.stateCode,
    placeOfSupplyCode: invoice.placeOfSupplyCode || invoice.client.stateCode,
  });

  return {
    kind: invoice.type === 'PROFORMA' ? 'PROFORMA' : 'TAX_INVOICE',
    title: invoice.number,
    number: invoice.number,
    date: invoice.issueDate,
    secondaryDateLabel: 'Due date',
    secondaryDate: invoice.dueDate,
    subject: invoice.notes,
    reference: invoice.poNumber
      ? {
          label: 'Your PO',
          value: invoice.poDate
            ? `${invoice.poNumber} · ${new Date(invoice.poDate).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}`
            : invoice.poNumber,
        }
      : null,
    org,
    party: {
      ...invoice.client,
      stateCode: invoice.placeOfSupplyCode || invoice.client.stateCode,
      state: invoice.placeOfSupplyState || invoice.client.state,
    },
    sections: [{ name: 'Items', items: invoice.items }],
    totals,
    showHsn: true,
    showSectionTotals: false,
    notes: null,
    terms: invoice.termsText,
    amountPaid: invoice.amountPaid,
    statusStamp: invoice.status === 'CANCELLED' ? 'CANCELLED' : invoice.status === 'PAID' ? 'PAID' : null,
  };
}

invoicesRouter.get(
  '/:id/print',
  h(async (req, res) => {
    res.type('html').send(renderDocumentHtml(await invoiceDocument(String(req.params.id))));
  }),
);

invoicesRouter.get(
  '/:id/pdf',
  h(async (req, res) => {
    const model = await invoiceDocument(String(req.params.id));
    const pdf = await htmlToPdf(renderDocumentHtml(model));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${req.query.download === '1' ? 'attachment' : 'inline'}; filename="${model.number.replace(/[\\/]/g, '-')}.pdf"`,
    );
    res.send(pdf);
  }),
);
