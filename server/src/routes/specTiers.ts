import { Router } from 'express';
import { z } from 'zod';
import { HARDWARE_RATE_BY_CLASS } from '../data/spec-tiers.js';
import { prisma } from '../db.js';
import { h, parsePatch } from '../lib/http.js';

export const specTiersRouter = Router();

/** Every tier for a line of business, grouped by kind, in display order. */
specTiersRouter.get(
  '/',
  h(async (req, res) => {
    const businessTypeId = req.query.businessTypeId ? String(req.query.businessTypeId) : undefined;
    const tiers = await prisma.specTier.findMany({
      where: { active: true, ...(businessTypeId ? { businessTypeId } : {}) },
      orderBy: [{ kind: 'asc' }, { order: 'asc' }],
    });
    res.json({
      wood: tiers.filter((t) => t.kind === 'WOOD'),
      laminate: tiers.filter((t) => t.kind === 'LAMINATE'),
      hardware: tiers.filter((t) => t.kind === 'HARDWARE'),
      hardwareRates: HARDWARE_RATE_BY_CLASS,
    });
  }),
);

const tierSchema = z.object({
  name: z.string().min(1),
  brands: z.string().nullish(),
  specNote: z.string().nullish(),
  order: z.coerce.number().default(0),
  rateDelta: z.coerce.number().default(0),
  costDelta: z.coerce.number().default(0),
  rateDelta19: z.coerce.number().default(0),
  costDelta19: z.coerce.number().default(0),
  multiplier: z.coerce.number().min(0).default(1),
  active: z.boolean().default(true),
});

/** Rates move with the market, so every tier stays editable. */
specTiersRouter.put(
  '/:id',
  h(async (req, res) => {
    const data = parsePatch(tierSchema, req.body);
    res.json(await prisma.specTier.update({ where: { id: String(req.params.id) }, data }));
  }),
);
