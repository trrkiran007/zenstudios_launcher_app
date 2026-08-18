import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicKey } from '../config.js';

const MODEL = process.env.ANTHROPIC_MODEL?.trim() || 'claude-opus-5';

export class AiNotConfiguredError extends Error {
  constructor() {
    super('No Anthropic API key configured. Add one in Settings to enable AI analysis.');
  }
}

function client() {
  const apiKey = getAnthropicKey();
  if (!apiKey) throw new AiNotConfiguredError();
  return new Anthropic({ apiKey });
}

export type CompetitorAnalysis = {
  competitorName: string | null;
  quoteDateText: string | null;
  projectType: string | null;
  carpetAreaSqft: number | null;
  totalValue: number | null;
  currency: string;
  taxTreatment: string;
  summary: string;
  structureNotes: string;
  pricingPatterns: string[];
  commercialTerms: string[];
  redFlags: string[];
  strengths: string[];
  gapsInMyPractice: string[];
  critique: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  items: {
    room: string | null;
    category: string | null;
    description: string;
    unit: string | null;
    quantity: number | null;
    rate: number | null;
    amount: number | null;
    notes: string | null;
  }[];
};

/**
 * Nullable field. Structured outputs guarantees `anyOf`, whereas a
 * `type: ["string", "null"]` array is not part of the documented subset — so
 * every optional field is expressed the supported way.
 */
const nullable = (type: 'string' | 'number', description?: string) => ({
  anyOf: [{ type }, { type: 'null' }],
  ...(description ? { description } : {}),
});

/**
 * JSON Schema for the analysis. Structured outputs reject numeric and string
 * length constraints, so any range checking happens on our side.
 */
const ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    competitorName: nullable('string', 'Vendor/studio name on the document'),
    quoteDateText: nullable('string', 'Quotation date exactly as printed'),
    projectType: nullable('string', 'e.g. 2BHK, 3BHK, Villa, Office'),
    carpetAreaSqft: nullable('number'),
    totalValue: nullable('number', 'Grand total including tax if shown'),
    currency: { type: 'string' },
    taxTreatment: {
      type: 'string',
      description: 'How GST is handled: inclusive, exclusive, per-line, not shown, etc.',
    },
    summary: { type: 'string', description: '3-6 sentence factual summary of what the quote contains' },
    structureNotes: {
      type: 'string',
      description: 'How the document is organised: grouping, level of spec detail, exclusions, annexures',
    },
    pricingPatterns: {
      type: 'array',
      description: 'Observations about how they price: units used, bundling, per-sqft vs per-unit, rounding',
      items: { type: 'string' },
    },
    commercialTerms: {
      type: 'array',
      description: 'Payment milestones, validity, warranty, timeline, cancellation, escalation clauses',
      items: { type: 'string' },
    },
    redFlags: {
      type: 'array',
      description: 'Vague scope, hidden exclusions, unrealistic timelines, missing specs, anything a client should question',
      items: { type: 'string' },
    },
    strengths: {
      type: 'array',
      description: 'What this document does well from a buyer-persuasion standpoint',
      items: { type: 'string' },
    },
    gapsInMyPractice: {
      type: 'array',
      description: 'Presentation/clarity/completeness practices worth considering — never pricing levels',
      items: { type: 'string' },
    },
    critique: {
      type: 'string',
      description: 'Markdown critical appraisal for the reader. Assess the document on its own merits.',
    },
    confidence: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          room: nullable('string'),
          category: nullable('string'),
          description: { type: 'string' },
          unit: nullable('string'),
          quantity: nullable('number'),
          rate: nullable('number'),
          amount: nullable('number'),
          notes: nullable('string'),
        },
        required: ['room', 'category', 'description', 'unit', 'quantity', 'rate', 'amount', 'notes'],
      },
    },
  },
  required: [
    'competitorName', 'quoteDateText', 'projectType', 'carpetAreaSqft', 'totalValue', 'currency',
    'taxTreatment', 'summary', 'structureNotes', 'pricingPatterns', 'commercialTerms', 'redFlags',
    'strengths', 'gapsInMyPractice', 'critique', 'confidence', 'items',
  ],
} as const;

const SYSTEM = `You are a quantity-surveying analyst for an Indian interior design studio.

You read competitor quotations that the studio has collected as market intelligence and produce a
faithful extraction plus an independent critical appraisal.

Rules you must follow:
- Extract only what the document actually states. Never invent line items, rates, or totals.
- Where a value is unreadable or absent, return null rather than guessing.
- Your job is to help the reader UNDERSTAND how competitors quote, not to tell them what to charge.
  Never recommend a price, a rate, a margin, a discount, or a positioning move for the reader's own
  quotations. If a pricing recommendation would be the natural thing to say, say instead what the
  competitor did and what a client is likely to infer from it.
- "gapsInMyPractice" is strictly about document craft — clarity, specification depth, exclusions,
  terms, presentation. It must never contain a pricing suggestion.
- Be critical and specific. Name the clause, the room, the line item. Vague praise is useless.
- Indian context: rates in INR, units are typically Sq.ft, R.ft (running feet), Nos, Lump sum.
  Common materials: BWP/BWR/MR plywood, HDHMR, MDF, laminate (Merino/Greenlam/Century),
  acrylic and PU finishes, hardware brands (Hettich, Hafele, Ebco), quartz/granite counters.
- The document may be a scan, a photo, or a spreadsheet export. Read what you can and set
  confidence accordingly.`;

/* ------------------------- rate card extraction ------------------------- */

export type ParsedRateCard = {
  items: {
    name: string;
    category: string | null;
    brand: string | null;
    sku: string | null;
    unit: string;
    rate: number;
    costPrice: number | null;
    hsnSac: string | null;
    gstRate: number | null;
    specNote: string | null;
  }[];
  sourceTitle: string | null;
  ratesIncludeGst: boolean | null;
  notes: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
};

const RATE_CARD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    sourceTitle: nullable('string', 'Title or heading of the rate card document'),
    ratesIncludeGst: {
      anyOf: [{ type: 'boolean' }, { type: 'null' }],
      description: 'True if the document states rates are GST-inclusive, false if exclusive, null if unstated',
    },
    notes: {
      type: 'string',
      description:
        'What you observed: which columns existed, anything ambiguous, rows you skipped and why. Keep it short.',
    },
    confidence: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', description: 'Item name, cleaned up but not reworded' },
          category: nullable('string', 'Section heading the item sat under, e.g. Modular Kitchen'),
          brand: nullable('string'),
          sku: nullable('string', 'Product/model code if the document has one'),
          unit: {
            type: 'string',
            description:
              'Normalised unit. Map abbreviations: sft/sqft/sq ft -> "Sq.ft"; rft/rmt/running ft -> "R.ft"; nos/no/pc/piece/each -> "Nos"; set -> "Set"; ls/lumpsum/lump sum -> "Lump sum". Use the closest of: Sq.ft, R.ft, Nos, Set, Lump sum, Sq.mt, Kg, Litre, Hour, Day, Month.',
          },
          rate: { type: 'number', description: 'Selling rate per unit as printed. Use 0 if unreadable.' },
          costPrice: nullable('number', 'Only if the document shows a separate cost/purchase/landed price'),
          hsnSac: nullable('string'),
          gstRate: nullable('number', 'Only if a GST percentage is printed for the row'),
          specNote: nullable('string', 'Specification/description text shown against the item'),
        },
        required: ['name', 'category', 'brand', 'sku', 'unit', 'rate', 'costPrice', 'hsnSac', 'gstRate', 'specNote'],
      },
    },
  },
  required: ['sourceTitle', 'ratesIncludeGst', 'notes', 'confidence', 'items'],
} as const;

const RATE_CARD_SYSTEM = `You transcribe rate cards and price lists for an Indian interior design and
product-supply business into structured rows.

This is the studio's OWN rate card or a supplier's price list that they are entitled to use. Your job
is faithful transcription, not judgement.

Rules:
- Transcribe only what is printed. Never invent an item, a rate, or a unit.
- If a rate is unreadable, still return the row with rate 0 rather than dropping it, and say so in notes.
- Do not convert or adjust prices. If rates are GST-inclusive, report that in ratesIncludeGst — do not
  strip the tax yourself.
- Carry section headings into "category" for every row beneath them.
- Put material/finish/hardware detail into specNote, not into name.
- Skip totals, subtotals, terms, headers, footers, and page numbers.
- Indian context: rates are INR; units are typically Sq.ft, R.ft (running feet), Nos, Set, Lump sum.
- Common materials: BWP/BWR/MR plywood, HDHMR, MDF, laminate (Merino/Greenlam/Century), acrylic and
  PU finishes, hardware (Hettich, Hafele, Ebco), quartz/granite counters.
- The document may be a scan or a photo. Read what you can and set confidence accordingly.`;

/** Transcribe an uploaded rate card into proposed catalog rows. Nothing is saved here. */
export async function parseRateCard(input: {
  mimeType: string;
  base64: string;
  extractedText?: string | null;
  hint?: string | null;
}): Promise<ParsedRateCard> {
  const anthropic = client();
  const content: Anthropic.ContentBlockParam[] = [];

  if (input.mimeType === 'application/pdf') {
    content.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: input.base64 },
      title: 'Rate card',
    });
  } else if (/^image\/(png|jpeg|jpg|webp|gif)$/.test(input.mimeType)) {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: input.mimeType === 'image/jpg' ? 'image/jpeg' : (input.mimeType as any),
        data: input.base64,
      },
    });
  } else if (input.extractedText) {
    content.push({ type: 'text', text: `Document contents:\n\n${input.extractedText.slice(0, 400_000)}` });
  } else {
    throw new Error(`Cannot read a ${input.mimeType} file. Upload a PDF or an image.`);
  }

  content.push({
    type: 'text',
    text: [
      'Transcribe every priced line in this rate card into structured rows.',
      input.hint ? `\nContext from the user: ${input.hint}` : '',
      '\nReturn the rows exactly as printed. Do not adjust any price.',
    ].join('\n'),
  });

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    system: RATE_CARD_SYSTEM,
    output_config: { format: { type: 'json_schema', schema: RATE_CARD_SCHEMA as any } },
    messages: [{ role: 'user', content }],
  });

  const message = await stream.finalMessage();

  if (message.stop_reason === 'refusal') throw new Error('The model declined to read this document.');
  if (message.stop_reason === 'max_tokens') {
    throw new Error(
      'This rate card is too long to read in one pass. Split the PDF into smaller parts and import them one at a time.',
    );
  }

  const text = message.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') throw new Error('The model returned no rows.');

  return JSON.parse(text.text) as ParsedRateCard;
}

type AnalysisInput = {
  mimeType: string;
  base64: string;
  extractedText?: string | null;
  context?: {
    competitorName?: string | null;
    city?: string | null;
    clientSegment?: string | null;
    projectType?: string | null;
    sourceNote?: string | null;
  };
};

export async function analyseCompetitorQuote(input: AnalysisInput): Promise<CompetitorAnalysis> {
  const anthropic = client();

  const context = Object.entries(input.context ?? {})
    .filter(([, v]) => v)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  const content: Anthropic.ContentBlockParam[] = [];

  if (input.mimeType === 'application/pdf') {
    content.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: input.base64 },
      title: 'Competitor quotation',
    });
  } else if (/^image\/(png|jpeg|jpg|webp|gif)$/.test(input.mimeType)) {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: input.mimeType === 'image/jpg' ? 'image/jpeg' : (input.mimeType as any),
        data: input.base64,
      },
    });
  } else if (input.extractedText) {
    content.push({ type: 'text', text: `Document contents:\n\n${input.extractedText.slice(0, 400_000)}` });
  } else {
    throw new Error(`Cannot analyse a ${input.mimeType} file. Upload a PDF or an image.`);
  }

  content.push({
    type: 'text',
    text: [
      'Analyse this competitor quotation.',
      context ? `\nWhat the studio already knows about this document:\n${context}` : '',
      '\nExtract every line item you can read, then write the appraisal.',
      'Remember: describe and critique what they did. Do not advise on what the reader should charge.',
    ].join('\n'),
  });

  // Streaming keeps a long, item-heavy extraction from hitting request timeouts.
  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    system: SYSTEM,
    output_config: { format: { type: 'json_schema', schema: ANALYSIS_SCHEMA as any } },
    messages: [{ role: 'user', content }],
  });

  const message = await stream.finalMessage();

  if (message.stop_reason === 'refusal') {
    throw new Error('The model declined to analyse this document.');
  }
  if (message.stop_reason === 'max_tokens') {
    throw new Error('The document is too long to analyse in one pass. Split it and retry.');
  }

  const text = message.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') throw new Error('The model returned no analysis.');

  return JSON.parse(text.text) as CompetitorAnalysis;
}
