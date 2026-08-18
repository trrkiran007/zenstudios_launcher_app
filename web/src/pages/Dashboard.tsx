import {
  AlertTriangle, ArrowRight, Boxes, FileText, IndianRupee, TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { Badge, Card, ErrorState, Loading, PageHeader, Stat } from '../components/ui';
import { useApi } from '../lib/api';
import { useApp } from '../lib/app-context';
import { money, moneyShort, num, pct } from '../lib/format';
import type { Dashboard as DashboardData, Task } from '../lib/types';

const monthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
};

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-slate-200">
      <p className="mb-1 font-medium text-slate-900">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="tnum flex items-center gap-2 text-slate-600">
          <span className="size-2 rounded-full" style={{ background: p.color ?? p.fill }} />
          {p.name}: <span className="font-medium text-slate-900">{money(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

export function Dashboard() {
  const { org } = useApp();
  const { data, loading, error, reload } = useApi<DashboardData>('/reports/dashboard');
  const { data: tasks } = useApi<Task[]>('/tasks?status=TODO');

  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? 'No data'} onRetry={reload} />;

  const dueSoon = (tasks ?? [])
    .filter((t) => t.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 6);

  const monthly = data.monthly.map((m) => ({ ...m, label: monthLabel(m.month) }));

  return (
    <>
      <PageHeader
        title={`Good to see you${org?.brandName ? `, ${org.brandName}` : ''}`}
        subtitle={`Financial year ${data.financialYear} · figures below cover this FY to date`}
      />

      {!org?.gstin && (
        <div className="mb-5 flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm ring-1 ring-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <p className="text-amber-800">
            Your GSTIN is not set yet, so tax invoices will print without it.{' '}
            <Link to="/settings" className="font-medium underline">Add it in Settings</Link>.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Quotes issued"
          value={num(data.quotes.total, 0)}
          sub={`${money(data.quotes.totalValue)} quoted`}
          icon={<FileText className="size-4" />}
        />
        <Stat
          label="Conversion"
          value={pct(data.quotes.conversionRate)}
          sub={`${data.quotes.accepted} won · ${money(data.quotes.acceptedValue)}`}
          tone="good"
          icon={<TrendingUp className="size-4" />}
        />
        <Stat
          label="Live pipeline"
          value={moneyShort(data.projects.pipelineValue)}
          sub={`${data.projects.active} active projects`}
          icon={<Boxes className="size-4" />}
        />
        <Stat
          label="Outstanding"
          value={moneyShort(data.money.outstanding)}
          sub={
            data.money.overdueCount
              ? `${data.money.overdueCount} overdue · ${money(data.money.overdueValue)}`
              : 'Nothing overdue'
          }
          tone={data.money.overdueCount ? 'bad' : 'default'}
          icon={<IndianRupee className="size-4" />}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card
          title="Invoiced vs received vs spent"
          subtitle="Monthly, this financial year"
          className="lg:col-span-2"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly} margin={{ left: -18, right: 6, top: 4 }}>
                <defs>
                  <linearGradient id="gInv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16A34A" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => moneyShort(v).replace('₹', '')}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="invoiced" name="Invoiced" stroke="#16A34A" strokeWidth={2} fill="url(#gInv)" />
                <Area type="monotone" dataKey="received" name="Received" stroke="#0EA5E9" strokeWidth={2} fill="url(#gRec)" />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#F59E0B" strokeWidth={2} fill="none" strokeDasharray="4 3" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-brand-600" /> Invoiced</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-sky-500" /> Received</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-500" /> Expenses</span>
          </div>
        </Card>

        <Card title="By line of business">
          <div className="space-y-4">
            {data.byBusinessType.map((bt) => (
              <div key={bt.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium text-slate-800">
                    <span className="size-2.5 rounded-full" style={{ background: bt.color }} />
                    {bt.name}
                  </span>
                  <span className="tnum text-slate-600">{moneyShort(bt.quoteValue)}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      background: bt.color,
                      width: `${bt.quoteValue ? Math.max(4, (bt.wonValue / bt.quoteValue) * 100) : 0}%`,
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {bt.quoteCount} quotes · {bt.activeProjects} active · won {moneyShort(bt.wonValue)}
                </p>
              </div>
            ))}
            {!data.byBusinessType.length && (
              <p className="py-6 text-center text-sm text-slate-500">No business types configured.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card title="Pipeline by stage" subtitle="Active projects only" className="lg:col-span-2">
          {data.pipelineByStage.length ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.pipelineByStage} margin={{ left: -18, right: 6, top: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="stage" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} interval={0} angle={-16} textAnchor="end" height={54} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={(v) => moneyShort(v).replace('₹', '')} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F1F5F9' }} />
                  <Bar dataKey="value" name="Value" radius={[5, 5, 0, 0]}>
                    {data.pipelineByStage.map((s, i) => (
                      <Cell key={i} fill={s.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-slate-500">
              No active projects yet. Convert an accepted quotation to start tracking one.
            </p>
          )}
        </Card>

        <Card
          title="Next up"
          subtitle="Open tasks with a due date"
          actions={
            <Link to="/projects" className="text-xs font-medium text-brand-700 hover:underline">
              All projects <ArrowRight className="inline size-3" />
            </Link>
          }
        >
          {dueSoon.length ? (
            <ul className="space-y-3">
              {dueSoon.map((t) => {
                const overdue = new Date(t.dueDate!) < new Date();
                return (
                  <li key={t.id} className="flex items-start gap-2.5">
                    <span className={`mt-1.5 size-2 shrink-0 rounded-full ${overdue ? 'bg-red-500' : 'bg-slate-300'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{t.title}</p>
                      <p className="truncate text-xs text-slate-500">
                        {t.project?.code} · {t.project?.name}
                      </p>
                    </div>
                    <Badge tone={overdue ? 'red' : 'slate'}>
                      {new Date(t.dueDate!).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">Nothing scheduled. Clear runway.</p>
          )}
        </Card>
      </div>

      {data.expenseByCategory.length > 0 && (
        <Card title="Where the money went" subtitle="Expenses this financial year" className="mt-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.expenseByCategory.slice(0, 8).map((c) => (
              <div key={c.category} className="rounded-lg bg-slate-50 px-3 py-2.5">
                <p className="truncate text-xs text-slate-500">{c.category}</p>
                <p className="tnum mt-0.5 text-sm font-semibold text-slate-900">{money(c.amount)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
