import { Lock, ScanSearch, Search, Sparkles, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Badge, Button, Card, EmptyState, ErrorState, Field, Input, Loading, Modal,
  PageHeader, Select, Stat, Table, Td, Textarea, Th, useAction,
} from '../components/ui';
import { api, useApi } from '../lib/api';
import { useApp } from '../lib/app-context';
import { date, money } from '../lib/format';
import type { CompetitorQuote } from '../lib/types';

type Insights = {
  analysed: number;
  aiEnabled: boolean;
  byCompetitor: { competitor: string; uploads: number; avgValue: number }[];
  byUnit: { unit: string; count: number; min: number | null; median: number | null; max: number | null }[];
  themes: { redFlags: string[]; strengths: string[]; practiceGaps: string[]; commercialTerms: string[] };
};

const STATUS_TONE = { UPLOADED: 'slate', EXTRACTED: 'blue', ANALYZED: 'green', FAILED: 'red' } as const;

const BLANK = {
  competitorName: '', city: '', clientSegment: '', projectType: '', carpetArea: '', sourceNote: '', quoteDate: '',
};

export function Benchmark() {
  const { system } = useApp();
  const { run, busy } = useAction();
  const fileRef = useRef<HTMLInputElement>(null);

  const [q, setQ] = useState('');
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ ...BLANK });
  const [file, setFile] = useState<File | null>(null);

  const { data, loading, error, reload } = useApi<CompetitorQuote[]>(`/benchmark${q ? `?q=${encodeURIComponent(q)}` : ''}`, [q]);
  const { data: insights, reload: reloadInsights } = useApi<Insights>('/benchmark/insights/summary');

  const upload = () =>
    run(async () => {
      if (!file) throw new Error('Choose a PDF or image first.');
      const body = new FormData();
      body.append('file', file);
      Object.entries(form).forEach(([k, v]) => v && body.append(k, v));
      const created = await api.upload<CompetitorQuote>('/benchmark', body);
      setUploading(false);
      setForm({ ...BLANK });
      setFile(null);
      await reload();
      if (system?.aiEnabled) {
        await api.post(`/benchmark/${created.id}/analyse`);
        await reload();
        await reloadInsights();
      }
    }, system?.aiEnabled ? 'Uploaded and analysed' : 'Uploaded');

  const analyse = (id: string) =>
    run(async () => {
      await api.post(`/benchmark/${id}/analyse`);
      await reload();
      await reloadInsights();
    }, 'Analysis complete');

  const remove = (id: string) =>
    run(async () => {
      await api.del(`/benchmark/${id}`);
      await reload();
      await reloadInsights();
    }, 'Deleted');

  return (
    <>
      <PageHeader
        title="Market benchmark"
        subtitle="Competitor quotations, analysed for patterns — kept strictly separate from your own pricing"
        actions={
          <Button variant="primary" icon={<Upload className="size-4" />} onClick={() => setUploading(true)}>
            Upload a quote
          </Button>
        }
      />

      <div className="mb-5 flex items-start gap-3 rounded-xl bg-slate-100 px-4 py-3 text-sm ring-1 ring-slate-200">
        <Lock className="mt-0.5 size-4 shrink-0 text-slate-500" />
        <p className="text-slate-600">
          <span className="font-medium text-slate-800">Read-only by design.</span> Nothing on this page can be
          copied into a quotation, and no figure here reaches your rate card or the quotation editor. It exists
          so you can read the market, not price against it. Your own rate history lives under{' '}
          <Link to="/reports" className="font-medium text-brand-700 hover:underline">Reports → My rate history</Link>.
        </p>
      </div>

      {!system?.aiEnabled && (
        <div className="mb-5 flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm ring-1 ring-amber-200">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <p className="text-amber-800">
            AI analysis is off. Uploads are still stored and text-extracted; add an Anthropic API key in{' '}
            <Link to="/settings" className="font-medium underline">Settings</Link> to get the summary, line-item
            extraction and critique.
          </p>
        </div>
      )}

      {insights && insights.analysed > 0 && (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-3">
            <Stat label="Documents analysed" value={insights.analysed} />
            <Stat label="Competitors covered" value={insights.byCompetitor.length} />
            <Stat label="Distinct units seen" value={insights.byUnit.length} />
          </div>

          <div className="mb-5 grid gap-5 lg:grid-cols-2">
            <Card title="What they do well" subtitle="Document craft worth noticing">
              <ThemeList items={insights.themes.strengths} tone="green" empty="Nothing recorded yet." />
            </Card>
            <Card title="Red flags to point out" subtitle="Things a client should question">
              <ThemeList items={insights.themes.redFlags} tone="red" empty="Nothing recorded yet." />
            </Card>
            <Card title="Gaps in my own documents" subtitle="Clarity and completeness only — never pricing">
              <ThemeList items={insights.themes.practiceGaps} tone="amber" empty="Nothing recorded yet." />
            </Card>
            <Card title="Commercial terms seen in the market">
              <ThemeList items={insights.themes.commercialTerms} tone="blue" empty="Nothing recorded yet." />
            </Card>
          </div>
        </>
      )}

      <Card padded={false}>
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="relative max-w-sm">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search competitor, city, contents…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
        </div>

        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !data?.length ? (
          <EmptyState
            icon={<ScanSearch className="size-10" />}
            title="No competitor quotes uploaded"
            description="Upload a competitor's PDF or a photo of one. You get an extraction, a critical appraisal, and pattern notes — with a hard wall between this and your own pricing."
            action={<Button variant="primary" onClick={() => setUploading(true)}>Upload the first one</Button>}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Competitor</Th>
                <Th>Project</Th>
                <Th>Segment</Th>
                <Th>Uploaded</Th>
                <Th align="right">Their total</Th>
                <Th align="center">Lines</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="group hover:bg-slate-50">
                  <Td>
                    <Link to={`/benchmark/${row.id}`} className="font-medium text-brand-700 hover:underline">
                      {row.competitorName}
                    </Link>
                    <p className="text-xs text-slate-500">{row.city || '—'}</p>
                  </Td>
                  <Td>{row.projectType || '—'}</Td>
                  <Td>{row.clientSegment ? <Badge>{row.clientSegment}</Badge> : '—'}</Td>
                  <Td>{date(row.createdAt)}</Td>
                  <Td align="right">{row.totalValue ? money(row.totalValue) : '—'}</Td>
                  <Td align="center">{row._count?.items ?? 0}</Td>
                  <Td>
                    <Badge tone={STATUS_TONE[row.status]}>{row.status.toLowerCase()}</Badge>
                    {row.error && <p className="mt-1 line-clamp-1 text-xs text-red-600">{row.error}</p>}
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100">
                      {system?.aiEnabled && (
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => analyse(row.id)} title="Run analysis">
                          <Sparkles className="size-3.5" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => remove(row.id)}>
                        <Trash2 className="size-3.5 text-red-500" />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={uploading}
        onClose={() => setUploading(false)}
        wide
        title="Upload a competitor quotation"
        description={
          system?.aiEnabled
            ? 'The document is analysed as soon as it uploads. This can take up to a minute for a long PDF.'
            : 'The document is stored and text-extracted. Add an API key in Settings to analyse it.'
        }
        footer={
          <>
            <Button onClick={() => setUploading(false)}>Cancel</Button>
            <Button variant="primary" loading={busy} disabled={!file || !form.competitorName.trim()} onClick={upload}>
              {system?.aiEnabled ? 'Upload & analyse' : 'Upload'}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center transition hover:border-brand-400 hover:bg-brand-50/40"
            >
              <Upload className="mx-auto size-5 text-slate-400" />
              <p className="mt-2 text-sm font-medium text-slate-700">
                {file ? file.name : 'Choose a PDF or photo of the quotation'}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">PDF, PNG or JPG · up to 25 MB</p>
            </button>
          </div>

          <Field label="Competitor name" required>
            <Input value={form.competitorName} onChange={(e) => setForm({ ...form, competitorName: e.target.value })} />
          </Field>
          <Field label="City">
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Hyderabad" />
          </Field>
          <Field label="Client segment">
            <Select value={form.clientSegment} onChange={(e) => setForm({ ...form, clientSegment: e.target.value })}>
              <option value="">Unknown</option>
              {['Budget', 'Mid', 'Premium', 'Luxury'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Project type">
            <Input value={form.projectType} onChange={(e) => setForm({ ...form, projectType: e.target.value })} placeholder="3BHK / Villa / Office" />
          </Field>
          <Field label="Carpet area (sq.ft)">
            <Input type="number" value={form.carpetArea} onChange={(e) => setForm({ ...form, carpetArea: e.target.value })} />
          </Field>
          <Field label="Quotation date">
            <Input type="date" value={form.quoteDate} onChange={(e) => setForm({ ...form, quoteDate: e.target.value })} />
          </Field>
          <Field label="Where did this come from?" hint="Client shared it, public listing, vendor…" className="sm:col-span-2">
            <Textarea rows={2} value={form.sourceNote} onChange={(e) => setForm({ ...form, sourceNote: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </>
  );
}

function ThemeList({
  items, tone, empty,
}: { items: string[]; tone: 'green' | 'red' | 'amber' | 'blue'; empty: string }) {
  const unique = [...new Set(items)].slice(0, 8);
  if (!unique.length) return <p className="py-4 text-center text-sm text-slate-500">{empty}</p>;
  const dot = { green: 'bg-brand-500', red: 'bg-red-500', amber: 'bg-amber-500', blue: 'bg-sky-500' }[tone];
  return (
    <ul className="space-y-2">
      {unique.map((t, i) => (
        <li key={i} className="flex gap-2.5 text-sm text-slate-700">
          <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${dot}`} />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}
