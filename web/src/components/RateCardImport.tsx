import { AlertTriangle, FileUp, Info, Sparkles } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useApp } from '../lib/app-context';
import { money } from '../lib/format';
import {
  Badge, Button, Checkbox, Field, Input, Modal, Select, Textarea, cx, useAction,
} from './ui';

type ParsedRow = {
  name: string;
  category: string | null;
  brand: string | null;
  sku: string | null;
  unit: string;
  defaultRate: number;
  costPrice: number;
  hsnSac: string | null;
  gstRate: number;
  specNote: string | null;
  unitWasNormalised: boolean;
  originalUnit: string;
  duplicateOf: { id: string; currentRate: number } | null;
};

type ParseResult = {
  items: ParsedRow[];
  sourceTitle: string | null;
  ratesIncludeGst: boolean | null;
  notes: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  fileName: string;
  pageCount: number | null;
};

type Row = ParsedRow & { include: boolean };

export function RateCardImport({
  open, onClose, businessTypeId, businessTypeName, onImported,
}: {
  open: boolean;
  onClose: () => void;
  businessTypeId: string;
  businessTypeName: string;
  onImported: () => void | Promise<void>;
}) {
  const { system } = useApp();
  const { run, busy } = useAction();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [hint, setHint] = useState('');
  const [result, setResult] = useState<ParseResult | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  const reset = () => {
    setFile(null);
    setHint('');
    setResult(null);
    setRows([]);
  };

  const close = () => {
    reset();
    onClose();
  };

  const parse = () =>
    run(async () => {
      if (!file) throw new Error('Choose a PDF or image first.');
      const body = new FormData();
      body.append('file', file);
      body.append('businessTypeId', businessTypeId);
      if (hint.trim()) body.append('hint', hint.trim());
      const parsed = await api.upload<ParseResult>('/catalog/parse-document', body);
      if (!parsed.items.length) throw new Error('No priced rows were found in that document.');
      setResult(parsed);
      // Existing items default to unticked so a re-import never duplicates silently.
      setRows(parsed.items.map((i) => ({ ...i, include: !i.duplicateOf })));
    }, 'Rate card read');

  const set = (index: number, patch: Partial<Row>) =>
    setRows((list) => list.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const selected = rows.filter((r) => r.include);
  const newRows = selected.filter((r) => !r.duplicateOf);
  const updateRows = selected.filter((r) => r.duplicateOf);
  const missingCost = selected.filter((r) => !r.costPrice).length;

  const commit = () =>
    run(async () => {
      if (newRows.length) {
        await api.post('/catalog/bulk', {
          items: newRows.map((r) => ({
            businessTypeId,
            name: r.name,
            sku: r.sku,
            brand: r.brand,
            category: r.category,
            unit: r.unit,
            defaultRate: r.defaultRate,
            costPrice: r.costPrice,
            hsnSac: r.hsnSac,
            gstRate: r.gstRate,
            specNote: r.specNote,
          })),
        });
      }
      if (updateRows.length) {
        await api.post('/catalog/bulk-update-rates', {
          updates: updateRows.map((r) => ({
            id: r.duplicateOf!.id,
            defaultRate: r.defaultRate,
            costPrice: r.costPrice,
            specNote: r.specNote,
          })),
        });
      }
      await onImported();
      close();
    }, `${newRows.length} added, ${updateRows.length} updated`);

  /* ------------------------------ upload step ----------------------------- */

  if (!result) {
    return (
      <Modal
        open={open}
        onClose={close}
        wide
        title="Import a rate card"
        description={`Read a PDF or photo of your rate card into the ${businessTypeName} catalog. You review every row before anything is saved.`}
        footer={
          <>
            <Button onClick={close}>Cancel</Button>
            <Button
              variant="primary"
              loading={busy}
              disabled={!file || !system?.aiEnabled}
              onClick={parse}
              icon={<Sparkles className="size-4" />}
            >
              Read the document
            </Button>
          </>
        }
      >
        {!system?.aiEnabled && (
          <div className="mb-4 flex items-start gap-3 rounded-lg bg-amber-50 px-4 py-3 text-sm ring-1 ring-amber-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <p className="text-amber-800">
              Reading a PDF needs an Anthropic API key — add one in{' '}
              <Link to="/settings" className="font-medium underline" onClick={close}>Settings</Link>. Until
              then, use <b>Import CSV</b>, which needs no key.
            </p>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept=".pdf,image/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center transition hover:border-brand-400 hover:bg-brand-50/40"
        >
          <FileUp className="mx-auto size-6 text-slate-400" />
          <p className="mt-2 text-sm font-medium text-slate-700">
            {file ? file.name : 'Choose a rate card PDF, or a photo of one'}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">PDF, PNG or JPG · up to 25 MB</p>
        </button>

        <Field
          label="Anything the document does not say?"
          hint="Optional. e.g. “rates are per running foot”, “ignore the labour column”, “these are GST-inclusive”."
          className="mt-4"
        >
          <Textarea rows={2} value={hint} onChange={(e) => setHint(e.target.value)} />
        </Field>

        <p className="mt-4 flex items-start gap-2 text-xs text-slate-500">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          Prices are transcribed exactly as printed — nothing is converted or adjusted. A long rate card
          can take up to a minute.
        </p>
      </Modal>
    );
  }

  /* ------------------------------ review step ----------------------------- */

  return (
    <Modal
      open={open}
      onClose={close}
      wide
      title="Review before importing"
      description={`${rows.length} row(s) read from ${result.fileName}. Edit anything that came through wrong — nothing is saved until you import.`}
      footer={
        <>
          <Button onClick={reset}>Back</Button>
          <div className="flex-1" />
          <span className="self-center text-xs text-slate-500">
            {newRows.length} new · {updateRows.length} rate update(s)
          </span>
          <Button variant="primary" loading={busy} disabled={!selected.length} onClick={commit}>
            Import {selected.length} row(s)
          </Button>
        </>
      }
    >
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={result.confidence === 'HIGH' ? 'green' : result.confidence === 'MEDIUM' ? 'amber' : 'red'}>
            {result.confidence.toLowerCase()} confidence
          </Badge>
          {result.pageCount && <Badge>{result.pageCount} page(s)</Badge>}
          {result.ratesIncludeGst === true && <Badge tone="amber">rates stated GST-inclusive</Badge>}
          {result.ratesIncludeGst === false && <Badge tone="blue">rates stated GST-exclusive</Badge>}
        </div>
        {result.notes && <p className="text-xs text-slate-600">{result.notes}</p>}

        {result.ratesIncludeGst === true && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs ring-1 ring-amber-200">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
            <p className="text-amber-800">
              This document says its rates already include GST. Your catalog rates should be
              <b> exclusive</b> of GST, since tax is added on the quotation. Divide these down before
              importing, or import and correct them after.
            </p>
          </div>
        )}

        {missingCost > 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs ring-1 ring-slate-200">
            <Info className="mt-0.5 size-3.5 shrink-0 text-slate-500" />
            <p className="text-slate-600">
              {missingCost} of the selected rows have no cost price, so they will show 100% margin
              until you fill it in. Rate cards rarely print cost — add it here or on the catalog later.
            </p>
          </div>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-4 border-y border-slate-100 py-2">
        <Checkbox
          label="Select all"
          checked={rows.every((r) => r.include)}
          onChange={(v) => setRows((list) => list.map((r) => ({ ...r, include: v })))}
        />
        <Checkbox
          label="Only rows not already in the catalog"
          checked={rows.every((r) => r.include === !r.duplicateOf)}
          onChange={() => setRows((list) => list.map((r) => ({ ...r, include: !r.duplicateOf })))}
        />
      </div>

      <div className="space-y-2">
        {rows.map((row, i) => (
          <div
            key={i}
            className={cx(
              'rounded-lg p-3 ring-1 transition',
              row.include ? 'bg-white ring-slate-200' : 'bg-slate-50 ring-transparent opacity-60',
            )}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={row.include}
                onChange={(e) => set(i, { include: e.target.checked })}
                className="mt-2 size-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={row.name}
                    onChange={(e) => set(i, { name: e.target.value })}
                    className="min-w-[200px] flex-1 font-medium"
                  />
                  {row.duplicateOf && (
                    <Badge tone="amber">
                      exists at {money(row.duplicateOf.currentRate)} — will update
                    </Badge>
                  )}
                  {row.unitWasNormalised && <Badge tone="blue">unit “{row.originalUnit}” → {row.unit}</Badge>}
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
                  <label className="col-span-2 sm:col-span-2">
                    <span className="mb-1 block text-[11px] text-slate-500">Category</span>
                    <Input
                      value={row.category ?? ''}
                      onChange={(e) => set(i, { category: e.target.value })}
                      className="h-8 py-1 text-xs"
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-[11px] text-slate-500">Unit</span>
                    <Select
                      value={row.unit}
                      onChange={(e) => set(i, { unit: e.target.value })}
                      className="h-8 py-1 text-xs"
                    >
                      {['Sq.ft', 'R.ft', 'Nos', 'Set', 'Lump sum', 'Sq.mt', 'Kg', 'Litre', 'Hour', 'Day', 'Month'].map(
                        (u) => (
                          <option key={u} value={u}>{u}</option>
                        ),
                      )}
                    </Select>
                  </label>
                  <label>
                    <span className="mb-1 block text-[11px] text-slate-500">Rate</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={row.defaultRate}
                      onChange={(e) => set(i, { defaultRate: Number(e.target.value) })}
                      className={cx('h-8 py-1 text-right text-xs', !row.defaultRate && 'ring-amber-400')}
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-[11px] text-slate-500">Cost</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={row.costPrice}
                      onChange={(e) => set(i, { costPrice: Number(e.target.value) })}
                      className="h-8 py-1 text-right text-xs"
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-[11px] text-slate-500">GST %</span>
                    <Input
                      type="number"
                      step="0.5"
                      value={row.gstRate}
                      onChange={(e) => set(i, { gstRate: Number(e.target.value) })}
                      className="h-8 py-1 text-right text-xs"
                    />
                  </label>
                </div>

                {(row.specNote || row.hsnSac || row.brand || row.sku) && (
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                    <Input
                      value={row.specNote ?? ''}
                      onChange={(e) => set(i, { specNote: e.target.value })}
                      placeholder="Specification"
                      className="h-8 py-1 text-xs text-slate-600"
                    />
                    <Input
                      value={row.hsnSac ?? ''}
                      onChange={(e) => set(i, { hsnSac: e.target.value })}
                      placeholder="HSN/SAC"
                      className="h-8 w-28 py-1 text-xs"
                    />
                    <Input
                      value={row.brand ?? ''}
                      onChange={(e) => set(i, { brand: e.target.value })}
                      placeholder="Brand"
                      className="h-8 w-32 py-1 text-xs"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
