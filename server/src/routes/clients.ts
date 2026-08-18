import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { badRequest, h, notFound, parsePatch } from '../lib/http.js';
import { STATE_BY_CODE, stateCodeFor } from '../lib/states.js';

export const clientsRouter = Router();

const clientSchema = z.object({
  name: z.string().min(2),
  kind: z.enum(['COMPANY', 'INDIVIDUAL']).default('COMPANY'),
  contactPerson: z.string().nullish(),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  altPhone: z.string().nullish(),
  gstin: z.string().nullish(),
  pan: z.string().nullish(),
  addressLine1: z.string().nullish(),
  addressLine2: z.string().nullish(),
  city: z.string().nullish(),
  state: z.string().nullish(),
  stateCode: z.string().nullish(),
  pincode: z.string().nullish(),
  notes: z.string().nullish(),
  archived: z.boolean().optional(),
});

/** Derive the state code from the state name, or from a GSTIN's first 2 digits. */
function normalise(data: z.infer<typeof clientSchema> | Partial<z.infer<typeof clientSchema>>) {
  const out = { ...data };
  const gstinPrefix = out.gstin?.trim().slice(0, 2);
  if (!out.stateCode && gstinPrefix && /^\d{2}$/.test(gstinPrefix)) out.stateCode = gstinPrefix;
  if (!out.stateCode && out.state) out.stateCode = stateCodeFor(out.state) ?? undefined;
  if (!out.state && out.stateCode) out.state = STATE_BY_CODE[out.stateCode] ?? undefined;
  return out;
}

clientsRouter.get(
  '/',
  h(async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    const includeArchived = req.query.archived === '1';
    const clients = await prisma.client.findMany({
      where: {
        ...(includeArchived ? {} : { archived: false }),
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { contactPerson: { contains: q } },
                { email: { contains: q } },
                { phone: { contains: q } },
                { gstin: { contains: q } },
                { city: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      include: { _count: { select: { quotations: true, projects: true, invoices: true } } },
    });
    res.json(clients);
  }),
);

clientsRouter.get(
  '/:id',
  h(async (req, res) => {
    const client = await prisma.client.findUnique({
      where: { id: String(req.params.id) },
      include: {
        quotations: { orderBy: { createdAt: 'desc' }, include: { businessType: true } },
        projects: { orderBy: { createdAt: 'desc' }, include: { businessType: true, stage: true } },
        invoices: { orderBy: { issueDate: 'desc' } },
      },
    });
    if (!client) throw notFound('Client');
    res.json(client);
  }),
);

clientsRouter.post(
  '/',
  h(async (req, res) => {
    const data = normalise(clientSchema.parse(req.body));
    res.status(201).json(await prisma.client.create({ data: data as any }));
  }),
);

clientsRouter.put(
  '/:id',
  h(async (req, res) => {
    const data = normalise(parsePatch(clientSchema, req.body));
    res.json(await prisma.client.update({ where: { id: String(req.params.id) }, data: data as any }));
  }),
);

clientsRouter.delete(
  '/:id',
  h(async (req, res) => {
    const counts = await prisma.client.findUnique({
      where: { id: String(req.params.id) },
      include: { _count: { select: { quotations: true, projects: true, invoices: true } } },
    });
    if (!counts) throw notFound('Client');
    const { quotations, projects, invoices } = counts._count;
    if (quotations || projects || invoices) {
      throw badRequest('This client has documents linked to it. Archive the client instead of deleting.');
    }
    await prisma.client.delete({ where: { id: String(req.params.id) } });
    res.status(204).end();
  }),
);
