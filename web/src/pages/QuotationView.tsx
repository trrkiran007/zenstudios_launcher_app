import {
  ArrowLeft, ArrowRight, Copy, Download, FileText, GitBranch, Pencil, Printer, Receipt, Rocket,
  Share2,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Badge, Button, Card, Checkbox, ErrorState, Field, Input, Loading, Modal, Select,
  StatusBadge, Table, Td, Th, Textarea, useAction,
} from '../components/ui';
import { api, useApi } from '../lib/api';
import { useApp } from '../lib/app-context';
import { date, dateTime, money, num, pct } from '../lib/format';
import { downloadFile, slug, stamp } from '../lib/transfer';
import type { Invoice, Note, Project, Quotation } from '../lib/types';

const NEXT_STATUS: Record<string, { value: string; label: string }[]> = {
  DRAFT: [{ value: 'SENT', label: 'Mark as sent' }],
  SENT: [
    { value: 'ACCEPTED', label: 'Mark accepted' },
    { value: 'REJECTED', label: 'Mark rejected' },
    { value: 'EXPIRED', label: 'Mark expired' },
  ],
  ACCEPTED: [],
  REJECTED: [{ value: 'SENT', label: 'Reopen as sent' }],
  EXPIRED: [{ value: 'SENT', label: 'Reopen as sent' }],
  SUPERSEDED: [],
};

export function QuotationView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { system } = useApp();
  const { run, busy } = useAction();
  const { data: q, loading, error, reload } = useApi<Quotation & { notesLog?: Note[] }>(`/quotations/${id}`, [id]);

  const [converting, setConverting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareCosts, setShareCosts] = useState(false);
  const [invoicing, setInvoicing] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [invoiceMode, setInvoiceMode] = useState<'FULL' | 'MILESTONE'>('FULL');
  const [invoiceType, setInvoiceType] = useState<'TAX' | 'PROFORMA'>('TAX');
  const [percentage, setPercentage] = useState(50);
  const [milestoneLabel, setMilestoneLabel] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [poDate, setPoDate] = useState('');
  const [note, setNote] = useState('');

  if (loading) return <Loading />;
  if (error || !q) return <ErrorState message={error ?? 'Not found'} onRetry={reload} />;

  const changeStatus = (status: string) =>
    run(async () => {
      await api.patch(`/quotations/${q.id}/status`, { status });
      await reload();
    }, 'Status updated');

  const convert = () =>
    run(async () => {
      const project = await api.post<Project>(`/quotations/${q.id}/convert`, {
        name: projectName || q.title,
      });
      setConverting(false);
      navigate(`/projects/${project.id}`);
    }, 'Converted to a tracked project');

  const createInvoice = () =>
    run(async () => {
      const invoice = await api.post<Invoice>('/invoices/from-quotation', {
        quotationId: q.id,
        type: invoiceType,
        mode: invoiceMode,
        percentage,
        label: milestoneLabel || null,
        poNumber: poNumber.trim() || null,
        poDate: poDate || null,
      });
      setInvoicing(false);
      navigate(`/invoices?open=${invoice.id}`);
    }, 'Invoice drafted');

  const addNote = () =>
    run(async () => {
      await api.post('/notes', { quotationId: q.id, body: note });
      setNote('');
      await reload();
    }, 'Note added');

  const shareAsFile = () =>
    run(async () => {
      const file = await api.get<unknown>(
        `/transfer/quotation/${q.id}?costs=${shareCosts ? '1' : '0'}`,
      );
      downloadFile(`${slug(q.number)}-${stamp()}`, file);
      setSharing(false);
    }, 'Quotation file downloaded');

  const isIntra = q.igst === 0;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button variant="ghost" icon={<ArrowLeft className="size-4" />} onClick={() => navigate('/quotations')} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{q.number}</h1>
              <StatusBadge status={q.status} />
              {q.version > 1 && <Badge tone="violet">Revision v{q.version}</Badge>}
              <Badge dot={q.businessType?.color}>{q.businessType?.name}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-600">{q.title}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {NEXT_STATUS[q.status]?.map((s) => (
            <Button key={s.value} size="sm" disabled={busy} onClick={() => changeStatus(s.value)}>
              {s.label}
            </Button>
          ))}
          <Button
            size="sm"
            icon={<Printer className="size-4" />}
            onClick={() => window.open(api.fileUrl(`/quotations/${q.id}/print`), '_blank')}
          >
            Print view
          </Button>
          {system?.pdfEngine && (
            <Button
              size="sm"
              icon={<Download className="size-4" />}
              onClick={() => window.open(api.fileUrl(`/quotations/${q.id}/pdf?download=1`), '_blank')}
            >
              PDF
            </Button>
          )}
          <Button size="sm" icon={<Share2 className="size-4" />} onClick={() => setSharing(true)}>
            Share as file
          </Button>
          <Button size="sm" icon={<Pencil className="size-4" />} onClick={() => navigate(`/quotations/${q.id}/edit`)}>
            Edit
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          {(q.sections ?? []).map((section) => (
            <Card
              key={section.id}
              padded={false}
              title={section.name}
              subtitle={`${section.items.length} line(s)`}
              actions={
                <span className="tnum text-sm font-semibold text-slate-700">
                  {money(section.items.reduce((a, i) => a + (i.amount ?? 0), 0))}
                </span>
              }
            >
              <Table>
                <thead>
                  <tr>
                    <Th className="w-8">#</Th>
                    <Th>Description</Th>
                    <Th>Unit</Th>
                    <Th align="right">Qty</Th>
                    <Th align="right">Rate</Th>
                    <Th align="right">GST</Th>
                    <Th align="right">Amount</Th>
                  </tr>
                </thead>
                <tbody>
                  {section.items.map((item, i) => (
                    <tr key={item.id ?? i}>
                      <Td className="text-xs text-slate-400">{i + 1}</Td>
                      <Td>
                        <p className="font-medium text-slate-900">{item.description}</p>
                        {item.specNote && <p className="mt-0.5 text-xs text-slate-500">{item.specNote}</p>}
                        {item.hsnSac && <p className="mt-0.5 text-xs text-slate-400">HSN/SAC {item.hsnSac}</p>}
                      </Td>
                      <Td>{item.unit}</Td>
                      <Td align="right">{num(item.quantity)}</Td>
                      <Td align="right">{money(item.rate)}</Td>
                      <Td align="right">{item.gstRate}%</Td>
                      <Td align="right" className="font-medium text-slate-900">{money(item.amount ?? 0)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          ))}

          {q.notes && (
            <Card title="Notes">
              <p className="text-sm whitespace-pre-wrap text-slate-600">{q.notes}</p>
            </Card>
          )}
          {q.termsText && (
            <Card title="Terms & conditions">
              <p className="font-mono text-xs whitespace-pre-wrap text-slate-600">{q.termsText}</p>
            </Card>
          )}

          <Card title="Activity">
            <div className="mb-4 flex gap-2">
              <Input
                placeholder="Add a note — call summary, client feedback, follow-up…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && note.trim() && addNote()}
              />
              <Button variant="primary" disabled={!note.trim() || busy} onClick={addNote}>Add</Button>
            </div>
            {q.notesLog?.length ? (
              <ul className="space-y-3">
                {q.notesLog.map((n) => (
                  <li key={n.id} className="flex gap-3 text-sm">
                    <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.kind === 'NOTE' ? 'bg-brand-500' : 'bg-slate-300'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-700">{n.body}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{n.author} · {dateTime(n.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-center text-sm text-slate-500">No activity yet.</p>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Client">
            <p className="text-sm font-medium text-slate-900">{q.client?.name}</p>
            <div className="mt-1.5 space-y-0.5 text-xs text-slate-500">
              {q.client?.contactPerson && <p>Attn: {q.client.contactPerson}</p>}
              {q.client?.addressLine1 && <p>{q.client.addressLine1}</p>}
              <p>{[q.client?.city, q.client?.state, q.client?.pincode].filter(Boolean).join(', ')}</p>
              {q.client?.gstin && <p className="font-medium text-slate-600">GSTIN {q.client.gstin}</p>}
              {q.client?.phone && <p>{q.client.phone}</p>}
              {q.client?.email && <p>{q.client.email}</p>}
            </div>
          </Card>

          <Card title="Summary">
            <dl className="tnum space-y-1.5 text-sm">
              <Row label="Quote date" value={date(q.quoteDate)} />
              <Row label="Valid until" value={date(q.validUntil)} />
              <Row label="Subtotal" value={money(q.subtotal)} />
              {!!q.discountAmount && <Row label="Discount" value={`− ${money(q.discountAmount)}`} />}
              <Row label="Taxable value" value={money(q.taxableValue)} />
              {isIntra ? (
                <>
                  <Row label="CGST" value={money(q.cgst)} />
                  <Row label="SGST" value={money(q.sgst)} />
                </>
              ) : (
                <Row label="IGST" value={money(q.igst)} />
              )}
              {!!q.roundOff && <Row label="Round off" value={money(q.roundOff)} />}
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold">
                <dt>Grand total</dt>
                <dd>{money(q.grandTotal)}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Margin" subtitle="Internal only">
            <dl className="tnum space-y-1.5 text-sm">
              <Row label="Cost" value={money(q.totalCost)} />
              <Row label="Gross profit" value={money(q.grossProfit)} />
              <Row label="Margin" value={q.totalCost ? pct(q.marginPct) : '—'} />
            </dl>
          </Card>

          <Card title="Next step">
            <div className="space-y-2">
              {q.project ? (
                <Link
                  to={`/projects/${q.project.id}`}
                  className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2.5 text-sm ring-1 ring-brand-200"
                >
                  <span className="font-medium text-brand-800">Converted → {q.project.code}</span>
                  <ArrowRight className="size-4 text-brand-600" />
                </Link>
              ) : (
                <Button
                  variant="primary"
                  className="w-full"
                  icon={<Rocket className="size-4" />}
                  onClick={() => {
                    setProjectName(q.title);
                    setConverting(true);
                  }}
                >
                  Convert to project
                </Button>
              )}
              <Button className="w-full" icon={<Receipt className="size-4" />} onClick={() => setInvoicing(true)}>
                Raise invoice
              </Button>
              <Button
                className="w-full"
                icon={<GitBranch className="size-4" />}
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const rev = await api.post<Quotation>(`/quotations/${q.id}/revise`);
                    navigate(`/quotations/${rev.id}/edit`);
                  }, 'Revision created')
                }
              >
                Create revision
              </Button>
              <Button
                className="w-full"
                icon={<Copy className="size-4" />}
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const copy = await api.post<Quotation>(`/quotations/${q.id}/duplicate`);
                    navigate(`/quotations/${copy.id}/edit`);
                  }, 'Duplicated')
                }
              >
                Duplicate
              </Button>
            </div>
          </Card>

          {(q.revisions?.length || q.parent) && (
            <Card title="Revision history">
              <ul className="space-y-2 text-sm">
                {q.parent && (
                  <li>
                    <Link to={`/quotations/${q.parent.id}`} className="text-brand-700 hover:underline">
                      ← {q.parent.number} (v{q.parent.version})
                    </Link>
                  </li>
                )}
                {q.revisions?.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2">
                    <Link to={`/quotations/${r.id}`} className="truncate text-brand-700 hover:underline">
                      {r.number} (v{r.version})
                    </Link>
                    <StatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={sharing}
        onClose={() => setSharing(false)}
        title="Share this quotation as a file"
        description="Creates a .zns file a colleague can open in their own copy of ZenStudios."
        footer={
          <>
            <Button onClick={() => setSharing(false)}>Cancel</Button>
            <Button variant="primary" loading={busy} onClick={shareAsFile}>Download file</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          They will get {q.number} as a fresh draft under their own quotation number, with the client
          matched by name and GST recalculated for their place of supply. Nothing about this document
          changes.
        </p>

        <div className="mt-4">
          <Checkbox
            checked={shareCosts}
            onChange={setShareCosts}
            label="Include cost prices and margins"
          />
          <p className="mt-1.5 text-xs text-slate-500">
            {shareCosts
              ? 'The file will carry your buying prices. Only send it to someone who is allowed to see margins.'
              : 'Cost prices are stripped out. Safe to send to anyone who needs the quotation itself.'}
          </p>
        </div>
      </Modal>

      <Modal
        open={converting}
        onClose={() => setConverting(false)}
        title="Convert to a tracked project"
        description="This marks the quotation accepted, opens a project in the first pipeline stage, and seeds starter tasks."
        footer={
          <>
            <Button onClick={() => setConverting(false)}>Cancel</Button>
            <Button variant="primary" loading={busy} onClick={convert}>Convert</Button>
          </>
        }
      >
        <Field label="Project name">
          <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} />
        </Field>
        <p className="mt-3 text-xs text-slate-500">
          Contract value {money(q.grandTotal)} · estimated cost {money(q.totalCost)} carry over so
          project profitability starts from real numbers.
        </p>
      </Modal>

      <Modal
        open={invoicing}
        onClose={() => setInvoicing(false)}
        title="Raise an invoice"
        description="Creates a draft you can review and edit before issuing."
        footer={
          <>
            <Button onClick={() => setInvoicing(false)}>Cancel</Button>
            <Button variant="primary" loading={busy} onClick={createInvoice}>Create draft</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Document type">
            <Select value={invoiceType} onChange={(e) => setInvoiceType(e.target.value as any)}>
              <option value="TAX">Tax invoice</option>
              <option value="PROFORMA">Proforma invoice</option>
            </Select>
          </Field>
          <Field label="Scope">
            <Select value={invoiceMode} onChange={(e) => setInvoiceMode(e.target.value as any)}>
              <option value="FULL">Full quotation — copy every line</option>
              <option value="MILESTONE">Milestone — a percentage of the quote value</option>
            </Select>
          </Field>
          <div className="rounded-lg border border-slate-200 p-3.5">
            <p className="mb-3 text-sm font-medium text-slate-800">Client's purchase order</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="PO number" hint="Leave blank if they did not raise one">
                <Input
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  placeholder="4500033379"
                />
              </Field>
              <Field label="PO date">
                <Input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} />
              </Field>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {poNumber.trim()
                ? 'Printed in the header and on the subject line — most buyers will not process an invoice without it.'
                : 'The subject line will reference this quotation instead.'}
            </p>
          </div>

          {invoiceMode === 'MILESTONE' && (
            <>
              <Field label="Percentage of taxable value" hint={`= ${money((q.taxableValue * percentage) / 100)} before GST`}>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={percentage}
                  onChange={(e) => setPercentage(Number(e.target.value))}
                />
              </Field>
              <Field label="Milestone description" hint="Leave blank to auto-generate">
                <Input
                  value={milestoneLabel}
                  onChange={(e) => setMilestoneLabel(e.target.value)}
                  placeholder="Advance against order confirmation"
                />
              </Field>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}
