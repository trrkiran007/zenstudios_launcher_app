import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { z } from 'zod';
import { anthropicKeySource, BRANDING_DIR, setAnthropicKey } from '../config.js';
import { prisma } from '../db.js';
import { h, parsePatch } from '../lib/http.js';
import { isPdfEngineAvailable } from '../lib/pdf.js';
import { uploadLogo } from '../lib/upload.js';

export const settingsRouter = Router();

const orgSchema = z.object({
  brandName: z.string().min(1),
  legalName: z.string().min(1),
  trademarkLine: z.string().nullish(),
  cin: z.string().nullish(),
  pan: z.string().nullish(),
  tan: z.string().nullish(),
  gstin: z.string().nullish(),
  addressLine1: z.string().nullish(),
  addressLine2: z.string().nullish(),
  city: z.string().nullish(),
  state: z.string().nullish(),
  stateCode: z.string().nullish(),
  pincode: z.string().nullish(),
  country: z.string().optional(),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  altPhone: z.string().nullish(),
  website: z.string().nullish(),
  brandColor: z.string().optional(),
  accentColor: z.string().optional(),
  bankName: z.string().nullish(),
  bankAccountName: z.string().nullish(),
  bankAccountNo: z.string().nullish(),
  bankIfsc: z.string().nullish(),
  bankBranch: z.string().nullish(),
  upiId: z.string().nullish(),
  defaultTerms: z.string().nullish(),
  defaultInvoiceTerms: z.string().nullish(),
  defaultValidityDays: z.coerce.number().int().min(0).max(365).optional(),
  invoicePrefix: z.string().optional(),
  proformaPrefix: z.string().optional(),
});

export async function getOrg() {
  const existing = await prisma.organization.findUnique({ where: { id: 'org' } });
  if (existing) return existing;
  return prisma.organization.create({ data: { id: 'org' } });
}

settingsRouter.get(
  '/organization',
  h(async (_req, res) => {
    const org = await getOrg();
    res.json(org);
  }),
);

settingsRouter.put(
  '/organization',
  h(async (req, res) => {
    const data = parsePatch(orgSchema, req.body);
    await getOrg();
    const org = await prisma.organization.update({ where: { id: 'org' }, data });
    res.json(org);
  }),
);

settingsRouter.post(
  '/organization/logo',
  uploadLogo.single('file'),
  h(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const org = await getOrg();
    if (org.logoPath) {
      const old = path.join(BRANDING_DIR, path.basename(org.logoPath));
      if (fs.existsSync(old)) fs.rmSync(old, { force: true });
    }
    const updated = await prisma.organization.update({
      where: { id: 'org' },
      data: { logoPath: req.file.filename },
    });
    res.json(updated);
  }),
);

settingsRouter.get(
  '/organization/logo-file',
  h(async (_req, res) => {
    const org = await getOrg();
    if (!org.logoPath) return res.status(404).json({ error: 'No logo uploaded' });
    const file = path.join(BRANDING_DIR, path.basename(org.logoPath));
    if (!fs.existsSync(file)) return res.status(404).json({ error: 'Logo file missing' });
    const ext = path.extname(file).toLowerCase();
    res.setHeader(
      'Content-Type',
      ext === '.svg' ? 'image/svg+xml' : ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg',
    );
    res.setHeader('Cache-Control', 'public, max-age=300');
    fs.createReadStream(file).pipe(res);
  }),
);

settingsRouter.delete(
  '/organization/logo',
  h(async (_req, res) => {
    const org = await getOrg();
    if (org.logoPath) {
      const file = path.join(BRANDING_DIR, path.basename(org.logoPath));
      if (fs.existsSync(file)) fs.rmSync(file, { force: true });
    }
    res.json(await prisma.organization.update({ where: { id: 'org' }, data: { logoPath: null } }));
  }),
);

settingsRouter.get(
  '/system',
  h(async (_req, res) => {
    res.json({
      aiKeySource: anthropicKeySource(),
      aiEnabled: anthropicKeySource() !== 'none',
      pdfEngine: await isPdfEngineAvailable(),
    });
  }),
);

settingsRouter.put(
  '/system/ai-key',
  h(async (req, res) => {
    const { key } = z.object({ key: z.string().nullable() }).parse(req.body);
    setAnthropicKey(key);
    res.json({ aiKeySource: anthropicKeySource(), aiEnabled: anthropicKeySource() !== 'none' });
  }),
);
