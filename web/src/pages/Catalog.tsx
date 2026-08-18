import { Boxes, FileUp, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { RateCardImport } from '../components/RateCardImport';
import {
  Badge, Button, Card, EmptyState, ErrorState, Field, Input, Loading, Modal,
  PageHeader, Select, Table, Tabs, Td, Textarea, Th, useAction,
} from '../components/ui';
import { api, useApi } from '../lib/api';
import { useActiveBusinessTypes, useApp } from '../lib/app-context';
import { money, pct } from '../lib/format';
import type { CatalogItem } from '../lib/types';

const BLANK: Partial<CatalogItem> = {
  name: '', sku: '', brand: '', category: '', unit: 'Nos',
  defaultRate: 0, costPrice: 0, hsnSac: '', gstRate: 18, specNote: '', active: true,
};

export function Catalog() {
  const businessTypes = useActiveBusinessTypes();
  const { units } = useApp();
  const { run, busy } = useAction();

  const [tab, setTab] = useState(businessTypes[0]?.id ?? '');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [editing, setEditing] = useState<Partial<CatalogItem> | null>(null);
  const [importing, setImporting] = useState(false);
  const [importingPdf, setImportingPdf] = useState(false);
  const [csv, setCsv] = useState('');

  const query = useMemo(() => {
    if (!tab) return null;
    const p = new URLSearchParams({ businessTypeId: tab, all: '1' });
    if (q.trim()) p.set('q', q.trim());
    if (category) p.set('category', category);
    return `/catalog?${p}`;
  }, [tab, q, category]);

  const { data, loading, error, reload } = useApi<CatalogItem[]>(query);

  // Categories come from the whole catalog, not the filtered view, so the
  // dropdown does not collapse to one option as soon as you pick something.
  const { data: allItems } = useApi<CatalogItem[]>(tab ? `/catalog?businessTypeId=${tab}&all=1` : null, [tab]);
  const categories = useMemo(
    () => [...new Set((allItems ?? []).map((i) => i.category).filter(Boolean))].sort() as string[],
    [allItems],
  );

  const save = () =>
    run(async () => {
      const body = { ...editing, businessTypeId: tab };
      delete (body as any).id;
      if (editing?.id) await api.put(`/catalog/${editing.id}`, body);
      else await api.post('/catalog', body);
      setEditing(null);
      await reload();
    }, editing?.id ? 'Item updated' : 'Item added');

  const remove = (id: string) =>
    run(async () => {
      await api.del(`/catalog/${id}`);
      await reload();
    }, 'Item deleted');

  /** CSV columns: name, sku, brand, category, unit, rate, cost, hsn, gst, spec */
  const importCsv = () =>
    run(async () => {
      const rows = csv
        .trim()
        .split(/\r?\n/)
        .map((line) => line.split(',').map((c) => c.trim().replace(/^"|"$/g, '')))
        .filter((cols) => cols[0] && cols[0].toLowerCase() !== 'name');

      const items = rows.map((c) => ({
        businessTypeId: tab,
        name: c[0],
        sku: c[1] || null,
        brand: c[2] || null,
        category: c[3] || null,
        unit: c[4] || 'Nos',
        defaultRate: Number(c[5]) || 0,
        costPrice: Number(c[6]) || 0,
        hsnSac: c[7] || null,
        gstRate: Number(c[8]) || 18,
        specNote: c[9] || null,
      }));

      if (!items.length) throw new Error('No rows found. Check the column order.');
      const result = await api.post<{ created: number }>('/catalog/bulk', { items });
      setImporting(false);
      setCsv('');
      await reload();
      return result;
    }, 'Imported');

  const businessType = businessTypes.find((b) => b.id === tab);

  return (
    <>
      <PageHeader
        title="Rate card & products"
        subtitle="The master list your quotations pull from. Cost price here is what makes margin real."
        actions={
          <>
            <Button icon={<FileUp className="size-4" />} onClick={() => setImportingPdf(true)}>
              Import PDF
            </Button>
            <Button icon={<Upload className="size-4" />} onClick={() => setImporting(true)}>Import CSV</Button>
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEditing({ ...BLANK })}>
              New item
            </Button>
          </>
        }
      >
        <Tabs
          value={tab}
          onChange={(v) => {
            setTab(v);
            setCategory('');
          }}
          tabs={businessTypes.map((b) => ({ value: b.id, label: b.name, color: b.color, count: b._count?.catalogItems }))}
        />
      </PageHeader>

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search name, SKU, brand, spec…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-56">
            <option value="">All categories ({allItems?.length ?? 0})</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
          <span className="text-xs whitespace-nowrap text-slate-500">
            {data?.length ?? 0} shown
          </span>
        </div>

        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !data?.length ? (
          <EmptyState
            icon={<Boxes className="size-10" />}
            title="Nothing in this catalog yet"
            description="Add the items you quote repeatedly. Once they're here, building a quotation is picking from a list instead of retyping."
            action={<Button variant="primary" onClick={() => setEditing({ ...BLANK })}>Add an item</Button>}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Item</Th>
                {businessType?.layout === 'FLAT' && <Th>SKU / brand</Th>}
                <Th>Category</Th>
                <Th>Unit</Th>
                <Th align="right">Rate</Th>
                <Th align="right">Cost</Th>
                <Th align="right">Margin</Th>
                <Th align="right">GST</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {data.map((item) => {
                const margin = item.defaultRate ? ((item.defaultRate - item.costPrice) / item.defaultRate) * 100 : 0;
                return (
                  <tr key={item.id} className="group hover:bg-slate-50">
                    <Td className="max-w-[300px]">
                      <p className="font-medium text-slate-900">{item.name}</p>
                      {item.specNote && <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{item.specNote}</p>}
                      {!item.active && <Badge tone="amber" className="mt-1">inactive</Badge>}
                    </Td>
                    {businessType?.layout === 'FLAT' && (
                      <Td className="text-xs">
                        {item.sku && <p className="font-mono">{item.sku}</p>}
                        {item.brand && <p className="text-slate-500">{item.brand}</p>}
                      </Td>
                    )}
                    <Td>{item.category || '—'}</Td>
                    <Td>{item.unit}</Td>
                    <Td align="right" className="font-medium text-slate-900">{money(item.defaultRate)}</Td>
                    <Td align="right" className="text-slate-500">{money(item.costPrice)}</Td>
                    <Td align="right" className={margin < 15 ? 'text-amber-600' : 'text-brand-700'}>{pct(margin)}</Td>
                    <Td align="right">{item.gstRate}%</Td>
                    <Td>
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(item)}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(item.id)}>
                          <Trash2 className="size-3.5 text-red-500" />
                        </Button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        wide
        title={editing?.id ? 'Edit catalog item' : 'New catalog item'}
        footer={
          <>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="primary" loading={busy} disabled={!editing?.name?.trim()} onClick={save}>Save</Button>
          </>
        }
      >
        {editing && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required className="sm:col-span-2">
              <Input value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <Field label="SKU">
              <Input value={editing.sku ?? ''} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} />
            </Field>
            <Field label="Brand">
              <Input value={editing.brand ?? ''} onChange={(e) => setEditing({ ...editing, brand: e.target.value })} />
            </Field>
            <Field label="Category" hint="Groups items in the picker">
              <Input value={editing.category ?? ''} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
            </Field>
            <Field label="Unit">
              <Select value={editing.unit ?? 'Nos'} onChange={(e) => setEditing({ ...editing, unit: e.target.value })}>
                {units.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </Select>
            </Field>
            <Field label="Selling rate" required>
              <Input type="number" step="0.01" value={editing.defaultRate ?? 0} onChange={(e) => setEditing({ ...editing, defaultRate: Number(e.target.value) })} />
            </Field>
            <Field label="Cost price" hint="Never shown to the client">
              <Input type="number" step="0.01" value={editing.costPrice ?? 0} onChange={(e) => setEditing({ ...editing, costPrice: Number(e.target.value) })} />
            </Field>
            <Field label="HSN / SAC">
              <Input value={editing.hsnSac ?? ''} onChange={(e) => setEditing({ ...editing, hsnSac: e.target.value })} />
            </Field>
            <Field label="GST rate (%)">
              <Input type="number" step="0.5" value={editing.gstRate ?? 18} onChange={(e) => setEditing({ ...editing, gstRate: Number(e.target.value) })} />
            </Field>
            <Field label="Specification note" hint="Carries into the quotation line" className="sm:col-span-2">
              <Textarea rows={2} value={editing.specNote ?? ''} onChange={(e) => setEditing({ ...editing, specNote: e.target.value })} />
            </Field>
          </div>
        )}
      </Modal>

      <Modal
        open={importing}
        onClose={() => setImporting(false)}
        wide
        title="Import from CSV"
        description="One item per line. Columns in order: name, sku, brand, category, unit, rate, cost, hsn, gst, spec"
        footer={
          <>
            <Button onClick={() => setImporting(false)}>Cancel</Button>
            <Button variant="primary" loading={busy} disabled={!csv.trim()} onClick={importCsv}>Import</Button>
          </>
        }
      >
        <Textarea
          rows={12}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder={'Base unit — kitchen,,,Modular Kitchen,Sq.ft,1750,1150,9403,18,19mm BWP ply carcass'}
          className="font-mono text-xs"
        />
      </Modal>

      <RateCardImport
        open={importingPdf}
        onClose={() => setImportingPdf(false)}
        businessTypeId={tab}
        businessTypeName={businessType?.name ?? 'this'}
        onImported={reload}
      />
    </>
  );
}
