import { Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Badge, Card, EmptyState, ErrorState, Field, Input, Loading, PageHeader,
  Select, Stat, Table, Td, Th,
} from '../components/ui';
import { useApi } from '../lib/api';
import { date, dateInput, money } from '../lib/format';
import type { Expense } from '../lib/types';

export function Expenses() {
  const startOfFy = useMemo(() => {
    const now = new Date();
    const year = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
    return dateInput(new Date(year, 3, 1));
  }, []);

  const [from, setFrom] = useState(startOfFy);
  const [to, setTo] = useState(dateInput(new Date()));
  const [category, setCategory] = useState('');

  const { data: categories } = useApi<string[]>('/expenses/categories');
  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    if (category) p.set('category', category);
    return `/expenses?${p}`;
  }, [from, to, category]);

  const { data, loading, error, reload } = useApi<Expense[]>(query);

  const rows = data ?? [];
  const total = rows.reduce((a, e) => a + e.amount, 0);
  const gst = rows.reduce((a, e) => a + e.gstAmount, 0);
  const unpaid = rows.filter((e) => e.paymentStatus !== 'PAID').reduce((a, e) => a + e.amount, 0);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of rows) map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle="Everything booked against a project. Record expenses from inside a project to keep margin honest."
      />

      <Card className="mb-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="From">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="To">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {(categories ?? []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <div className="mb-5 grid gap-4 sm:grid-cols-4">
        <Stat label="Entries" value={rows.length} />
        <Stat label="Total spend" value={money(total)} />
        <Stat label="GST component" value={money(gst)} sub="Available as input credit" />
        <Stat label="Unpaid" value={money(unpaid)} tone={unpaid > 0 ? 'warn' : 'default'} />
      </div>

      {byCategory.length > 0 && (
        <Card title="By category" className="mb-5">
          <div className="space-y-2.5">
            {byCategory.map(([name, amount]) => (
              <div key={name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{name}</span>
                  <span className="tnum font-medium text-slate-900">{money(amount)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${total ? (amount / total) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card padded={false}>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !rows.length ? (
          <EmptyState
            icon={<Wallet className="size-10" />}
            title="No expenses in this window"
            description="Open a project, go to Money, and record an expense against it."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Project</Th>
                <Th>Category</Th>
                <Th>Vendor</Th>
                <Th>Description</Th>
                <Th align="right">Amount</Th>
                <Th align="right">GST</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <Td>{date(e.date)}</Td>
                  <Td>
                    <Link to={`/projects/${e.projectId}`} className="text-brand-700 hover:underline">
                      {e.project?.code}
                    </Link>
                    <p className="line-clamp-1 text-xs text-slate-500">{e.project?.name}</p>
                  </Td>
                  <Td>{e.category}</Td>
                  <Td>{e.vendor || '—'}</Td>
                  <Td className="max-w-[240px]"><span className="line-clamp-1">{e.description || '—'}</span></Td>
                  <Td align="right" className="font-medium text-slate-900">{money(e.amount)}</Td>
                  <Td align="right" className="text-slate-500">{money(e.gstAmount)}</Td>
                  <Td>
                    <Badge tone={e.paymentStatus === 'PAID' ? 'green' : e.paymentStatus === 'PARTIAL' ? 'amber' : 'red'}>
                      {e.paymentStatus.toLowerCase()}
                    </Badge>
                    {e.billable && <Badge tone="blue" className="ml-1">rebillable</Badge>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
