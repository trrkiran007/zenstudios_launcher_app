import {
  AlertCircle, ArrowLeft, ChevronDown, ChevronUp, Layers, PackagePlus, Plus, RotateCcw, Save, Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CatalogPicker } from '../components/CatalogPicker';
import { ClientPicker } from '../components/ClientPicker';
import {
  Button, Card, Field, Input, Loading, Select, Textarea, cx, useAction,
} from '../components/ui';
import { api, useApi } from '../lib/api';
import { useActiveBusinessTypes, useApp } from '../lib/app-context';
import { dateInput, money, pct } from '../lib/format';
import { agoLabel, clearDraft, draftKey, readDraft, saveDraft } from '../lib/draft-store';
import { HARDWARE_PREFIX, hardwareLineFor, isHardwareLine, resolveRate } from '../lib/spec-pricing';
import { computeTotals, lineAmount } from '../lib/totals';
import type { CatalogItem, Client, Quotation, QuotationItem, QuotationSection, SpecTiers } from '../lib/types';

const blankItem = (): QuotationItem => ({
  description: '', specNote: '', hsnSac: '', unit: 'Nos',
  quantity: 1, rate: 0, costPrice: 0, discountPct: 0, gstRate: 18,
});

const blankSection = (name: string): QuotationSection => ({ name, notes: '', items: [blankItem()] });

/**
 * What the first section of a new quote is called. A store fit-out does not
 * start with a "Living Room"; anything without an entry here starts unnamed and
 * relies on the placeholder.
 */
const STARTER_SECTION: Record<string, string> = {
  INTERIOR: 'Living Room',
  RETAIL_BRANDING: 'Facade & Signage',
};

const starterSectionName = (bt: { key: string; layout: string }) =>
  bt.layout === 'FLAT' ? 'Products' : (STARTER_SECTION[bt.key] ?? '');

type Draft = {
  businessTypeId: string;
  clientId: string;
  title: string;
  quoteDate: string;
  validUntil: string;
  taxMode: 'FULL_GST' | 'FLAT';
  showTaxBreakup: boolean;
  priceDisplay: 'DETAILED' | 'AMOUNT_ONLY' | 'SECTION_ONLY';
  thicknessMm: number;
  woodTierId: string;
  laminateTierId: string;
  hardwareTierId: string;
  flatGstRate: number;
  placeOfSupplyState: string;
  placeOfSupplyCode: string;
  discountType: 'NONE' | 'PERCENT' | 'AMOUNT';
  discountValue: number;
  notes: string;
  termsText: string;
  sections: QuotationSection[];
};

export function QuotationEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { org, units, states } = useApp();
  const businessTypes = useActiveBusinessTypes();
  const { run, busy } = useAction();

  const { data: existing, loading } = useApi<Quotation>(id ? `/quotations/${id}` : null, [id]);
  // Only interiors is tiered and there are fifteen rows, so fetch the lot.
  const { data: tiers } = useApi<SpecTiers>('/spec-tiers');
  // Needed to re-price existing lines when the specification changes: a line
  // stores its rate, not the rule that produced it.
  const { data: catalog } = useApi<CatalogItem[]>('/catalog');

  const [draft, setDraft] = useState<Draft | null>(null);
  const [picking, setPicking] = useState<number | null>(null);
  const [clientKey, setClientKey] = useState(0);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [recovered, setRecovered] = useState<number | null>(null);

  const storeKey = draftKey(id);
  // Set once the editor has real content, so autosave never runs on the blank
  // template and never fires again after a successful save.
  const dirty = useRef(false);
  const saved = useRef(false);
  // Snapshot of the draft as first loaded. Autosave only fires once the draft
  // differs from it, so simply opening a quotation never creates a "recovery".
  const baseline = useRef<string | null>(null);

  /** The draft exactly as the server holds it — the baseline for an edit. */
  const fromServer = (q: Quotation): Draft => ({
    businessTypeId: q.businessTypeId,
    clientId: q.clientId,
    title: q.title,
    quoteDate: dateInput(q.quoteDate),
    validUntil: dateInput(q.validUntil),
    taxMode: q.taxMode,
    showTaxBreakup: q.showTaxBreakup ?? true,
    priceDisplay: q.priceDisplay ?? 'DETAILED',
    thicknessMm: q.thicknessMm ?? 16,
    woodTierId: q.woodTierId ?? '',
    laminateTierId: q.laminateTierId ?? '',
    hardwareTierId: q.hardwareTierId ?? '',
    flatGstRate: q.flatGstRate,
    placeOfSupplyState: q.placeOfSupplyState ?? '',
    placeOfSupplyCode: q.placeOfSupplyCode ?? '',
    discountType: q.discountType,
    discountValue: q.discountValue,
    notes: q.notes ?? '',
    termsText: q.termsText ?? '',
    sections: (q.sections ?? []).map((sec) => ({
      name: sec.name,
      notes: sec.notes ?? '',
      items: sec.items.map((i) => ({ ...i })),
    })),
  });

  // Seed a new draft, or hydrate from the record being edited.
  useEffect(() => {
    if (id) {
      if (!existing) return;
      // Unsaved edits from a previous visit win over the stored record.
      const held = readDraft<Draft, Client>(storeKey);
      if (held) {
        setDraft(held.draft);
        setSelectedClient(held.client ?? existing.client ?? null);
        setRecovered(held.savedAt);
        dirty.current = true;
        return;
      }
      const server = fromServer(existing);
      baseline.current = JSON.stringify(server);
      setDraft({
        businessTypeId: existing.businessTypeId,
        clientId: existing.clientId,
        title: existing.title,
        quoteDate: dateInput(existing.quoteDate),
        validUntil: dateInput(existing.validUntil),
        taxMode: existing.taxMode,
        showTaxBreakup: existing.showTaxBreakup ?? true,
        priceDisplay: existing.priceDisplay ?? 'DETAILED',
        thicknessMm: existing.thicknessMm ?? 16,
        woodTierId: existing.woodTierId ?? '',
        laminateTierId: existing.laminateTierId ?? '',
        hardwareTierId: existing.hardwareTierId ?? '',
        flatGstRate: existing.flatGstRate,
        placeOfSupplyState: existing.placeOfSupplyState ?? '',
        placeOfSupplyCode: existing.placeOfSupplyCode ?? '',
        discountType: existing.discountType,
        discountValue: existing.discountValue,
        notes: existing.notes ?? '',
        termsText: existing.termsText ?? '',
        sections: (existing.sections ?? []).map((s) => ({
          name: s.name,
          notes: s.notes ?? '',
          items: s.items.map((i) => ({ ...i })),
        })),
      });
      setSelectedClient(existing.client ?? null);
      return;
    }

    const first = businessTypes[0];
    if (!first || draft) return;

    // Unsaved work from a previous visit takes precedence over a blank form.
    const stored = readDraft<Draft, Client>(storeKey);
    if (stored) {
      setDraft(stored.draft);
      setSelectedClient(stored.client);
      setRecovered(stored.savedAt);
      dirty.current = true;
      return;
    }

    const today = new Date();
    const blank: Draft = {
      businessTypeId: first.id,
      clientId: '',
      title: '',
      quoteDate: dateInput(today),
      validUntil: dateInput(new Date(today.getTime() + (org?.defaultValidityDays ?? 15) * 86400000)),
      taxMode: 'FULL_GST',
      showTaxBreakup: true,
      priceDisplay: 'DETAILED',
      thicknessMm: 16,
      woodTierId: '',
      laminateTierId: '',
      hardwareTierId: '',
      flatGstRate: 18,
      placeOfSupplyState: '',
      placeOfSupplyCode: '',
      discountType: 'NONE',
      discountValue: 0,
      notes: '',
      termsText: first.defaultTerms ?? org?.defaultTerms ?? '',
      sections: [blankSection(starterSectionName(first))],
    };
    baseline.current = JSON.stringify(blank);
    setDraft(blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, existing, businessTypes, org]);

  // Mirror every edit into localStorage, debounced, so nothing is lost to a
  // reload, a crash or a mis-click. Cleared the moment the server accepts it.
  useEffect(() => {
    if (!draft || saved.current) return;
    if (baseline.current !== null && JSON.stringify(draft) === baseline.current) return;
    dirty.current = true;
    const t = setTimeout(() => saveDraft(storeKey, draft, selectedClient), 600);
    return () => clearTimeout(t);
  }, [draft, selectedClient, storeKey]);

  // Last line of defence: warn before the window closes on unsaved work.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty.current || saved.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const businessType = businessTypes.find((b) => b.id === draft?.businessTypeId);
  const sectioned = businessType?.layout !== 'FLAT';
  const sectionLabel = businessType?.sectionLabel ?? 'Section';

  const totals = useMemo(
    () =>
      draft
        ? computeTotals({
            sections: draft.sections,
            taxMode: draft.taxMode,
            flatGstRate: draft.flatGstRate,
            discountType: draft.discountType,
            discountValue: draft.discountValue,
            supplierStateCode: org?.stateCode,
            placeOfSupplyCode: draft.placeOfSupplyCode || selectedClient?.stateCode,
          })
        : null,
    [draft, org, selectedClient],
  );

  if (loading || !draft || !totals) return <Loading />;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const specOf = (d: Draft) => ({
    thicknessMm: d.thicknessMm,
    wood: tiers?.wood.find((t) => t.id === d.woodTierId),
    laminate: tiers?.laminate.find((t) => t.id === d.laminateTierId),
    hardware: tiers?.hardware.find((t) => t.id === d.hardwareTierId),
    rates: tiers?.hardwareRates,
  });

  /**
   * Change a specification setting and re-price the lines it governs.
   *
   * A line stores its rate, not the rule that produced it, so "was this edited
   * by hand?" is answered by asking what the *previous* specification would
   * have produced. If the line still matches that, it was untouched and is
   * safe to re-price; if it does not, someone typed over it and it is left
   * exactly as they left it.
   */
  const setSpec = (patch: Partial<Draft>) =>
    setDraft((d) => {
      if (!d) return d;
      const next = { ...d, ...patch };
      if (!tiers || !catalog) return next;

      const before = specOf(d);
      const after = specOf(next);
      const hardwareChanged = d.hardwareTierId !== next.hardwareTierId;
      const itemOf = (id?: string | null) => (id ? catalog.find((c) => c.id === id) : undefined);
      const same = (a: number, b: number) => Math.abs(a - b) < 0.01;

      /*
       * Rows are edited in place — never added, never removed. A quotation can
       * hold hand-written lines and hardware rows the designer typed, and
       * rebuilding the list would quietly drop whatever could not be matched
       * back to a catalogue item. Hardware rows are added when an item is
       * picked from the rate card, and only there.
       */
      const sections = next.sections.map((section) => ({
        ...section,
        items: section.items.map((line) => {
          if (isHardwareLine(line)) {
            // Hardware answers to the hardware dial alone: board grade,
            // thickness and laminate say nothing about hinges.
            if (!hardwareChanged || !after.hardware) return line;
            const ratio = (after.hardware.multiplier || 1) / (before.hardware?.multiplier || 1);
            return {
              ...line,
              description: `${HARDWARE_PREFIX} — ${after.hardware.name}`,
              specNote: after.hardware.specNote ?? line.specNote,
              rate: Math.round(line.rate * ratio * 100) / 100,
              costPrice: Math.round(line.costPrice * ratio * 100) / 100,
            };
          }

          const item = itemOf(line.catalogItemId);
          if (!item?.carcassBuilt) return line;
          const was = resolveRate(item, before);
          if (!same(line.rate, was.rate)) return line; // typed over by hand
          const now = resolveRate(item, after);
          return { ...line, rate: now.rate, costPrice: now.cost };
        }),
      }));

      return { ...next, sections };
    });

  const mutateSection = (index: number, patch: Partial<QuotationSection>) =>
    setDraft((d) =>
      d ? { ...d, sections: d.sections.map((s, i) => (i === index ? { ...s, ...patch } : s)) } : d,
    );

  const mutateItem = (si: number, ii: number, patch: Partial<QuotationItem>) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            sections: d.sections.map((s, i) =>
              i === si ? { ...s, items: s.items.map((it, j) => (j === ii ? { ...it, ...patch } : it)) } : s,
            ),
          }
        : d,
    );

  const moveSection = (index: number, delta: number) =>
    setDraft((d) => {
      if (!d) return d;
      const next = [...d.sections];
      const target = index + delta;
      if (target < 0 || target >= next.length) return d;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...d, sections: next };
    });

  const woodTier = tiers?.wood.find((t) => t.id === draft.woodTierId);
  const laminateTier = tiers?.laminate.find((t) => t.id === draft.laminateTierId);
  const hardwareTier = tiers?.hardware.find((t) => t.id === draft.hardwareTierId);
  const specSummary = [
    woodTier && `${woodTier.name} ${draft.thicknessMm}mm`,
    laminateTier?.name,
    hardwareTier && `${hardwareTier.name} hardware`,
  ]
    .filter(Boolean)
    .join(' · ');

  /**
   * Exactly what is still needed before this can be saved. Shown next to the
   * button — a greyed-out control with no explanation is not an explanation.
   */
  const missing: string[] = [];
  if (!draft.clientId) missing.push('a client');
  if (!draft.title.trim()) missing.push('a title');
  if (!draft.sections.some((s) => s.items.some((i) => i.description.trim())))
    missing.push('at least one line with a description');
  const canSave = missing.length === 0;

  const discardRecovered = () => {
    clearDraft(storeKey);
    setRecovered(null);
    dirty.current = false;
    if (id && existing) {
      const server = fromServer(existing);
      baseline.current = JSON.stringify(server);
      setDraft(server);
      setSelectedClient(existing.client ?? null);
    } else {
      baseline.current = null;
      setDraft(null);
      setSelectedClient(null);
    }
  };

  const save = () =>
    run(async () => {
      const payload = {
        ...draft,
        discountValue: Number(draft.discountValue) || 0,
        flatGstRate: Number(draft.flatGstRate) || 0,
        sections: draft.sections
          .map((s) => ({
            name: s.name.trim() || sectionLabel,
            notes: s.notes || null,
            items: s.items
              .filter((i) => i.description.trim())
              .map((i) => ({
                catalogItemId: i.catalogItemId ?? null,
                description: i.description.trim(),
                specNote: i.specNote || null,
                hsnSac: i.hsnSac || null,
                unit: i.unit || 'Nos',
                quantity: Number(i.quantity) || 0,
                rate: Number(i.rate) || 0,
                costPrice: Number(i.costPrice) || 0,
                discountPct: Number(i.discountPct) || 0,
                gstRate: Number(i.gstRate) || 0,
              })),
          }))
          .filter((s) => s.items.length),
      };

      const record = id
        ? await api.put<Quotation>(`/quotations/${id}`, payload)
        : await api.post<Quotation>('/quotations', payload);
      // The server has it now — drop the local copy so it cannot be offered back.
      saved.current = true;
      clearDraft(storeKey);
      navigate(`/quotations/${record.id}`);
    }, id ? 'Quotation updated' : 'Quotation created');

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" icon={<ArrowLeft className="size-4" />} onClick={() => navigate(-1)} />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {id ? `Edit ${existing?.number ?? 'quotation'}` : 'New quotation'}
            </h1>
            <p className="text-sm text-slate-500">
              {businessType?.name}
              {existing?.version && existing.version > 1 ? ` · revision v${existing.version}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!canSave && (
            <p className="flex items-center gap-1.5 text-sm text-amber-700">
              <AlertCircle className="size-4 shrink-0" />
              <span>
                Add {missing.slice(0, -1).join(', ')}
                {missing.length > 1 ? ' and ' : ''}
                {missing[missing.length - 1]} to save
              </span>
            </p>
          )}
          <Button variant="primary" icon={<Save className="size-4" />} loading={busy} disabled={!canSave} onClick={save}>
            {id ? 'Save changes' : 'Create quotation'}
          </Button>
        </div>
      </div>

      {recovered !== null && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-brand-900">
            <RotateCcw className="size-4 shrink-0" />
            <span>
              Restored unsaved changes from <strong>{agoLabel(recovered)}</strong>. They are held on
              this Mac only until you save.
            </span>
          </p>
          <Button size="sm" onClick={discardRecovered}>
            {id ? 'Discard and reload saved version' : 'Start fresh'}
          </Button>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          <Card title="Details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Line of business" required>
                <Select
                  value={draft.businessTypeId}
                  disabled={!!id}
                  onChange={(e) => {
                    const bt = businessTypes.find((b) => b.id === e.target.value)!;
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            businessTypeId: bt.id,
                            termsText: bt.defaultTerms ?? org?.defaultTerms ?? '',
                            sections:
                              bt.layout === 'FLAT'
                                ? [{ name: 'Products', notes: '', items: d.sections.flatMap((s) => s.items) }]
                                : d.sections.map((s, i) =>
                                    // Retitle only an untouched starter section.
                                    i === 0 && (!s.name || Object.values(STARTER_SECTION).includes(s.name))
                                      ? { ...s, name: starterSectionName(bt) }
                                      : s,
                                  ),
                          }
                        : d,
                    );
                  }}
                >
                  {businessTypes.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Client" required>
                <ClientPicker
                  value={draft.clientId}
                  refreshKey={clientKey}
                  onChange={(c) => {
                    setSelectedClient(c);
                    setClientKey((k) => k + 1);
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            clientId: c.id,
                            placeOfSupplyCode: c.stateCode ?? d.placeOfSupplyCode,
                            placeOfSupplyState: c.state ?? d.placeOfSupplyState,
                          }
                        : d,
                    );
                  }}
                />
              </Field>

              <Field label="Title / subject" required className="sm:col-span-2">
                <Input
                  value={draft.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder={
                    sectioned
                      ? 'Interior fit-out for 3BHK, Kokapet — design, manufacture & installation'
                      : 'Supply of workstations and seating — Phase 1'
                  }
                />
              </Field>

              <Field label="Quotation date">
                <Input type="date" value={draft.quoteDate} onChange={(e) => set('quoteDate', e.target.value)} />
              </Field>
              <Field label="Valid until">
                <Input type="date" value={draft.validUntil} onChange={(e) => set('validUntil', e.target.value)} />
              </Field>

              <Field label="Tax mode" hint={draft.taxMode === 'FLAT' ? 'One rate on the whole quote' : 'Per-line HSN/SAC and GST rate'}>
                <Select value={draft.taxMode} onChange={(e) => set('taxMode', e.target.value as Draft['taxMode'])}>
                  <option value="FULL_GST">Full GST — per line</option>
                  <option value="FLAT">Flat rate — whole quote</option>
                </Select>
              </Field>

              {!!tiers?.wood.length && (
                <>
                  <div className="sm:col-span-2 mt-1 border-t border-slate-100 pt-4">
                    <p className="text-[13px] font-medium text-slate-800">Specification</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Priced across the whole quotation. Line rates stay editable afterwards.
                    </p>
                  </div>

                  <Field label="Board grade" hint={woodTier?.brands ?? undefined}>
                    <Select value={draft.woodTierId} onChange={(e) => setSpec({ woodTierId: e.target.value })}>
                      <option value="">Rate card default</option>
                      {tiers.wood.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                          {t.rateDelta ? `  (${t.rateDelta > 0 ? '+' : ''}${money(t.rateDelta)}/sq.ft)` : ''}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Board thickness" hint="Laminated both faces, so 16mm finishes at 18–19mm">
                    <Select
                      value={String(draft.thicknessMm)}
                      onChange={(e) => setSpec({ thicknessMm: Number(e.target.value) })}
                    >
                      <option value="16">16 mm</option>
                      <option value="19">19 mm</option>
                    </Select>
                  </Field>

                  <Field label="Laminate grade" hint={laminateTier?.brands ?? 'Applies to laminate-finish items only'}>
                    <Select value={draft.laminateTierId} onChange={(e) => setSpec({ laminateTierId: e.target.value })}>
                      <option value="">Rate card default</option>
                      {tiers.laminate.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                          {t.rateDelta ? `  (${t.rateDelta > 0 ? '+' : ''}${money(t.rateDelta)}/sq.ft)` : ''}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Hardware" hint={hardwareTier?.brands ?? 'Printed as one line per cabinet'}>
                    <Select value={draft.hardwareTierId} onChange={(e) => setSpec({ hardwareTierId: e.target.value })}>
                      <option value="">No hardware line</option>
                      {tiers.hardware.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                          {t.multiplier !== 1 ? `  (×${t.multiplier})` : ''}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  {specSummary && (
                    <p className="sm:col-span-2 -mt-1 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-900">
                      <strong>Quoted as:</strong> {specSummary}. Changing any of these re-prices the
                      cabinet lines; anything you have typed over by hand stays as you left it.
                    </p>
                  )}
                </>
              )}

              <Field label="Pricing detail on the client's copy">
                <Select
                  value={draft.priceDisplay}
                  onChange={(e) => set('priceDisplay', e.target.value as Draft['priceDisplay'])}
                >
                  <option value="DETAILED">Full — unit, quantity, rate and amount</option>
                  <option value="AMOUNT_ONLY">Amount only — no rate or quantity</option>
                  <option value="SECTION_ONLY">Room totals only — no line amounts</option>
                </Select>
              </Field>

              <Field label="Show GST on the client's copy">
                <Select
                  value={draft.showTaxBreakup ? 'SHOW' : 'HIDE'}
                  onChange={(e) => set('showTaxBreakup', e.target.value === 'SHOW')}
                >
                  <option value="SHOW">Show — prints the tax and the total including GST</option>
                  <option value="HIDE">Hide — prints the pre-GST total, GST noted as extra</option>
                </Select>
              </Field>
              <p className="-mt-1 text-xs text-slate-500 sm:col-span-2">
                {draft.showTaxBreakup
                  ? 'The GST% column, the rate-wise summary and the grand total including GST all print.'
                  : 'The GST% and HSN/SAC columns come off, and the document ends at Total before GST with "GST — Extra, as applicable". Your own totals and margin are unaffected, and tax invoices always show GST regardless.'}
              </p>

              {draft.taxMode === 'FLAT' ? (
                <Field label="Flat GST rate (%)">
                  <Input
                    type="number"
                    step="0.5"
                    value={draft.flatGstRate}
                    onChange={(e) => set('flatGstRate', Number(e.target.value))}
                  />
                </Field>
              ) : (
                <Field
                  label="Place of supply"
                  hint={
                    totals.isIntraState
                      ? 'Same state as you → CGST + SGST'
                      : 'Different state → IGST'
                  }
                >
                  <Select
                    value={draft.placeOfSupplyCode}
                    onChange={(e) => {
                      const s = states.find((x) => x.code === e.target.value);
                      setDraft((d) =>
                        d ? { ...d, placeOfSupplyCode: e.target.value, placeOfSupplyState: s?.name ?? '' } : d,
                      );
                    }}
                  >
                    <option value="">Use client's state</option>
                    {states.map((s) => (
                      <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>
          </Card>

          {draft.sections.map((section, si) => {
            const sectionTotal = section.items.reduce((a, i) => a + lineAmount(i), 0);
            return (
              <Card
                key={si}
                padded={false}
                title={
                  sectioned ? (
                    <div className="flex items-center gap-2">
                      <Layers className="size-4 text-slate-400" />
                      <input
                        value={section.name}
                        onChange={(e) => mutateSection(si, { name: e.target.value })}
                        placeholder={`${sectionLabel} name`}
                        className="w-56 rounded border-0 bg-transparent px-1 py-0.5 text-sm font-semibold focus:bg-slate-50 focus:ring-1 focus:ring-brand-500 focus:outline-none"
                      />
                    </div>
                  ) : (
                    'Line items'
                  )
                }
                subtitle={`${section.items.length} line(s) · ${money(sectionTotal)}`}
                actions={
                  <>
                    <Button
                      size="sm"
                      icon={<PackagePlus className="size-3.5" />}
                      onClick={() => setPicking(si)}
                    >
                      Catalog
                    </Button>
                    {sectioned && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => moveSection(si, -1)} disabled={si === 0} title="Move up">
                          <ChevronUp className="size-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => moveSection(si, 1)} disabled={si === draft.sections.length - 1} title="Move down">
                          <ChevronDown className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={draft.sections.length === 1}
                          onClick={() => set('sections', draft.sections.filter((_, i) => i !== si))}
                          title={`Remove ${sectionLabel.toLowerCase()}`}
                        >
                          <Trash2 className="size-3.5 text-red-500" />
                        </Button>
                      </>
                    )}
                  </>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-sm">
                    <thead>
                      <tr className="text-[11px] tracking-wide text-slate-500 uppercase">
                        <th className="w-8 px-3 py-2 text-left font-semibold">#</th>
                        <th className="px-3 py-2 text-left font-semibold">Description</th>
                        {draft.taxMode === 'FULL_GST' && <th className="w-24 px-2 py-2 text-left font-semibold">HSN/SAC</th>}
                        <th className="w-28 px-2 py-2 text-left font-semibold">Unit</th>
                        <th className="w-20 px-2 py-2 text-right font-semibold">Qty</th>
                        <th className="w-28 px-2 py-2 text-right font-semibold">Rate</th>
                        <th className="w-28 px-2 py-2 text-right font-semibold">Cost</th>
                        <th className="w-16 px-2 py-2 text-right font-semibold">Disc%</th>
                        {draft.taxMode === 'FULL_GST' && <th className="w-16 px-2 py-2 text-right font-semibold">GST%</th>}
                        <th className="w-28 px-3 py-2 text-right font-semibold">Amount</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {section.items.map((item, ii) => {
                        const amount = lineAmount(item);
                        const margin = amount > 0 ? ((amount - item.costPrice * item.quantity) / amount) * 100 : 0;
                        return (
                          <tr key={ii} className="border-t border-slate-100 align-top">
                            <td className="px-3 py-2 text-xs text-slate-400">{ii + 1}</td>
                            <td className="px-3 py-2">
                              <input
                                value={item.description}
                                onChange={(e) => mutateItem(si, ii, { description: e.target.value })}
                                placeholder="Item description"
                                className="w-full rounded border-0 bg-transparent px-1.5 py-1 text-sm font-medium focus:bg-white focus:ring-1 focus:ring-brand-500 focus:outline-none"
                              />
                              <input
                                value={item.specNote ?? ''}
                                onChange={(e) => mutateItem(si, ii, { specNote: e.target.value })}
                                placeholder="Specification — material, brand, finish, hardware"
                                className="mt-0.5 w-full rounded border-0 bg-transparent px-1.5 py-1 text-xs text-slate-500 focus:bg-white focus:ring-1 focus:ring-brand-500 focus:outline-none"
                              />
                            </td>
                            {draft.taxMode === 'FULL_GST' && (
                              <td className="px-2 py-2">
                                <CellInput value={item.hsnSac ?? ''} onChange={(v) => mutateItem(si, ii, { hsnSac: v })} />
                              </td>
                            )}
                            <td className="px-2 py-2">
                              <select
                                value={item.unit}
                                onChange={(e) => mutateItem(si, ii, { unit: e.target.value })}
                                className="w-full rounded border-0 bg-transparent px-1.5 py-1 text-sm focus:bg-white focus:ring-1 focus:ring-brand-500 focus:outline-none"
                              >
                                {[...new Set([item.unit, ...units])].map((u) => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-2 py-2">
                              <CellInput numeric value={item.quantity} onChange={(v) => mutateItem(si, ii, { quantity: Number(v) })} />
                            </td>
                            <td className="px-2 py-2">
                              <CellInput numeric value={item.rate} onChange={(v) => mutateItem(si, ii, { rate: Number(v) })} />
                            </td>
                            <td className="px-2 py-2">
                              <CellInput numeric value={item.costPrice} onChange={(v) => mutateItem(si, ii, { costPrice: Number(v) })} />
                              <p className={cx('mt-0.5 text-right text-[10px]', margin < 15 ? 'text-amber-600' : 'text-slate-400')}>
                                {amount ? `${margin.toFixed(0)}% mgn` : ''}
                              </p>
                            </td>
                            <td className="px-2 py-2">
                              <CellInput numeric value={item.discountPct} onChange={(v) => mutateItem(si, ii, { discountPct: Number(v) })} />
                            </td>
                            {draft.taxMode === 'FULL_GST' && (
                              <td className="px-2 py-2">
                                <CellInput numeric value={item.gstRate} onChange={(v) => mutateItem(si, ii, { gstRate: Number(v) })} />
                              </td>
                            )}
                            <td className="tnum px-3 py-2 text-right text-sm font-medium text-slate-900">{money(amount)}</td>
                            <td className="px-1 py-2">
                              <button
                                onClick={() =>
                                  mutateSection(si, { items: section.items.filter((_, j) => j !== ii) })
                                }
                                disabled={section.items.length === 1}
                                className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
                                title="Remove line"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Plus className="size-3.5" />}
                    onClick={() => mutateSection(si, { items: [...section.items, blankItem()] })}
                  >
                    Add line
                  </Button>
                  <span className="tnum text-sm font-semibold text-slate-700">{money(sectionTotal)}</span>
                </div>
              </Card>
            );
          })}

          {sectioned && (
            <Button
              icon={<Plus className="size-4" />}
              onClick={() => set('sections', [...draft.sections, blankSection('')])}
            >
              Add {sectionLabel.toLowerCase()}
            </Button>
          )}

          <Card title="Notes & terms">
            <div className="space-y-4">
              <Field label="Notes to the client" hint="Appears above the terms on the printed quotation">
                <Textarea rows={3} value={draft.notes} onChange={(e) => set('notes', e.target.value)} />
              </Field>
              <Field label="Terms & conditions">
                <Textarea rows={10} value={draft.termsText} onChange={(e) => set('termsText', e.target.value)} className="font-mono text-xs" />
              </Field>
            </div>
          </Card>
        </div>

        {/* Sticky totals + margin */}
        <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Card title="Totals">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Discount">
                  <Select value={draft.discountType} onChange={(e) => set('discountType', e.target.value as Draft['discountType'])}>
                    <option value="NONE">None</option>
                    <option value="PERCENT">Percent</option>
                    <option value="AMOUNT">Amount</option>
                  </Select>
                </Field>
                <Field label="Value">
                  <Input
                    type="number"
                    step="0.01"
                    disabled={draft.discountType === 'NONE'}
                    value={draft.discountValue}
                    onChange={(e) => set('discountValue', Number(e.target.value))}
                  />
                </Field>
              </div>

              <dl className="tnum space-y-1.5 text-sm">
                <Row label="Subtotal" value={money(totals.subtotal)} />
                {!!totals.discountAmount && <Row label="Discount" value={`− ${money(totals.discountAmount)}`} />}
                <Row label="Taxable value" value={money(totals.taxableValue)} />
                {totals.isIntraState ? (
                  <>
                    <Row label="CGST" value={money(totals.cgst)} muted />
                    <Row label="SGST" value={money(totals.sgst)} muted />
                  </>
                ) : (
                  <Row label="IGST" value={money(totals.igst)} muted />
                )}
                {!!totals.roundOff && <Row label="Round off" value={money(totals.roundOff)} muted />}
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
                  <dt>Grand total</dt>
                  <dd>{money(totals.grandTotal)}</dd>
                </div>
              </dl>
            </div>
          </Card>

          <Card title="Profitability" subtitle="Internal only — never printed">
            <dl className="tnum space-y-1.5 text-sm">
              <Row label="Revenue (ex-GST)" value={money(totals.taxableValue)} />
              <Row label="Cost of items" value={money(totals.totalCost)} muted />
              <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
                <dt className="text-slate-700">Gross profit</dt>
                <dd className={totals.grossProfit >= 0 ? 'text-brand-700' : 'text-red-600'}>
                  {money(totals.grossProfit)}
                </dd>
              </div>
            </dl>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Margin</span>
                <span className={cx('font-semibold', totals.marginPct < 15 ? 'text-amber-600' : 'text-brand-700')}>
                  {pct(totals.marginPct)}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cx('h-full rounded-full transition-all', totals.marginPct < 15 ? 'bg-amber-500' : 'bg-brand-500')}
                  style={{ width: `${Math.max(0, Math.min(100, totals.marginPct))}%` }}
                />
              </div>
              {totals.marginPct < 15 && totals.taxableValue > 0 && (
                <p className="mt-2 text-xs text-amber-700">
                  Margin is below 15%. Check the cost prices on your lines.
                </p>
              )}
            </div>
          </Card>

          {totals.slabs.length > 1 && (
            <Card title="Tax breakup">
              <table className="tnum w-full text-xs">
                <thead>
                  <tr className="text-slate-500">
                    <th className="pb-1 text-left font-medium">Rate</th>
                    <th className="pb-1 text-right font-medium">Taxable</th>
                    <th className="pb-1 text-right font-medium">Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {totals.slabs.map((s) => (
                    <tr key={s.gstRate} className="border-t border-slate-100">
                      <td className="py-1">{s.gstRate}%</td>
                      <td className="py-1 text-right">{money(s.taxableValue)}</td>
                      <td className="py-1 text-right">{money(s.cgst + s.sgst + s.igst)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      </div>

      <CatalogPicker
        open={picking !== null}
        onClose={() => setPicking(null)}
        businessTypeId={draft.businessTypeId}
        onPick={(picks) => {
          if (picking === null) return;
          const section = draft.sections[picking];
          const existingItems = section.items.filter((i) => i.description.trim());

          const spec = {
            thicknessMm: draft.thicknessMm,
            wood: woodTier,
            laminate: laminateTier,
            hardware: hardwareTier,
            rates: tiers?.hardwareRates,
          };

          // A cabinet comes in as two lines: the cabinet at the specified rate,
          // and its hardware as one lump immediately after it.
          const added = picks.flatMap(({ item, line }) => {
            const priced = resolveRate(item, spec);
            const cabinet = { ...line, rate: priced.rate, costPrice: priced.cost };
            const hardware = hardwareLineFor(item, line.quantity, spec);
            return hardware ? [cabinet, hardware] : [cabinet];
          });

          mutateSection(picking, { items: [...existingItems, ...added] });
        }}
      />
    </>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className={muted ? 'text-slate-500' : 'text-slate-600'}>{label}</dt>
      <dd className={muted ? 'text-slate-600' : 'font-medium text-slate-900'}>{value}</dd>
    </div>
  );
}

function CellInput({
  value, onChange, numeric,
}: { value: string | number; onChange: (v: string) => void; numeric?: boolean }) {
  return (
    <input
      type={numeric ? 'number' : 'text'}
      step={numeric ? '0.01' : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cx(
        'w-full rounded border-0 bg-transparent px-1.5 py-1 text-sm focus:bg-white focus:ring-1 focus:ring-brand-500 focus:outline-none',
        numeric && 'tnum text-right',
      )}
    />
  );
}
