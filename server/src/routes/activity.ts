import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { z } from 'zod';
import { UPLOAD_DIR } from '../config.js';
import { prisma } from '../db.js';
import { badRequest, h, notFound } from '../lib/http.js';
import { upload } from '../lib/upload.js';

export const notesRouter = Router();
export const attachmentsRouter = Router();

const ownerFields = ['quotationId', 'projectId', 'taskId', 'noteId', 'expenseId', 'competitorQuoteId'] as const;

const noteSchema = z.object({
  body: z.string().min(1),
  author: z.string().default('Me'),
  kind: z.enum(['NOTE', 'STAGE_CHANGE', 'SYSTEM']).default('NOTE'),
  quotationId: z.string().nullish(),
  projectId: z.string().nullish(),
  taskId: z.string().nullish(),
});

notesRouter.get(
  '/',
  h(async (req, res) => {
    const { quotationId, projectId, taskId } = req.query as Record<string, string | undefined>;
    if (!quotationId && !projectId && !taskId) throw badRequest('Pass quotationId, projectId or taskId');
    res.json(
      await prisma.note.findMany({
        where: { ...(quotationId ? { quotationId } : {}), ...(projectId ? { projectId } : {}), ...(taskId ? { taskId } : {}) },
        orderBy: { createdAt: 'desc' },
        include: { attachments: true },
      }),
    );
  }),
);

notesRouter.post(
  '/',
  h(async (req, res) => {
    const data = noteSchema.parse(req.body);
    res.status(201).json(await prisma.note.create({ data: data as any, include: { attachments: true } }));
  }),
);

notesRouter.delete(
  '/:id',
  h(async (req, res) => {
    const attachments = await prisma.attachment.findMany({ where: { noteId: String(req.params.id) } });
    await prisma.note.delete({ where: { id: String(req.params.id) } });
    for (const a of attachments) fs.rmSync(path.join(UPLOAD_DIR, a.filename), { force: true });
    res.status(204).end();
  }),
);

/* ---------------------------- attachments ------------------------------- */

attachmentsRouter.get(
  '/',
  h(async (req, res) => {
    const where: Record<string, string> = {};
    for (const f of ownerFields) {
      const v = req.query[f];
      if (typeof v === 'string' && v) where[f] = v;
    }
    if (!Object.keys(where).length) throw badRequest('Pass one owner id, e.g. ?projectId=…');
    res.json(await prisma.attachment.findMany({ where, orderBy: { createdAt: 'desc' } }));
  }),
);

attachmentsRouter.post(
  '/',
  upload.array('files', 20),
  h(async (req, res) => {
    const files = (req.files as Express.Multer.File[]) ?? [];
    if (!files.length) throw badRequest('No files uploaded');

    const owner: Record<string, string> = {};
    for (const f of ownerFields) {
      const v = req.body[f];
      if (typeof v === 'string' && v) owner[f] = v;
    }
    if (!Object.keys(owner).length) {
      files.forEach((f) => fs.rmSync(f.path, { force: true }));
      throw badRequest('Attachments must belong to a quotation, project, task, note, expense or benchmark upload.');
    }

    const created = await prisma.$transaction(
      files.map((file) =>
        prisma.attachment.create({
          data: {
            ...owner,
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            caption: typeof req.body.caption === 'string' ? req.body.caption : null,
          },
        }),
      ),
    );
    res.status(201).json(created);
  }),
);

attachmentsRouter.get(
  '/:id/file',
  h(async (req, res) => {
    const a = await prisma.attachment.findUnique({ where: { id: String(req.params.id) } });
    if (!a) throw notFound('Attachment');
    const file = path.join(UPLOAD_DIR, path.basename(a.filename));
    if (!fs.existsSync(file)) throw notFound('File on disk');
    res.setHeader('Content-Type', a.mimeType);
    res.setHeader(
      'Content-Disposition',
      `${req.query.download === '1' ? 'attachment' : 'inline'}; filename="${a.originalName.replace(/"/g, '')}"`,
    );
    fs.createReadStream(file).pipe(res);
  }),
);

attachmentsRouter.patch(
  '/:id',
  h(async (req, res) => {
    const { caption } = z.object({ caption: z.string().nullish() }).parse(req.body);
    res.json(await prisma.attachment.update({ where: { id: String(req.params.id) }, data: { caption: caption ?? null } }));
  }),
);

attachmentsRouter.delete(
  '/:id',
  h(async (req, res) => {
    const a = await prisma.attachment.findUnique({ where: { id: String(req.params.id) } });
    if (!a) throw notFound('Attachment');
    await prisma.attachment.delete({ where: { id: a.id } });
    fs.rmSync(path.join(UPLOAD_DIR, path.basename(a.filename)), { force: true });
    res.status(204).end();
  }),
);
