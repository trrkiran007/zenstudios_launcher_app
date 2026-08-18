import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { z } from 'zod';
import { anthropicKeySource, UPLOAD_DIR } from '../config.js';
import { prisma } from '../db.js';
import { badRequest, h, notFound, parseDate, parsePatch } from '../lib/http.js';
import { round2 } from '../lib/money.js';
import { upload } from '../lib/upload.js';
import { AiNotConfiguredError, analyseCompetitorQuote } from '../services/ai.js';
import { extractPdfText } from '../services/pdfText.js';

export const benchmarkRouter = Router();

/*
 * Competitor intelligence is deliberately a read-only knowledge base:
 * nothing here writes to CatalogItem, Quotation or any pricing surface, and
 * there is no endpoint to copy a competitor line into your own quote.
 */

const metaSchema = z.object({
  competitorName: z.string().min(1),
  city: z.string().nullish(),
  clientSegment: z.enum(['Budget', 'Mid', 'Premium', 'Luxury']).nullish(),
  projectType: z.string().nullish(),
  carpetArea: z.coerce.number().min(0).nullish(),
  sourceNote: z.string().nullish(),
  quoteDate: z.string().nullish(),
});

benchmarkRouter.get(
  '/',
  h(async (req, res) => {
    const { q, competitorName, clientSegment } = req.query as Record<string, string | undefined>;
    res.json(
      await prisma.competitorQuote.findMany({
        where: {
          ...(competitorName ? { competitorName } : {}),
          ...(clientSegment ? { clientSegment } : {}),
          ...(q
            ? {
                OR: [
                  { competitorName: { contains: q } },
                  { projectType: { contains: q } },
                  { city: { contains: q } },
                  { summary: { contains: q } },
                  { extractedText: { contains: q } },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, competitorName: true, city: true, clientSegment: true, projectType: true,
          carpetArea: true, quoteDate: true, status: true, totalValue: true, summary: true,
          originalName: true, pageCount: true, error: true, createdAt: true, updatedAt: true,
          _count: { select: { items: true } },
        },
      }),
    );
  }),
);

benchmarkRouter.get(
  '/:id',
  h(async (req, res) => {
    const row = await prisma.competitorQuote.findUnique({
      where: { id: String(req.params.id) },
      include: { items: true, attachments: true },
    });
    if (!row) throw notFound('Benchmark upload');
    res.json({ ...row, analysis: row.analysisJson ? JSON.parse(row.analysisJson) : null });
  }),
);

benchmarkRouter.get(
  '/:id/file',
  h(async (req, res) => {
    const row = await prisma.competitorQuote.findUnique({ where: { id: String(req.params.id) } });
    if (!row?.filename) throw notFound('File');
    const file = path.join(UPLOAD_DIR, path.basename(row.filename));
    if (!fs.existsSync(file)) throw notFound('File on disk');
    res.setHeader('Content-Type', row.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${(row.originalName ?? 'quote').replace(/"/g, '')}"`);
    fs.createReadStream(file).pipe(res);
  }),
);

benchmarkRouter.post(
  '/',
  upload.single('file'),
  h(async (req, res) => {
    if (!req.file) throw badRequest('Upload the competitor quotation as a PDF or image.');
    const meta = metaSchema.parse(req.body);

    const buffer = fs.readFileSync(req.file.path);
    const extracted =
      req.file.mimetype === 'application/pdf' ? await extractPdfText(buffer) : null;

    const created = await prisma.competitorQuote.create({
      data: {
        competitorName: meta.competitorName,
        city: meta.city ?? null,
        clientSegment: meta.clientSegment ?? null,
        projectType: meta.projectType ?? null,
        carpetArea: meta.carpetArea ?? null,
        sourceNote: meta.sourceNote ?? null,
        quoteDate: parseDate(meta.quoteDate),
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        pageCount: extracted?.pageCount ?? null,
        extractedText: extracted?.text ?? null,
        status: extracted?.text ? 'EXTRACTED' : 'UPLOADED',
      },
    });

    res.status(201).json(created);
  }),
);

benchmarkRouter.put(
  '/:id',
  h(async (req, res) => {
    const meta = parsePatch(metaSchema, req.body);
    res.json(
      await prisma.competitorQuote.update({
        where: { id: String(req.params.id) },
        data: { ...meta, quoteDate: 'quoteDate' in meta ? parseDate(meta.quoteDate) : undefined } as any,
      }),
    );
  }),
);

/** Run (or re-run) the AI pass over an uploaded document. */
benchmarkRouter.post(
  '/:id/analyse',
  h(async (req, res) => {
    const row = await prisma.competitorQuote.findUnique({ where: { id: String(req.params.id) } });
    if (!row) throw notFound('Benchmark upload');
    if (!row.filename) throw badRequest('This entry has no file attached.');

    const file = path.join(UPLOAD_DIR, path.basename(row.filename));
    if (!fs.existsSync(file)) throw badRequest('The uploaded file is missing from disk.');

    try {
      const analysis = await analyseCompetitorQuote({
        mimeType: row.mimeType ?? 'application/pdf',
        base64: fs.readFileSync(file).toString('base64'),
        extractedText: row.extractedText,
        context: {
          competitorName: row.competitorName,
          city: row.city,
          clientSegment: row.clientSegment,
          projectType: row.projectType,
          sourceNote: row.sourceNote,
        },
      });

      await prisma.$transaction([
        prisma.competitorLineItem.deleteMany({ where: { competitorQuoteId: row.id } }),
        prisma.competitorQuote.update({
          where: { id: row.id },
          data: {
            status: 'ANALYZED',
            error: null,
            summary: analysis.summary,
            critique: analysis.critique,
            analysisJson: JSON.stringify(analysis),
            totalValue: analysis.totalValue ?? row.totalValue,
            projectType: row.projectType ?? analysis.projectType,
            carpetArea: row.carpetArea ?? analysis.carpetAreaSqft,
            items: {
              create: analysis.items.map((it) => ({
                room: it.room,
                category: it.category,
                description: it.description,
                unit: it.unit,
                quantity: it.quantity,
                rate: it.rate,
                amount: it.amount,
                notes: it.notes,
              })),
            },
          },
        }),
      ]);

      const updated = await prisma.competitorQuote.findUnique({
        where: { id: row.id },
        include: { items: true },
      });
      res.json({ ...updated, analysis });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      await prisma.competitorQuote.update({
        where: { id: row.id },
        data: { status: 'FAILED', error: message },
      });
      if (err instanceof AiNotConfiguredError) throw badRequest(message);
      throw err;
    }
  }),
);

benchmarkRouter.delete(
  '/:id',
  h(async (req, res) => {
    const row = await prisma.competitorQuote.findUnique({ where: { id: String(req.params.id) } });
    if (!row) throw notFound('Benchmark upload');
    await prisma.competitorQuote.delete({ where: { id: row.id } });
    if (row.filename) fs.rmSync(path.join(UPLOAD_DIR, path.basename(row.filename)), { force: true });
    res.status(204).end();
  }),
);

/**
 * Aggregate view across analysed competitor quotes. Read-only market context:
 * these figures are never surfaced inside the quotation editor.
 */
benchmarkRouter.get(
  '/insights/summary',
  h(async (_req, res) => {
    const quotes = await prisma.competitorQuote.findMany({
      where: { status: 'ANALYZED' },
      include: { items: true },
    });

    const byCompetitor = Object.values(
      quotes.reduce<Record<string, { competitor: string; uploads: number; avgValue: number; total: number }>>(
        (acc, q) => {
          acc[q.competitorName] ??= { competitor: q.competitorName, uploads: 0, avgValue: 0, total: 0 };
          acc[q.competitorName].uploads += 1;
          acc[q.competitorName].total = round2(acc[q.competitorName].total + (q.totalValue ?? 0));
          return acc;
        },
        {},
      ),
    ).map((c) => ({ ...c, avgValue: c.uploads ? round2(c.total / c.uploads) : 0 }));

    const items = quotes.flatMap((q) => q.items);
    const byUnit = Object.values(
      items.reduce<Record<string, { unit: string; count: number; rates: number[] }>>((acc, it) => {
        const unit = it.unit || 'Unspecified';
        acc[unit] ??= { unit, count: 0, rates: [] };
        acc[unit].count += 1;
        if (it.rate) acc[unit].rates.push(it.rate);
        return acc;
      }, {}),
    ).map(({ unit, count, rates }) => {
      const sorted = [...rates].sort((a, b) => a - b);
      return {
        unit,
        count,
        min: sorted[0] ?? null,
        median: sorted.length ? sorted[Math.floor(sorted.length / 2)] : null,
        max: sorted[sorted.length - 1] ?? null,
      };
    });

    const collect = (key: 'redFlags' | 'strengths' | 'gapsInMyPractice' | 'commercialTerms') =>
      quotes
        .flatMap((q) => {
          try {
            return (JSON.parse(q.analysisJson ?? '{}')[key] as string[]) ?? [];
          } catch {
            return [];
          }
        })
        .slice(0, 60);

    res.json({
      analysed: quotes.length,
      aiEnabled: anthropicKeySource() !== 'none',
      byCompetitor: byCompetitor.sort((a, b) => b.uploads - a.uploads),
      byUnit: byUnit.sort((a, b) => b.count - a.count),
      themes: {
        redFlags: collect('redFlags'),
        strengths: collect('strengths'),
        practiceGaps: collect('gapsInMyPractice'),
        commercialTerms: collect('commercialTerms'),
      },
    });
  }),
);
