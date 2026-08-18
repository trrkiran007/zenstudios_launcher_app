import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApi } from '../lib/api';
import { money } from '../lib/format';
import type { CatalogItem, QuotationItem } from '../lib/types';
import { Badge, Button, EmptyState, Input, Loading, Modal, Select } from './ui';

export const catalogToLine = (item: CatalogItem): QuotationItem => ({
  catalogItemId: item.id,
  description: item.name,
  specNote: item.specNote,
  hsnSac: item.hsnSac,
  unit: item.unit,
  quantity: 1,
  rate: item.defaultRate,
  costPrice: item.costPrice,
  discountPct: 0,
  gstRate: item.gstRate,
});

export function CatalogPicker({
  open, onClose, businessTypeId, onPick,
}: {
  open: boolean;
  onClose: () => void;
  businessTypeId: string;
  onPick: (items: QuotationItem[]) => void;
}) {
  const { data, loading } = useApi<CatalogItem[]>(
    open && businessTypeId ? `/catalog?businessTypeId=${businessTypeId}` : null,
    [open, businessTypeId],
  );
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [picked, setPicked] = useState<Record<string, number>>({});

  const categories = useMemo(
    () => [...new Set((data ?? []).map((i) => i.category).filter(Boolean))].sort() as string[],
    [data],
  );

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? []).filter(
      (i) =>
        (!category || i.category === category) &&
        (!needle ||
          [i.name, i.sku, i.brand, i.category, i.specNote]
            .filter(Boolean)
            .some((f) => f!.toLowerCase().includes(needle))),
    );
  }, [data, q, category]);

  const total = Object.values(picked).reduce((a, b) => a + b, 0);

  const add = () => {
    const items = Object.entries(picked)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const item = (data ?? []).find((i) => i.id === id)!;
        return { ...catalogToLine(item), quantity: qty };
      });
    onPick(items);
    setPicked({});
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="Add from catalog"
      description="Set a quantity to include an item. Rates and cost prices come across so margin stays accurate."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!total} onClick={add}>
            Add {total ? `${Object.values(picked).filter(Boolean).length} item(s)` : ''}
          </Button>
        </>
      }
    >
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search catalog…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-48">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
      </div>

      {loading ? (
        <Loading />
      ) : !rows.length ? (
        <EmptyState title="Nothing matches" description="Try a different search, or add items on the Catalog page." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((item) => (
            <li key={item.id} className="flex items-start gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">{item.name}</p>
                <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                  {[item.sku, item.brand, item.specNote].filter(Boolean).join(' · ')}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  {item.category && <Badge>{item.category}</Badge>}
                  <span className="tnum text-slate-600">{money(item.defaultRate)} / {item.unit}</span>
                  <span className="tnum text-slate-400">cost {money(item.costPrice)}</span>
                  <span className="text-slate-400">GST {item.gstRate}%</span>
                </div>
              </div>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Qty"
                value={picked[item.id] ?? ''}
                onChange={(e) => setPicked((p) => ({ ...p, [item.id]: Number(e.target.value) || 0 }))}
                className="w-24 shrink-0 text-right"
              />
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
