import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Badge, Button, Card, EmptyState, ErrorState, Loading, PageHeader, Table,
  Tabs, Td, Th, cx,
} from '../components/ui';
import { useApi } from '../lib/api';
import { useActiveBusinessTypes } from '../lib/app-context';
import { date, money, num, pct } from '../lib/format';

type Profitability = {
  id: string; code: string; name: string; client: string; businessType: string; color: string;
  stage: string; status: string; quotationNumber: string | null; revenue: number;
  budgetedCost: number; actualCost: number; costVariance: number;
  budgetedProfit: number; budgetedMarginPct: number; actualProfit: number; actualMarginPct: number;
  invoiced: number; received: number; outstanding: number;
};

type Receivable = {
  id: string; number: string; client: string; project: string | null; issueDate: string;
  dueDate: string | null; grandTotal: number; amountPaid: number; balance: number;
  daysOverdue: number; bucket: string;
};

type RateHistory = {
  description: string; unit: string; uses: number;
  min: number; median: number; max: number; avg: number; lastUsed: string;
};

const csvEscape = (v: unknown) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function Reports() {
  const businessTypes = useActiveBusinessTypes();
  const [tab, setTab] = useState<'profit' | 'receivables' | 'rates'>('profit');
  const [bt, setBt] = useState('');

  const { data: profit, loading: l1, error: e1, reload: r1 } = useApi<Profitability[]>(
    `/reports/profitability${bt ? `?businessTypeId=${bt}` : ''}`,
    [bt],
  );
  const { data: receivables, loading: l2, error: e2, reload: r2 } = useApi<Receivable[]>('/reports/receivables');
  const { data: rates, loading: l3, error: e3, reload: r3 } = useApi<RateHistory[]>(
    `/reports/rate-history${bt ? `?businessTypeId=${bt}` : ''}`,
    [bt],
  );

  const totals = useMemo(() => {
    const rows = profit ?? [];
    const revenue = rows.reduce((a, r) => a + r.revenue, 0);
    const budgeted = rows.reduce((a, r) => a + r.budgetedCost, 0);
    const actual = rows.reduce((a, r) => a + r.actualCost, 0);
    return {
      revenue,
      budgeted,
      actual,
      budgetedProfit: revenue - budgeted,
      budgetedMarginPct: revenue ? ((revenue - budgeted) / revenue) * 100 : 0,
    };
  }, [profit]);

  const buckets = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>();
    for (const r of receivables ?? []) {
      const cur = map.get(r.bucket) ?? { count: 0, value: 0 };
      map.set(r.bucket, { count: cur.count + 1, value: cur.value + r.balance });
    }
    return ['Current', '1-30 days', '31-60 days', '61-90 days', '90+ days']
      .map((b) => ({ bucket: b, ...(map.get(b) ?? { count: 0, value: 0 }) }))
      .filter((b) => b.count > 0);
  }, [receivables]);

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Profitability, receivables ageing, and the rates you've actually quoted"
        actions={
          <select
            value={bt}
            onChange={(e) => setBt(e.target.value)}
            className="h-9 rounded-lg border-0 bg-white px-3 text-sm shadow-sm ring-1 ring-slate-300"
          >
            <option value="">All lines of business</option>
            {businessTypes.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        }
      >
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'profit', label: 'Project P&L', count: profit?.length },
            { value: 'receivables', label: 'Receivables', count: receivables?.length },
            { value: 'rates', label: 'My rate history', count: rates?.length },
          ]}
        />
      </PageHeader>

      {tab === 'profit' && (
        <Card
          padded={false}
          title="Project profitability"
          subtitle={`Revenue ${money(totals.revenue)} · budgeted cost ${money(totals.budgeted)} · spent ${money(totals.actual)} · budgeted profit ${money(totals.budgetedProfit)} (${pct(totals.budgetedMarginPct)})`}
          actions={
            <Button
              size="sm"
              icon={<Download className="size-3.5" />}
              disabled={!profit?.length}
              onClick={() =>
                downloadCsv(
                  'project-profitability.csv',
                  ['Code', 'Project', 'Client', 'Business', 'Stage', 'Status', 'Quotation', 'Revenue', 'Budgeted cost', 'Actual spend', 'Variance', 'Budgeted profit', 'Budgeted margin %', 'Profit at actuals', 'Margin at actuals %', 'Invoiced', 'Received', 'Outstanding'],
                  (profit ?? []).map((r) => [
                    r.code, r.name, r.client, r.businessType, r.stage, r.status, r.quotationNumber ?? '',
                    r.revenue, r.budgetedCost, r.actualCost, r.costVariance,
                    r.budgetedProfit, r.budgetedMarginPct, r.actualProfit, r.actualMarginPct,
                    r.invoiced, r.received, r.outstanding,
                  ]),
                )
              }
            >
              CSV
            </Button>
          }
        >
          {l1 ? (
            <Loading />
          ) : e1 ? (
            <ErrorState message={e1} onRetry={r1} />
          ) : !profit?.length ? (
            <EmptyState title="No projects to report on yet" description="Convert an accepted quotation to start tracking profitability." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Project</Th>
                  <Th>Client</Th>
                  <Th>Stage</Th>
                  <Th align="right">Revenue</Th>
                  <Th align="right">Budgeted cost</Th>
                  <Th align="right">Spent</Th>
                  <Th align="right">Budgeted profit</Th>
                  <Th align="right">Margin</Th>
                  <Th align="right">Outstanding</Th>
                </tr>
              </thead>
              <tbody>
                {profit.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <Td>
                      <Link to={`/projects/${r.id}`} className="font-medium text-brand-700 hover:underline">{r.code}</Link>
                      <p className="line-clamp-1 text-xs text-slate-500">{r.name}</p>
                    </Td>
                    <Td>{r.client}</Td>
                    <Td><Badge dot={r.color}>{r.stage}</Badge></Td>
                    <Td align="right">{money(r.revenue)}</Td>
                    <Td align="right" className="text-slate-500">{money(r.budgetedCost)}</Td>
                    <Td align="right" className={r.costVariance < 0 ? 'font-medium text-red-600' : 'text-slate-500'}>
                      {money(r.actualCost)}
                    </Td>
                    <Td align="right" className={cx('font-medium', r.budgetedProfit >= 0 ? 'text-brand-700' : 'text-red-600')}>
                      {money(r.budgetedProfit)}
                    </Td>
                    <Td align="right" className={r.budgetedMarginPct < 15 ? 'text-amber-600' : ''}>
                      {pct(r.budgetedMarginPct)}
                    </Td>
                    <Td align="right" className={r.outstanding > 0 ? 'text-amber-700' : 'text-slate-400'}>
                      {money(r.outstanding)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {tab === 'receivables' && (
        <>
          {buckets.length > 0 && (
            <div className="mb-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {buckets.map((b) => (
                <div key={b.bucket} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-xs font-medium text-slate-500">{b.bucket}</p>
                  <p className={cx('tnum mt-1.5 text-lg font-semibold', b.bucket === 'Current' ? 'text-slate-900' : 'text-amber-700')}>
                    {money(b.value)}
                  </p>
                  <p className="text-xs text-slate-400">{b.count} invoice(s)</p>
                </div>
              ))}
            </div>
          )}

          <Card
            padded={false}
            title="Outstanding invoices"
            actions={
              <Button
                size="sm"
                icon={<Download className="size-3.5" />}
                disabled={!receivables?.length}
                onClick={() =>
                  downloadCsv(
                    'receivables.csv',
                    ['Invoice', 'Client', 'Project', 'Issued', 'Due', 'Total', 'Received', 'Balance', 'Days overdue', 'Bucket'],
                    (receivables ?? []).map((r) => [
                      r.number, r.client, r.project ?? '', r.issueDate, r.dueDate ?? '',
                      r.grandTotal, r.amountPaid, r.balance, r.daysOverdue, r.bucket,
                    ]),
                  )
                }
              >
                CSV
              </Button>
            }
          >
            {l2 ? (
              <Loading />
            ) : e2 ? (
              <ErrorState message={e2} onRetry={r2} />
            ) : !receivables?.length ? (
              <EmptyState title="Nothing outstanding" description="Every issued tax invoice has been paid in full." />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Invoice</Th>
                    <Th>Client</Th>
                    <Th>Project</Th>
                    <Th>Due</Th>
                    <Th align="right">Total</Th>
                    <Th align="right">Balance</Th>
                    <Th align="center">Ageing</Th>
                  </tr>
                </thead>
                <tbody>
                  {receivables.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <Td className="font-medium text-slate-900">{r.number}</Td>
                      <Td>{r.client}</Td>
                      <Td className="text-xs text-slate-500">{r.project ?? '—'}</Td>
                      <Td className={r.daysOverdue > 0 ? 'text-red-600' : ''}>{date(r.dueDate)}</Td>
                      <Td align="right">{money(r.grandTotal)}</Td>
                      <Td align="right" className="font-medium text-slate-900">{money(r.balance)}</Td>
                      <Td align="center">
                        <Badge tone={r.bucket === 'Current' ? 'slate' : r.daysOverdue > 60 ? 'red' : 'amber'}>
                          {r.bucket}
                        </Badge>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </>
      )}

      {tab === 'rates' && (
        <Card
          padded={false}
          title="Rates you have quoted"
          subtitle="Drawn only from your own sent and accepted quotations — competitor data never feeds this."
          actions={
            <Button
              size="sm"
              icon={<Download className="size-3.5" />}
              disabled={!rates?.length}
              onClick={() =>
                downloadCsv(
                  'my-rate-history.csv',
                  ['Description', 'Unit', 'Times quoted', 'Min', 'Median', 'Average', 'Max', 'Last used'],
                  (rates ?? []).map((r) => [r.description, r.unit, r.uses, r.min, r.median, r.avg, r.max, r.lastUsed]),
                )
              }
            >
              CSV
            </Button>
          }
        >
          {l3 ? (
            <Loading />
          ) : e3 ? (
            <ErrorState message={e3} onRetry={r3} />
          ) : !rates?.length ? (
            <EmptyState
              title="No rate history yet"
              description="Once you have sent or accepted quotations, this shows the spread of rates you have used per item."
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Item</Th>
                  <Th>Unit</Th>
                  <Th align="center">Times quoted</Th>
                  <Th align="right">Min</Th>
                  <Th align="right">Median</Th>
                  <Th align="right">Average</Th>
                  <Th align="right">Max</Th>
                  <Th>Last used</Th>
                </tr>
              </thead>
              <tbody>
                {rates.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <Td className="max-w-[320px] font-medium text-slate-900">
                      <span className="line-clamp-1">{r.description}</span>
                    </Td>
                    <Td>{r.unit}</Td>
                    <Td align="center">{num(r.uses, 0)}</Td>
                    <Td align="right" className="text-slate-500">{money(r.min)}</Td>
                    <Td align="right" className="font-medium text-slate-900">{money(r.median)}</Td>
                    <Td align="right">{money(r.avg)}</Td>
                    <Td align="right" className="text-slate-500">{money(r.max)}</Td>
                    <Td>{date(r.lastUsed)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}
    </>
  );
}
