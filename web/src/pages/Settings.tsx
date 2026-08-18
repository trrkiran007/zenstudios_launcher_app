import {
  Building2, Check, Download, Image, Plus, Save, Share2, Sparkles, Trash2, Upload, Workflow,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge, Button, Card, Checkbox, Field, Input, Loading, Modal, PageHeader,
  Select, Tabs, Textarea, useAction,
} from '../components/ui';
import { api } from '../lib/api';
import { useApp } from '../lib/app-context';
import { downloadFile, expectKind, pickTransferFile, stamp } from '../lib/transfer';
import type { BusinessType, Organization, PipelineStage, Quotation } from '../lib/types';

export function Settings() {
  const { org, businessTypes, system, states, refresh, loading } = useApp();
  const [tab, setTab] = useState<'company' | 'bank' | 'business' | 'transfer' | 'ai'>('company');

  if (loading || !org) return <Loading />;

  return (
    <>
      <PageHeader title="Settings" subtitle="Company identity, document defaults, lines of business and AI">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'company', label: 'Company & documents' },
            { value: 'bank', label: 'Bank & terms' },
            { value: 'business', label: 'Lines of business', count: businessTypes.length },
            { value: 'transfer', label: 'Share & transfer' },
            { value: 'ai', label: 'AI & system' },
          ]}
        />
      </PageHeader>

      {tab === 'company' && <CompanyTab org={org} states={states} onSaved={refresh} />}
      {tab === 'bank' && <BankTab org={org} onSaved={refresh} />}
      {tab === 'business' && <BusinessTab types={businessTypes} onSaved={refresh} />}
      {tab === 'transfer' && <TransferTab org={org} onSaved={refresh} />}
      {tab === 'ai' && <AiTab system={system} onSaved={refresh} />}
    </>
  );
}

/* ------------------------------- company -------------------------------- */

function CompanyTab({
  org, states, onSaved,
}: { org: Organization; states: { code: string; name: string }[]; onSaved: () => Promise<void> }) {
  const { run, busy } = useAction();
  const [form, setForm] = useState<Organization>(org);
  const [logoKey, setLogoKey] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setForm(org), [org]);

  const set = (k: keyof Organization, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const save = () =>
    run(async () => {
      const { id, logoPath, ...payload } = form;
      await api.put('/settings/organization', payload);
      await onSaved();
    }, 'Company details saved');

  const uploadLogo = (file: File | null) => {
    if (!file) return;
    void run(async () => {
      const body = new FormData();
      body.append('file', file);
      await api.upload('/settings/organization/logo', body);
      setLogoKey((k) => k + 1);
      await onSaved();
    }, 'Logo updated');
  };

  return (
    <div className="space-y-5">
      <Card
        title="Brand"
        subtitle="This is what appears at the top of every quotation and invoice"
        actions={<Button variant="primary" icon={<Save className="size-4" />} loading={busy} onClick={save}>Save</Button>}
      >
        <div className="mb-5 flex flex-wrap items-center gap-4 rounded-lg bg-slate-50 p-4">
          <div className="flex h-20 w-48 items-center justify-center rounded-lg bg-white ring-1 ring-slate-200">
            {org.logoPath ? (
              <img
                src={`/api/settings/organization/logo-file?v=${logoKey}`}
                alt="Logo"
                className="max-h-16 max-w-44 object-contain"
              />
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <Image className="size-4" /> No logo
              </span>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-800">Company logo</p>
            <p className="mt-0.5 text-xs text-slate-500">
              PNG, JPG, WebP or SVG up to 5 MB. It is embedded directly into generated PDFs, so use the
              highest-resolution version you have.
            </p>
            <div className="mt-2.5 flex gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  uploadLogo(e.target.files?.[0] ?? null);
                  e.target.value = '';
                }}
              />
              <Button size="sm" onClick={() => fileRef.current?.click()}>Upload logo</Button>
              {org.logoPath && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    run(async () => {
                      await api.del('/settings/organization/logo');
                      await onSaved();
                    }, 'Logo removed')
                  }
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Brand name" required hint="Shown as the wordmark when no logo is uploaded">
            <Input value={form.brandName} onChange={(e) => set('brandName', e.target.value)} />
          </Field>
          <Field label="Legal entity name" required>
            <Input value={form.legalName} onChange={(e) => set('legalName', e.target.value)} />
          </Field>
          <Field label="Trademark line" className="sm:col-span-2">
            <Input
              value={form.trademarkLine ?? ''}
              onChange={(e) => set('trademarkLine', e.target.value)}
              placeholder="A trademark of OMHome Services Pvt Ltd."
            />
          </Field>
          <Field label="Brand colour" hint="Used for headers and accents on documents">
            <div className="flex gap-2">
              <input
                type="color"
                value={form.brandColor}
                onChange={(e) => set('brandColor', e.target.value)}
                className="h-9 w-14 cursor-pointer rounded-lg border-0 bg-white p-1 ring-1 ring-slate-300"
              />
              <Input value={form.brandColor} onChange={(e) => set('brandColor', e.target.value)} />
            </div>
          </Field>
          <Field label="Website">
            <Input value={form.website ?? ''} onChange={(e) => set('website', e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card title="Statutory identifiers" subtitle="Printed on every document">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="GSTIN"
            required
            hint={form.gstin ? undefined : 'Required on tax invoices. The first two digits must be your state code.'}
            error={!form.gstin ? 'Not set — tax invoices will print without a GSTIN' : undefined}
          >
            <Input
              value={form.gstin ?? ''}
              onChange={(e) => set('gstin', e.target.value.toUpperCase())}
              placeholder="36AAECO9870D1Z…"
              className="font-mono"
            />
          </Field>
          <Field label="CIN">
            <Input value={form.cin ?? ''} onChange={(e) => set('cin', e.target.value.toUpperCase())} className="font-mono" />
          </Field>
          <Field label="PAN">
            <Input value={form.pan ?? ''} onChange={(e) => set('pan', e.target.value.toUpperCase())} className="font-mono" />
          </Field>
          <Field label="TAN">
            <Input value={form.tan ?? ''} onChange={(e) => set('tan', e.target.value.toUpperCase())} className="font-mono" />
          </Field>
        </div>
      </Card>

      <Card
        title="Registered address & contact"
        actions={<Button variant="primary" icon={<Save className="size-4" />} loading={busy} onClick={save}>Save</Button>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Address line 1" className="sm:col-span-2">
            <Input value={form.addressLine1 ?? ''} onChange={(e) => set('addressLine1', e.target.value)} />
          </Field>
          <Field label="Address line 2" className="sm:col-span-2">
            <Input value={form.addressLine2 ?? ''} onChange={(e) => set('addressLine2', e.target.value)} />
          </Field>
          <Field label="City">
            <Input value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} />
          </Field>
          <Field label="State" hint="Sets your place of supply for the CGST/SGST vs IGST split">
            <Select
              value={form.stateCode ?? ''}
              onChange={(e) => {
                const match = states.find((s) => s.code === e.target.value);
                setForm((f) => ({ ...f, stateCode: e.target.value, state: match?.name ?? '' }));
              }}
            >
              <option value="">Select state…</option>
              {states.map((s) => (
                <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="PIN code">
            <Input value={form.pincode ?? ''} onChange={(e) => set('pincode', e.target.value)} />
          </Field>
          <Field label="Email">
            <Input value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
          </Field>
          <Field label="Alternate phone">
            <Input value={form.altPhone ?? ''} onChange={(e) => set('altPhone', e.target.value)} />
          </Field>
        </div>
      </Card>
    </div>
  );
}

/* --------------------------------- bank --------------------------------- */

function BankTab({ org, onSaved }: { org: Organization; onSaved: () => Promise<void> }) {
  const { run, busy } = useAction();
  const [form, setForm] = useState<Organization>(org);
  useEffect(() => setForm(org), [org]);
  const set = (k: keyof Organization, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const save = () =>
    run(async () => {
      const { id, logoPath, ...payload } = form;
      await api.put('/settings/organization', payload);
      await onSaved();
    }, 'Saved');

  return (
    <div className="space-y-5">
      <Card
        title="Payment details"
        subtitle="Printed in the payment block of quotations and invoices"
        actions={<Button variant="primary" icon={<Save className="size-4" />} loading={busy} onClick={save}>Save</Button>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Account name">
            <Input value={form.bankAccountName ?? ''} onChange={(e) => set('bankAccountName', e.target.value)} />
          </Field>
          <Field label="Bank">
            <Input value={form.bankName ?? ''} onChange={(e) => set('bankName', e.target.value)} />
          </Field>
          <Field label="Branch">
            <Input value={form.bankBranch ?? ''} onChange={(e) => set('bankBranch', e.target.value)} />
          </Field>
          <Field label="Account number">
            <Input value={form.bankAccountNo ?? ''} onChange={(e) => set('bankAccountNo', e.target.value)} className="font-mono" />
          </Field>
          <Field label="IFSC">
            <Input value={form.bankIfsc ?? ''} onChange={(e) => set('bankIfsc', e.target.value.toUpperCase())} className="font-mono" />
          </Field>
          <Field label="UPI ID">
            <Input value={form.upiId ?? ''} onChange={(e) => set('upiId', e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card title="Document numbering & validity">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Tax invoice prefix" hint="Becomes ZS/INV/26-27/001">
            <Input value={form.invoicePrefix} onChange={(e) => set('invoicePrefix', e.target.value)} className="font-mono" />
          </Field>
          <Field label="Proforma prefix">
            <Input value={form.proformaPrefix} onChange={(e) => set('proformaPrefix', e.target.value)} className="font-mono" />
          </Field>
          <Field label="Default quote validity (days)">
            <Input
              type="number"
              value={form.defaultValidityDays}
              onChange={(e) => set('defaultValidityDays', Number(e.target.value))}
            />
          </Field>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Quotation numbers use each line of business's short code, e.g. ZS/INT/26-27/001. Counters restart
          every April.
        </p>
      </Card>

      <Card
        title="Default terms"
        subtitle="Copied into new documents — you can still edit them per quotation"
        actions={<Button variant="primary" icon={<Save className="size-4" />} loading={busy} onClick={save}>Save</Button>}
      >
        <div className="space-y-4">
          <Field label="Quotation terms (fallback)" hint="Used when a line of business has no terms of its own">
            <Textarea rows={10} value={form.defaultTerms ?? ''} onChange={(e) => set('defaultTerms', e.target.value)} className="font-mono text-xs" />
          </Field>
          <Field label="Invoice terms">
            <Textarea rows={7} value={form.defaultInvoiceTerms ?? ''} onChange={(e) => set('defaultInvoiceTerms', e.target.value)} className="font-mono text-xs" />
          </Field>
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------- business types ---------------------------- */

const BLANK_TYPE = {
  key: '', name: '', shortCode: '', layout: 'SECTIONED' as const, sectionLabel: 'Section',
  description: '', color: '#16A34A', active: true, order: 99, enableBenchmark: false, defaultTerms: '',
};

function BusinessTab({ types, onSaved }: { types: BusinessType[]; onSaved: () => Promise<void> }) {
  const { run, busy } = useAction();
  const [editing, setEditing] = useState<Partial<BusinessType> | null>(null);
  const [stagesFor, setStagesFor] = useState<BusinessType | null>(null);

  const save = () =>
    run(async () => {
      const body = { ...editing };
      delete (body as any).id;
      delete (body as any).stages;
      delete (body as any)._count;
      if (editing?.id) await api.put(`/business-types/${editing.id}`, body);
      else await api.post('/business-types', body);
      setEditing(null);
      await onSaved();
    }, editing?.id ? 'Updated' : 'Line of business added');

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEditing({ ...BLANK_TYPE })}>
          Add a line of business
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {types.map((bt) => (
          <Card
            key={bt.id}
            title={
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ background: bt.color }} />
                {bt.name}
                {!bt.active && <Badge tone="amber">inactive</Badge>}
              </span>
            }
            subtitle={`${bt.shortCode} · ${bt.layout === 'SECTIONED' ? `grouped by ${bt.sectionLabel.toLowerCase()}` : 'single item list'}`}
            actions={
              <>
                <Button size="sm" variant="ghost" icon={<Workflow className="size-3.5" />} onClick={() => setStagesFor(bt)}>
                  Stages
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(bt)}>Edit</Button>
              </>
            }
          >
            {bt.description && <p className="mb-3 text-sm text-slate-600">{bt.description}</p>}
            <div className="flex flex-wrap gap-1.5">
              {(bt.stages ?? []).map((s) => (
                <Badge key={s.id} dot={s.color}>{s.name}</Badge>
              ))}
            </div>
            <div className="mt-3 flex gap-4 text-xs text-slate-500">
              <span>{bt._count?.quotations ?? 0} quotations</span>
              <span>{bt._count?.projects ?? 0} projects</span>
              <span>{bt._count?.catalogItems ?? 0} catalog items</span>
              {bt.enableBenchmark && <span className="text-brand-700">benchmark enabled</span>}
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        wide
        title={editing?.id ? 'Edit line of business' : 'New line of business'}
        description="Each line of business gets its own numbering series, pipeline, catalog and terms."
        footer={
          <>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              variant="primary"
              loading={busy}
              disabled={!editing?.name?.trim() || !editing?.key?.trim() || !editing?.shortCode?.trim()}
              onClick={save}
            >
              Save
            </Button>
          </>
        }
      >
        {editing && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required className="sm:col-span-2">
              <Input
                value={editing.name ?? ''}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    name: e.target.value,
                    ...(editing.id
                      ? {}
                      : {
                          key: e.target.value.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, ''),
                          shortCode: e.target.value.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase(),
                        }),
                  })
                }
                placeholder="Landscape & Outdoor"
              />
            </Field>
            <Field label="Key" required hint="Internal identifier, uppercase" >
              <Input
                value={editing.key ?? ''}
                disabled={!!editing.id}
                onChange={(e) => setEditing({ ...editing, key: e.target.value.toUpperCase() })}
                className="font-mono"
              />
            </Field>
            <Field label="Short code" required hint="Appears in document numbers, e.g. ZS/LND/26-27/001">
              <Input
                value={editing.shortCode ?? ''}
                onChange={(e) => setEditing({ ...editing, shortCode: e.target.value.toUpperCase().slice(0, 6) })}
                className="font-mono"
              />
            </Field>
            <Field label="Quote layout">
              <Select value={editing.layout ?? 'SECTIONED'} onChange={(e) => setEditing({ ...editing, layout: e.target.value as BusinessType['layout'] })}>
                <option value="SECTIONED">Grouped sections (rooms, areas, phases)</option>
                <option value="FLAT">Single flat item list</option>
              </Select>
            </Field>
            <Field label="Section label" hint="What a group is called — Room, Area, Phase, Group">
              <Input value={editing.sectionLabel ?? 'Section'} onChange={(e) => setEditing({ ...editing, sectionLabel: e.target.value })} />
            </Field>
            <Field label="Colour">
              <div className="flex gap-2">
                <input
                  type="color"
                  value={editing.color ?? '#16A34A'}
                  onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                  className="h-9 w-14 cursor-pointer rounded-lg border-0 bg-white p-1 ring-1 ring-slate-300"
                />
                <Input value={editing.color ?? ''} onChange={(e) => setEditing({ ...editing, color: e.target.value })} />
              </div>
            </Field>
            <Field label="Display order">
              <Input type="number" value={editing.order ?? 0} onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })} />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Textarea rows={2} value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </Field>
            <div className="flex gap-6 sm:col-span-2">
              <Checkbox label="Active" checked={editing.active ?? true} onChange={(v) => setEditing({ ...editing, active: v })} />
              <Checkbox
                label="Enable competitor benchmark"
                checked={editing.enableBenchmark ?? false}
                onChange={(v) => setEditing({ ...editing, enableBenchmark: v })}
              />
            </div>
            <Field label="Default terms for this line of business" className="sm:col-span-2">
              <Textarea rows={8} value={editing.defaultTerms ?? ''} onChange={(e) => setEditing({ ...editing, defaultTerms: e.target.value })} className="font-mono text-xs" />
            </Field>
          </div>
        )}
      </Modal>

      {stagesFor && <StageEditor businessType={stagesFor} onClose={() => setStagesFor(null)} onSaved={onSaved} />}
    </>
  );
}

function StageEditor({
  businessType, onClose, onSaved,
}: { businessType: BusinessType; onClose: () => void; onSaved: () => Promise<void> }) {
  const { run, busy } = useAction();
  const [stages, setStages] = useState<Partial<PipelineStage>[]>(businessType.stages ?? []);

  const save = () =>
    run(async () => {
      await api.put(`/business-types/${businessType.id}/stages`, {
        stages: stages.map((s) => ({
          id: s.id,
          name: s.name ?? '',
          color: s.color ?? '#64748B',
          isTerminal: !!s.isTerminal,
          isWon: !!s.isWon,
        })),
      });
      onClose();
      await onSaved();
    }, 'Pipeline updated');

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={`Pipeline — ${businessType.name}`}
      description="These are the lanes a converted opportunity moves through. A stage that projects currently sit in cannot be removed."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={busy} disabled={!stages.length} onClick={save}>Save pipeline</Button>
        </>
      }
    >
      <ul className="space-y-2">
        {stages.map((s, i) => (
          <li key={s.id ?? `new-${i}`} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2">
            <span className="w-6 text-center text-xs text-slate-400">{i + 1}</span>
            <input
              type="color"
              value={s.color ?? '#64748B'}
              onChange={(e) => setStages((list) => list.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)))}
              className="size-8 shrink-0 cursor-pointer rounded border-0 bg-white p-0.5 ring-1 ring-slate-300"
            />
            <Input
              value={s.name ?? ''}
              onChange={(e) => setStages((list) => list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
              placeholder="Stage name"
            />
            <label className="flex shrink-0 items-center gap-1.5 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={!!s.isTerminal}
                onChange={(e) => setStages((list) => list.map((x, j) => (j === i ? { ...x, isTerminal: e.target.checked } : x)))}
                className="size-3.5 rounded border-slate-300 text-brand-600"
              />
              final
            </label>
            <label className="flex shrink-0 items-center gap-1.5 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={!!s.isWon}
                onChange={(e) => setStages((list) => list.map((x, j) => (j === i ? { ...x, isWon: e.target.checked } : x)))}
                className="size-3.5 rounded border-slate-300 text-brand-600"
              />
              won
            </label>
            <div className="flex shrink-0 gap-0.5">
              <button
                onClick={() =>
                  setStages((list) => {
                    if (i === 0) return list;
                    const next = [...list];
                    [next[i - 1], next[i]] = [next[i], next[i - 1]];
                    return next;
                  })
                }
                className="rounded p-1 text-slate-400 hover:bg-white"
                title="Move up"
              >
                ↑
              </button>
              <button
                onClick={() =>
                  setStages((list) => {
                    if (i === list.length - 1) return list;
                    const next = [...list];
                    [next[i], next[i + 1]] = [next[i + 1], next[i]];
                    return next;
                  })
                }
                className="rounded p-1 text-slate-400 hover:bg-white"
                title="Move down"
              >
                ↓
              </button>
              <button
                onClick={() => setStages((list) => list.filter((_, j) => j !== i))}
                disabled={stages.length === 1}
                className="rounded p-1 text-red-400 hover:bg-white disabled:opacity-30"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <Button
        className="mt-3"
        size="sm"
        icon={<Plus className="size-3.5" />}
        onClick={() => setStages((list) => [...list, { name: '', color: '#64748B' }])}
      >
        Add stage
      </Button>
    </Modal>
  );
}

/* ---------------------------------- ai ---------------------------------- */

/* ---------------------------- share & transfer -------------------------- */

function TransferTab({ org, onSaved }: { org: Organization; onSaved: () => Promise<void> }) {
  const navigate = useNavigate();
  const { run, busy } = useAction();
  const [withCatalog, setWithCatalog] = useState(true);
  const [applied, setApplied] = useState<null | {
    organization: boolean; businessTypes: number; stages: number; catalogItems: number; logo: boolean;
  }>(null);

  const exportSetup = () =>
    run(async () => {
      const file = await api.get<unknown>(`/transfer/setup?catalog=${withCatalog ? '1' : '0'}`);
      downloadFile(`ZenStudios-setup-${stamp()}`, file);
    }, 'Setup file downloaded');

  const importSetup = () =>
    run(async () => {
      const picked = await pickTransferFile();
      if (!picked) return;
      const file = expectKind(picked, 'zenstudios.setup', 'setup file');
      const result = await api.post<typeof applied>('/transfer/setup', file);
      setApplied(result);
      await onSaved();
    }, 'Setup applied');

  const importQuotation = () =>
    run(async () => {
      const picked = await pickTransferFile();
      if (!picked) return;
      const file = expectKind(picked, 'zenstudios.quotation', 'quotation file');
      const created = await api.post<Quotation>('/transfer/quotation', file);
      navigate(`/quotations/${created.id}`);
    }, 'Quotation imported');

  return (
    <div className="space-y-5">
      <Card
        title="Set up a new team member"
        subtitle="Everything they need to start quoting, in one file"
      >
        <p className="mb-4 text-sm text-slate-600">
          The setup file carries your company identity, logo, lines of business with their pipeline
          stages, and — if you include it — your full rate card. A colleague installs ZenStudios,
          opens this <code className="rounded bg-slate-100 px-1 py-0.5 text-[0.8em]">.zns</code> file
          here, and their app is configured exactly like yours.
        </p>

        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">
            The file contains {org.legalName}&rsquo;s GSTIN, CIN, PAN and bank details, and the rate
            card includes your <strong>cost prices</strong>. Send it only to your own team.
          </p>
        </div>

        <Checkbox
          checked={withCatalog}
          onChange={setWithCatalog}
          label="Include the rate card (leave off to share only identity and pipeline setup)"
        />

        <div className="mt-4 flex flex-wrap gap-2.5">
          <Button variant="primary" icon={<Download className="size-4" />} disabled={busy} onClick={exportSetup}>
            Export setup file
          </Button>
          <Button icon={<Upload className="size-4" />} disabled={busy} onClick={importSetup}>
            Open a setup file
          </Button>
        </div>

        {applied && (
          <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3">
            <p className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-800">
              <Check className="size-4 text-brand-600" /> Setup applied
            </p>
            <ul className="space-y-0.5 text-sm text-slate-600">
              <li>Company details {applied.organization ? 'updated' : 'unchanged'}{applied.logo ? ', logo installed' : ''}</li>
              <li>{applied.businessTypes} line(s) of business added, with {applied.stages} pipeline stage(s)</li>
              <li>{applied.catalogItems} new catalog item(s) added</li>
            </ul>
            <p className="mt-2 text-xs text-slate-500">
              Existing catalog items and rates you had already were left untouched.
            </p>
          </div>
        )}
      </Card>

      <Card
        title="Receive a quotation from a colleague"
        subtitle="Open a quotation someone else exported"
      >
        <p className="mb-4 text-sm text-slate-600">
          Ask them to open the quotation and use <strong>Share as file</strong>, then send you the{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-[0.8em]">.zns</code> file. Opening it here
          creates a fresh draft under <em>your</em> quotation number, matched to the client by name,
          with GST recalculated against your own place of supply. Their document is untouched.
        </p>
        <Button icon={<Share2 className="size-4" />} disabled={busy} onClick={importQuotation}>
          Open a quotation file
        </Button>
      </Card>

      <Card title="Until you move to a shared server">
        <p className="text-sm text-slate-600">
          Each install keeps its own database, so these files are how work travels between machines
          today. Two people editing the same quotation will each hold their own copy — agree who owns
          a document before sharing it. When the app moves to a shared server this step disappears.
        </p>
      </Card>
    </div>
  );
}

function AiTab({ system, onSaved }: { system: ReturnType<typeof useApp>['system']; onSaved: () => Promise<void> }) {
  const { run, busy } = useAction();
  const [key, setKey] = useState('');

  const saveKey = () =>
    run(async () => {
      await api.put('/settings/system/ai-key', { key: key.trim() || null });
      setKey('');
      await onSaved();
    }, key.trim() ? 'API key saved' : 'API key removed');

  return (
    <div className="space-y-5">
      <Card title="Anthropic API key" subtitle="Powers the competitor-quotation analysis on the Market benchmark page">
        <div className="mb-4 flex items-center gap-2.5 rounded-lg bg-slate-50 px-4 py-3">
          {system?.aiEnabled ? (
            <>
              <Check className="size-4 text-brand-600" />
              <p className="text-sm text-slate-700">
                AI analysis is <span className="font-medium text-brand-700">enabled</span> — key loaded from{' '}
                {system.aiKeySource === 'env' ? 'the server environment (.env)' : 'local settings'}.
              </p>
            </>
          ) : (
            <>
              <Sparkles className="size-4 text-slate-400" />
              <p className="text-sm text-slate-600">
                No key configured. Uploads still work; analysis is skipped.
              </p>
            </>
          )}
        </div>

        <Field
          label="Paste your key"
          hint="Stored locally in data/secrets.json with owner-only permissions. An ANTHROPIC_API_KEY in server/.env takes precedence."
        >
          <div className="flex gap-2">
            <Input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-ant-…"
              className="font-mono"
            />
            <Button variant="primary" loading={busy} onClick={saveKey}>Save</Button>
          </div>
        </Field>

        {system?.aiKeySource === 'stored' && (
          <Button className="mt-3" size="sm" variant="ghost" onClick={() => { setKey(''); void saveKey(); }}>
            Remove stored key
          </Button>
        )}

        <p className="mt-4 text-xs text-slate-500">
          Get a key at{' '}
          <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">
            console.anthropic.com
          </a>
          . Analysis runs on Claude and costs a few cents per document.
        </p>
      </Card>

      <Card title="PDF engine">
        <div className="flex items-start gap-2.5">
          {system?.pdfEngine ? (
            <>
              <Check className="mt-0.5 size-4 text-brand-600" />
              <p className="text-sm text-slate-700">
                Ready. Quotations and invoices can be downloaded as A4 PDFs directly.
              </p>
            </>
          ) : (
            <>
              <Building2 className="mt-0.5 size-4 text-amber-600" />
              <div className="text-sm text-slate-700">
                <p>
                  Chromium is not installed, so direct PDF download is unavailable. The <b>Print view</b> button
                  still works — use your browser's “Save as PDF”.
                </p>
                <p className="mt-1.5 text-xs text-slate-500">
                  To enable it, run <code className="rounded bg-slate-100 px-1 py-0.5 font-mono">npx puppeteer browsers install chrome</code>{' '}
                  from the <code className="rounded bg-slate-100 px-1 py-0.5 font-mono">server</code> folder and restart.
                </p>
              </div>
            </>
          )}
        </div>
      </Card>

      <Card title="Where your data lives">
        <ul className="space-y-1.5 text-sm text-slate-600">
          <li><code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">data/app.db</code> — the whole database (SQLite)</li>
          <li><code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">data/uploads/</code> — attachments and competitor documents</li>
          <li><code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">data/branding/</code> — your logo</li>
          <li><code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">data/secrets.json</code> — the API key, if stored here</li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Back up the whole <code className="font-mono">data/</code> folder and you have backed up everything.
        </p>
      </Card>
    </div>
  );
}
