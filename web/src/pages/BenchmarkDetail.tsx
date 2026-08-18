import { AlertTriangle, ArrowLeft, ExternalLink, Lightbulb, Lock, Sparkles, ThumbsUp } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Badge, Button, Card, ErrorState, Loading, Stat, Table, Td, Th, useAction,
} from '../components/ui';
import { api, useApi } from '../lib/api';
import { useApp } from '../lib/app-context';
import { date, money, num } from '../lib/format';
import type { CompetitorQuote } from '../lib/types';

/** Very small markdown renderer — headings, bullets, bold, paragraphs. */
function Markdown({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-700">
      {blocks.map((block, i) => {
        const lines = block.split('\n');
        if (/^#{1,4}\s/.test(block)) {
          return (
            <h3 key={i} className="pt-1 text-sm font-semibold text-slate-900">
              {block.replace(/^#{1,4}\s/, '')}
            </h3>
          );
        }
        if (lines.every((l) => /^\s*[-*]\s/.test(l))) {
          return (
            <ul key={i} className="space-y-1.5">
              {lines.map((l, j) => (
                <li key={j} className="flex gap-2.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-slate-300" />
                  <span dangerouslySetInnerHTML={{ __html: bold(l.replace(/^\s*[-*]\s/, '')) }} />
                </li>
              ))}
            </ul>
          );
        }
        return <p key={i} dangerouslySetInnerHTML={{ __html: bold(block) }} />;
      })}
    </div>
  );
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const bold = (s: string) =>
  escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>');

export function BenchmarkDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { system } = useApp();
  const { run, busy } = useAction();
  const { data, loading, error, reload } = useApi<CompetitorQuote>(`/benchmark/${id}`, [id]);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? 'Not found'} onRetry={reload} />;

  const a = data.analysis;

  const analyse = () =>
    run(async () => {
      await api.post(`/benchmark/${data.id}/analyse`);
      await reload();
    }, 'Analysis complete');

  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button variant="ghost" icon={<ArrowLeft className="size-4" />} onClick={() => navigate('/benchmark')} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{data.competitorName}</h1>
              {data.clientSegment && <Badge>{data.clientSegment}</Badge>}
              {a && (
                <Badge tone={a.confidence === 'HIGH' ? 'green' : a.confidence === 'MEDIUM' ? 'amber' : 'red'}>
                  {a.confidence.toLowerCase()} confidence
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {[data.projectType, data.city, data.originalName].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {data.originalName && (
            <Button
              size="sm"
              icon={<ExternalLink className="size-4" />}
              onClick={() => window.open(api.fileUrl(`/benchmark/${data.id}/file`), '_blank')}
            >
              Original
            </Button>
          )}
          {system?.aiEnabled && (
            <Button size="sm" variant="primary" icon={<Sparkles className="size-4" />} loading={busy} onClick={analyse}>
              {a ? 'Re-run analysis' : 'Analyse'}
            </Button>
          )}
        </div>
      </div>

      <div className="mb-5 flex items-start gap-3 rounded-xl bg-slate-100 px-4 py-3 text-sm ring-1 ring-slate-200">
        <Lock className="mt-0.5 size-4 shrink-0 text-slate-500" />
        <p className="text-slate-600">
          This is market intelligence, not a pricing input. The analysis describes and critiques what the
          competitor did — it does not recommend what you should charge, and nothing here is wired into your
          quotations or rate card.
        </p>
      </div>

      {data.status === 'FAILED' && data.error && (
        <ErrorState message={data.error} onRetry={system?.aiEnabled ? analyse : undefined} />
      )}

      {!a ? (
        <Card>
          <div className="py-10 text-center">
            <Sparkles className="mx-auto size-8 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-900">Not analysed yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              {system?.aiEnabled
                ? 'Run the analysis to extract line items and get a critical appraisal of this document.'
                : 'Add an Anthropic API key in Settings to enable analysis. The file and its extracted text are already stored.'}
            </p>
            {system?.aiEnabled && (
              <Button variant="primary" className="mt-4" loading={busy} onClick={analyse}>Analyse now</Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Their total" value={a.totalValue ? money(a.totalValue) : '—'} sub={a.taxTreatment} />
            <Stat label="Line items read" value={data.items?.length ?? 0} />
            <Stat label="Carpet area" value={a.carpetAreaSqft ? `${num(a.carpetAreaSqft, 0)} sq.ft` : '—'} />
            <Stat
              label="Rate per sq.ft"
              value={
                a.totalValue && a.carpetAreaSqft ? money(a.totalValue / a.carpetAreaSqft) : '—'
              }
              sub="Their figure, for context only"
            />
          </div>

          <Card title="Summary">
            <p className="text-sm leading-relaxed text-slate-700">{a.summary}</p>
            {a.structureNotes && (
              <>
                <h3 className="mt-4 mb-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  How the document is put together
                </h3>
                <p className="text-sm leading-relaxed text-slate-700">{a.structureNotes}</p>
              </>
            )}
          </Card>

          <Card title="Critical appraisal" subtitle="An independent read of the document">
            <Markdown text={a.critique} />
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Pricing patterns" subtitle="How they structured their numbers">
              <Bullets items={a.pricingPatterns} icon={<Lightbulb className="size-3.5 text-sky-500" />} />
            </Card>
            <Card title="Commercial terms">
              <Bullets items={a.commercialTerms} icon={<Lightbulb className="size-3.5 text-slate-400" />} />
            </Card>
            <Card title="What they do well">
              <Bullets items={a.strengths} icon={<ThumbsUp className="size-3.5 text-brand-500" />} />
            </Card>
            <Card title="Red flags">
              <Bullets items={a.redFlags} icon={<AlertTriangle className="size-3.5 text-red-500" />} />
            </Card>
          </div>

          {a.gapsInMyPractice.length > 0 && (
            <Card
              title="Worth considering in my own documents"
              subtitle="Clarity, specification depth and terms — deliberately excludes anything about price"
            >
              <Bullets items={a.gapsInMyPractice} icon={<Lightbulb className="size-3.5 text-amber-500" />} />
            </Card>
          )}

          {!!data.items?.length && (
            <Card
              padded={false}
              title="Extracted line items"
              subtitle="Exactly as read from their document — not importable"
            >
              <Table>
                <thead>
                  <tr>
                    <Th>Room / group</Th>
                    <Th>Description</Th>
                    <Th>Unit</Th>
                    <Th align="right">Qty</Th>
                    <Th align="right">Rate</Th>
                    <Th align="right">Amount</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((it) => (
                    <tr key={it.id}>
                      <Td>{it.room || it.category || '—'}</Td>
                      <Td className="max-w-[320px]">
                        <p className="text-slate-900">{it.description}</p>
                        {it.notes && <p className="mt-0.5 text-xs text-slate-500">{it.notes}</p>}
                      </Td>
                      <Td>{it.unit || '—'}</Td>
                      <Td align="right">{it.quantity != null ? num(it.quantity) : '—'}</Td>
                      <Td align="right">{it.rate != null ? money(it.rate) : '—'}</Td>
                      <Td align="right" className="font-medium text-slate-900">
                        {it.amount != null ? money(it.amount) : '—'}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          )}

          <Card title="Provenance">
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-slate-500">Uploaded</dt>
                <dd className="mt-0.5 text-sm text-slate-900">{date(data.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Their quote date</dt>
                <dd className="mt-0.5 text-sm text-slate-900">{a.quoteDateText || date(data.quoteDate)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Pages</dt>
                <dd className="mt-0.5 text-sm text-slate-900">{data.pageCount ?? '—'}</dd>
              </div>
              {data.sourceNote && (
                <div className="sm:col-span-3">
                  <dt className="text-xs text-slate-500">Source note</dt>
                  <dd className="mt-0.5 text-sm text-slate-700">{data.sourceNote}</dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
      )}
    </>
  );
}

function Bullets({ items, icon }: { items: string[]; icon: React.ReactNode }) {
  if (!items.length) return <p className="py-4 text-center text-sm text-slate-500">Nothing noted.</p>;
  return (
    <ul className="space-y-2.5">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2.5 text-sm text-slate-700">
          <span className="mt-0.5 shrink-0">{icon}</span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}
