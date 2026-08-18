import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { h, parseDate, parsePatch } from '../lib/http.js';

export const expensesRouter = Router();

export const EXPENSE_CATEGORIES = [
  'Material',
  'Labour',
  'Vendor / Subcontractor',
  'Logistics',
  'Site',
  'Design & Drafting',
  'Marketing',
  'Travel',
  'Software & Tools',
  'Professional Fees',
  'Other',
];

const expenseSchema = z.object({
  projectId: z.string().min(1),
  date: z.string().nullish(),
  category: z.string().default('Material'),
  vendor: z.string().nullish(),
  description: z.string().nullish(),
  amount: z.coerce.number().min(0).default(0),
  gstAmount: z.coerce.number().min(0).default(0),
  billable: z.boolean().default(false),
  paymentStatus: z.enum(['PAID', 'UNPAID', 'PARTIAL']).default('PAID'),
  reference: z.string().nullish(),
});

expensesRouter.get('/categories', (_req, res) => res.json(EXPENSE_CATEGORIES));

expensesRouter.get(
  '/',
  h(async (req, res) => {
    const { projectId, category, from, to } = req.query as Record<string, string | undefined>;
    const fromDate = parseDate(from);
    const toDate = parseDate(to);
    res.json(
      await prisma.expense.findMany({
        where: {
          ...(projectId ? { projectId } : {}),
          ...(category ? { category } : {}),
          ...(fromDate || toDate
            ? { date: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } }
            : {}),
        },
        orderBy: { date: 'desc' },
        include: {
          attachments: true,
          project: { select: { id: true, code: true, name: true, businessType: { select: { name: true, color: true } } } },
        },
      }),
    );
  }),
);

expensesRouter.post(
  '/',
  h(async (req, res) => {
    const data = expenseSchema.parse(req.body);
    res.status(201).json(
      await prisma.expense.create({
        data: { ...data, date: parseDate(data.date) ?? new Date() },
        include: { attachments: true },
      }),
    );
  }),
);

expensesRouter.put(
  '/:id',
  h(async (req, res) => {
    const data = parsePatch(expenseSchema, req.body);
    res.json(
      await prisma.expense.update({
        where: { id: String(req.params.id) },
        data: { ...data, date: 'date' in data ? parseDate(data.date) ?? undefined : undefined },
        include: { attachments: true },
      }),
    );
  }),
);

expensesRouter.delete(
  '/:id',
  h(async (req, res) => {
    await prisma.expense.delete({ where: { id: String(req.params.id) } });
    res.status(204).end();
  }),
);
