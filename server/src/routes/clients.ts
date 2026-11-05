import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { badRequest, h, notFound, parsePatch } from '../lib/http.js';
import { countryProfile } from '../data/countries.js';
import { getOrg } from './settings.js';

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
  /*
   * Blank means the same country as the business, which is the common case.
   *
   * A form that has never had the field touched sends an empty string, not an
   * absent key, and "" is not a two-letter country — so the whole save was
   * rejected with "Validation failed" and no client could be created at all.
   * Empty is normalised to null here, at the boundary, rather than being left
   * for every caller to remember.
   */
  countryCode: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().length(2).toUpperCase().nullish(),
  ),
  notes: z.string().nullish(),
  archived: z.boolean().optional(),
});

/**
 * Fill in whichever of the region name and code is missing.
 *
 * Both tables used to be India's whatever the client's country, so a US or NZ
 * address could never have its region completed — and a GSTIN prefix was read
 * off a client that has no GSTIN. The lookup now uses the client's own
 * country, falling back to the organisation's.
 */
async function normalise(data: z.infer<typeof clientSchema> | Partial<z.infer<typeof clientSchema>>) {
  const out = { ...data };
  const home = (await getOrg()).countryCode;
  const profile = countryProfile(out.countryCode || home);

  // A GSTIN's first two digits are its state code — Indian GST only.
  if (profile.taxSystem === 'INDIA_GST') {
    const gstinPrefix = out.gstin?.trim().slice(0, 2);
    if (!out.stateCode && gstinPrefix && /^\d{2}$/.test(gstinPrefix)) out.stateCode = gstinPrefix;
  }

  const byName = (name: string) =>
    profile.regions.find((r) => r.name.toLowerCase() === name.trim().toLowerCase())?.code;
  const byCode = (code: string) =>
    profile.regions.find((r) => r.code.toLowerCase() === code.trim().toLowerCase())?.name;

  if (!out.stateCode && out.state) out.stateCode = byName(out.state) ?? undefined;
  if (!out.state && out.stateCode) out.state = byCode(out.stateCode) ?? undefined;
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
    const data = await normalise(clientSchema.parse(req.body));
    res.status(201).json(await prisma.client.create({ data: data as any }));
  }),
);

clientsRouter.put(
  '/:id',
  h(async (req, res) => {
    const data = await normalise(parsePatch(clientSchema, req.body));
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
