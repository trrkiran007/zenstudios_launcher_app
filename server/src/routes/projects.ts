import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { badRequest, h, notFound, parseDate, parsePatch } from '../lib/http.js';
import { round2 } from '../lib/money.js';

export const projectsRouter = Router();

const projectInclude = {
  businessType: true,
  client: true,
  stage: true,
  quotation: { select: { id: true, number: true, title: true, grandTotal: true, taxableValue: true } },
};

projectsRouter.get(
  '/',
  h(async (req, res) => {
    const { businessTypeId, stageId, status, clientId, q } = req.query as Record<string, string | undefined>;
    const projects = await prisma.project.findMany({
      where: {
        ...(businessTypeId ? { businessTypeId } : {}),
        ...(stageId ? { stageId } : {}),
        ...(status ? { status } : {}),
        ...(clientId ? { clientId } : {}),
        ...(q ? { OR: [{ name: { contains: q } }, { code: { contains: q } }, { client: { name: { contains: q } } }] } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        ...projectInclude,
        _count: { select: { tasks: true, expenses: true, attachments: true, invoices: true } },
        tasks: { where: { status: { not: 'DONE' } }, select: { id: true } },
      },
    });
    res.json(
      projects.map(({ tasks, ...p }) => ({ ...p, openTaskCount: tasks.length })),
    );
  }),
);

/** Everything the project detail screen needs, in one round trip. */
projectsRouter.get(
  '/:id',
  h(async (req, res) => {
    const project = await prisma.project.findUnique({
      where: { id: String(req.params.id) },
      include: {
        ...projectInclude,
        tasks: { orderBy: [{ status: 'asc' }, { order: 'asc' }], include: { attachments: true } },
        expenses: { orderBy: { date: 'desc' }, include: { attachments: true } },
        invoices: { orderBy: { issueDate: 'desc' }, include: { payments: true } },
        notesLog: { orderBy: { createdAt: 'desc' }, include: { attachments: true } },
        attachments: { orderBy: { createdAt: 'desc' } },
        stageEvents: { orderBy: { changedAt: 'desc' } },
      },
    });
    if (!project) throw notFound('Project');

    const stages = await prisma.pipelineStage.findMany({
      where: { businessTypeId: project.businessTypeId },
      orderBy: { order: 'asc' },
    });

    const expenseTotal = round2(project.expenses.reduce((a, e) => a + e.amount, 0));
    const invoicedTotal = round2(
      project.invoices.filter((i) => i.status !== 'CANCELLED' && i.type === 'TAX').reduce((a, i) => a + i.grandTotal, 0),
    );
    const receivedTotal = round2(
      project.invoices.flatMap((i) => i.payments).reduce((a, p) => a + p.amount, 0),
    );
    const revenue = project.quotation?.taxableValue ?? project.contractValue;

    // Budget and actuals are tracked separately on purpose. The quotation's
    // item costs are the budget; booked expenses are what was really spent.
    // Adding them together would count the same material twice.
    const budgetedCost = project.estimatedCost;
    const actualCost = expenseTotal;
    const margin = (cost: number) => (revenue > 0 ? round2(((revenue - cost) / revenue) * 100) : 0);

    res.json({
      ...project,
      stages,
      finance: {
        contractValue: project.contractValue,
        revenue,
        budgetedCost,
        actualCost,
        costVariance: round2(budgetedCost - actualCost),
        budgetedProfit: round2(revenue - budgetedCost),
        budgetedMarginPct: margin(budgetedCost),
        actualProfit: round2(revenue - actualCost),
        actualMarginPct: margin(actualCost),
        spendAgainstBudgetPct: budgetedCost > 0 ? round2((actualCost / budgetedCost) * 100) : 0,
        invoicedTotal,
        receivedTotal,
        outstanding: round2(invoicedTotal - receivedTotal),
      },
    });
  }),
);

const projectSchema = z.object({
  name: z.string().min(1),
  clientId: z.string().min(1),
  businessTypeId: z.string().min(1),
  stageId: z.string().min(1),
  status: z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).default('ACTIVE'),
  contractValue: z.coerce.number().default(0),
  estimatedCost: z.coerce.number().default(0),
  description: z.string().nullish(),
  startDate: z.string().nullish(),
  targetDate: z.string().nullish(),
});

projectsRouter.put(
  '/:id',
  h(async (req, res) => {
    const data = parsePatch(projectSchema, req.body);
    const updated = await prisma.project.update({
      where: { id: String(req.params.id) },
      data: {
        ...data,
        startDate: 'startDate' in data ? parseDate(data.startDate) : undefined,
        targetDate: 'targetDate' in data ? parseDate(data.targetDate) : undefined,
        closedAt: data.status === 'COMPLETED' || data.status === 'CANCELLED' ? new Date() : undefined,
      },
      include: projectInclude,
    });
    res.json(updated);
  }),
);

projectsRouter.patch(
  '/:id/stage',
  h(async (req, res) => {
    const { stageId, note } = z.object({ stageId: z.string().min(1), note: z.string().nullish() }).parse(req.body);
    const project = await prisma.project.findUnique({ where: { id: String(req.params.id) }, include: { stage: true } });
    if (!project) throw notFound('Project');

    const stage = await prisma.pipelineStage.findUnique({ where: { id: stageId } });
    if (!stage || stage.businessTypeId !== project.businessTypeId) {
      throw badRequest('That stage does not belong to this business type.');
    }

    const [updated, , stageNote] = await prisma.$transaction([
      prisma.project.update({
        where: { id: project.id },
        data: {
          stageId,
          ...(stage.isTerminal ? { status: stage.isWon ? 'COMPLETED' : project.status, closedAt: new Date() } : {}),
        },
        include: projectInclude,
      }),
      prisma.stageEvent.create({
        data: { projectId: project.id, fromStage: project.stage.name, toStage: stage.name, note: note ?? null },
      }),
      prisma.note.create({
        data: {
          projectId: project.id,
          kind: 'STAGE_CHANGE',
          body: `Moved ${project.stage.name} → ${stage.name}${note ? `. ${note}` : ''}`,
        },
      }),
    ]);

    // The note id goes back so the caller can hang the paperwork for this move —
    // a purchase order, a signed approval, a delivery challan — off it.
    res.json({ ...updated, stageNoteId: stageNote.id });
  }),
);

projectsRouter.delete(
  '/:id',
  h(async (req, res) => {
    const invoices = await prisma.invoice.count({ where: { projectId: String(req.params.id) } });
    if (invoices) throw badRequest('Delete the invoices on this project first.');
    await prisma.project.delete({ where: { id: String(req.params.id) } });
    res.status(204).end();
  }),
);

/* ------------------------------- tasks ---------------------------------- */

const taskSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullish(),
  assignee: z.string().nullish(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE']).default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  dueDate: z.string().nullish(),
  order: z.coerce.number().int().default(0),
});

export const tasksRouter = Router();

tasksRouter.get(
  '/',
  h(async (req, res) => {
    const { projectId, status, assignee } = req.query as Record<string, string | undefined>;
    const tasks = await prisma.task.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        ...(status ? { status } : {}),
        ...(assignee ? { assignee } : {}),
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { order: 'asc' }],
      include: {
        attachments: true,
        project: { select: { id: true, code: true, name: true, businessTypeId: true, businessType: { select: { name: true, color: true } } } },
      },
    });
    res.json(tasks);
  }),
);

tasksRouter.post(
  '/',
  h(async (req, res) => {
    const data = taskSchema.parse(req.body);
    res.status(201).json(
      await prisma.task.create({
        data: { ...data, dueDate: parseDate(data.dueDate) },
        include: { attachments: true },
      }),
    );
  }),
);

tasksRouter.put(
  '/:id',
  h(async (req, res) => {
    const data = parsePatch(taskSchema, req.body);
    res.json(
      await prisma.task.update({
        where: { id: String(req.params.id) },
        data: {
          ...data,
          dueDate: 'dueDate' in data ? parseDate(data.dueDate) : undefined,
          completedAt: data.status ? (data.status === 'DONE' ? new Date() : null) : undefined,
        },
        include: { attachments: true },
      }),
    );
  }),
);

tasksRouter.delete(
  '/:id',
  h(async (req, res) => {
    await prisma.task.delete({ where: { id: String(req.params.id) } });
    res.status(204).end();
  }),
);
