import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { badRequest, h, notFound, parsePatch } from '../lib/http.js';

export const businessTypesRouter = Router();

const btSchema = z.object({
  key: z.string().min(2).regex(/^[A-Z0-9_]+$/, 'Use uppercase letters, numbers and underscores'),
  name: z.string().min(2),
  shortCode: z.string().min(1).max(6).regex(/^[A-Z0-9]+$/, 'Uppercase letters and numbers only'),
  layout: z.enum(['SECTIONED', 'FLAT']),
  sectionLabel: z.string().min(1).default('Section'),
  description: z.string().nullish(),
  color: z.string().default('#16A34A'),
  active: z.boolean().default(true),
  order: z.coerce.number().int().default(0),
  enableBenchmark: z.boolean().default(false),
  defaultTerms: z.string().nullish(),
});

const DEFAULT_STAGES = ['Kick-off', 'In Progress', 'Delivered', 'Closed'];

businessTypesRouter.get(
  '/',
  h(async (req, res) => {
    const includeInactive = req.query.all === '1';
    const types = await prisma.businessType.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: {
        stages: { orderBy: { order: 'asc' } },
        _count: { select: { quotations: true, projects: true, catalogItems: true } },
      },
    });
    res.json(types);
  }),
);

businessTypesRouter.post(
  '/',
  h(async (req, res) => {
    const data = btSchema.parse(req.body);
    const created = await prisma.businessType.create({
      data: {
        ...data,
        stages: {
          create: DEFAULT_STAGES.map((name, i) => ({
            name,
            order: i,
            isTerminal: i === DEFAULT_STAGES.length - 1,
            isWon: i === DEFAULT_STAGES.length - 1,
          })),
        },
      },
      include: { stages: { orderBy: { order: 'asc' } } },
    });
    res.status(201).json(created);
  }),
);

businessTypesRouter.put(
  '/:id',
  h(async (req, res) => {
    const data = parsePatch(btSchema, req.body);
    const updated = await prisma.businessType.update({
      where: { id: String(req.params.id) },
      data,
      include: { stages: { orderBy: { order: 'asc' } } },
    });
    res.json(updated);
  }),
);

businessTypesRouter.delete(
  '/:id',
  h(async (req, res) => {
    const counts = await prisma.businessType.findUnique({
      where: { id: String(req.params.id) },
      include: { _count: { select: { quotations: true, projects: true } } },
    });
    if (!counts) throw notFound('Business type');
    if (counts._count.quotations || counts._count.projects) {
      throw badRequest('This business type has quotations or projects. Deactivate it instead of deleting.');
    }
    await prisma.businessType.delete({ where: { id: String(req.params.id) } });
    res.status(204).end();
  }),
);

/** Replace the whole stage list for a business type in one call. */
businessTypesRouter.put(
  '/:id/stages',
  h(async (req, res) => {
    const stages = z
      .array(
        z.object({
          id: z.string().optional(),
          name: z.string().min(1),
          color: z.string().default('#64748B'),
          isTerminal: z.boolean().default(false),
          isWon: z.boolean().default(false),
        }),
      )
      .min(1)
      .parse(req.body.stages);

    const businessTypeId = String(req.params.id);
    const existing = await prisma.pipelineStage.findMany({ where: { businessTypeId } });
    const keptIds = new Set(stages.map((s) => s.id).filter(Boolean) as string[]);
    const removed = existing.filter((s) => !keptIds.has(s.id));

    if (removed.length) {
      const inUse = await prisma.project.count({ where: { stageId: { in: removed.map((s) => s.id) } } });
      if (inUse) throw badRequest('Cannot remove a stage that projects are currently sitting in.');
    }

    await prisma.$transaction([
      ...(removed.length
        ? [prisma.pipelineStage.deleteMany({ where: { id: { in: removed.map((s) => s.id) } } })]
        : []),
      ...stages.map((s, i) =>
        s.id
          ? prisma.pipelineStage.update({
              where: { id: s.id },
              data: { name: s.name, order: i, color: s.color, isTerminal: s.isTerminal, isWon: s.isWon },
            })
          : prisma.pipelineStage.create({
              data: {
                businessTypeId,
                name: s.name,
                order: i,
                color: s.color,
                isTerminal: s.isTerminal,
                isWon: s.isWon,
              },
            }),
      ),
    ]);

    res.json(await prisma.pipelineStage.findMany({ where: { businessTypeId }, orderBy: { order: 'asc' } }));
  }),
);
