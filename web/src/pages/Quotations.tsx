import { Archive, Copy, FileText, GitBranch, Plus, Search, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Badge, Button, Card, EmptyState, ErrorState, Input, Loading, PageHeader,
  Select, StatusBadge, Table, Tabs, Td, Th, useAction,
} from '../components/ui';
import { api, useApi } from '../lib/api';
import { useActiveBusinessTypes } from '../lib/app-context';
import { date, money, pct } from '../lib/format';
import { expectKind, pickTransferFile } from '../lib/transfer';
import type { Quotation } from '../lib/types';

const STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'SUPERSEDED'];

export function Quotations() {
  const navigate = useNavigate();
  const businessTypes = useActiveBusinessTypes();
  const { run, busy } = useAction();

  const [tab, setTab] = useState<string>('ALL');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [archived, setArchived] = useState(false);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (tab !== 'ALL') p.set('businessTypeId', tab);
    if (status) p.set('status', status);
    if (q.trim()) p.set('q', q.trim());
    if (archived) p.set('archived', '1');
    return `/quotations?${p}`;
  }, [tab, status, q, archived]);

  const { data, loading, error, reload } = useApi<Quotation[]>(query);

  const totals = useMemo(() => {
    const rows = data ?? [];
    return {
      count: rows.length,
      value: rows.reduce((a, r) => a + r.grandTotal, 0),
      won: rows.filter((r) => r.status === 'ACCEPTED').reduce((a, r) => a + r.grandTotal, 0),
    };
  }, [data]);

  const duplicate = (id: string) =>
    run(async () => {
      const copy = await api.post<Quotation>(`/quotations/${id}/duplicate`);
      navigate(`/quotations/${copy.id}/edit`);
    }, 'Duplicated');

  const revise = (id: string) =>
    run(async () => {
      const rev = await api.post<Quotation>(`/quotations/${id}/revise`);
      navigate(`/quotations/${rev.id}/edit`);
    }, 'Revision created');

  const importQuotation = () =>
    run(async () => {
      const picked = await pickTransferFile();
      if (!picked) return;
      const file = expectKind(picked, 'zenstudios.quotation', 'quotation file');
      const created = await api.post<Quotation>('/transfer/quotation', file);
      navigate(`/quotations/${created.id}`);
    }, 'Quotation imported');

  const toggleArchive = (row: Quotation) =>
    run(async () => {
      await api.patch(`/quotations/${row.id}/archive`, { archive: !row.archivedAt });
      await reload();
    }, row.archivedAt ? 'Restored' : 'Archived');

  return (
    <>
      <PageHeader
        title="Quotations"
        subtitle={`${totals.count} shown · ${money(totals.value)} quoted · ${money(totals.won)} accepted`}
        actions={
          <>
            <Button icon={<Upload className="size-4" />} disabled={busy} onClick={importQuotation}>
              Open a shared file
            </Button>
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => navigate('/quotations/new')}>
              New quotation
            </Button>
          </>
        }
      >
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'ALL', label: 'All' },
            ...businessTypes.map((b) => ({ value: b.id, label: b.name, color: b.color })),
          ]}
        />
      </PageHeader>

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search number, title or client…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
            <option value="">Any status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.toLowerCase()}</option>
            ))}
          </Select>
          <Button
            variant={archived ? 'primary' : 'secondary'}
            icon={<Archive className="size-4" />}
            onClick={() => setArchived((a) => !a)}
          >
            {archived ? 'Viewing archive' : 'Archive'}
          </Button>
        </div>

        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !data?.length ? (
          <EmptyState
            icon={<FileText className="size-10" />}
            title={archived ? 'Nothing archived' : 'No quotations yet'}
            description={
              archived
                ? 'Archived quotations stay searchable and can be restored at any time.'
                : 'Create your first quotation — pick a line of business, add a client, and build it from your rate card.'
            }
            action={
              !archived && (
                <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => navigate('/quotations/new')}>
                  New quotation
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Number</Th>
                <Th>Title</Th>
                <Th>Client</Th>
                <Th>Business</Th>
                <Th>Date</Th>
                <Th align="right">Value</Th>
                <Th align="right">Margin</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="group hover:bg-slate-50">
                  <Td>
                    <Link to={`/quotations/${row.id}`} className="font-medium text-brand-700 hover:underline">
                      {row.number}
                    </Link>
                    {row.version > 1 && (
                      <span className="ml-1.5 text-xs text-slate-400">v{row.version}</span>
                    )}
                  </Td>
                  <Td className="max-w-[260px]">
                    <span className="line-clamp-1 text-slate-900">{row.title}</span>
                    {row.project && (
                      <Link to={`/projects/${row.project.id}`} className="text-xs text-slate-500 hover:underline">
                        → {row.project.code}
                      </Link>
                    )}
                  </Td>
                  <Td>{row.client?.name}</Td>
                  <Td>
                    <Badge dot={row.businessType?.color}>{row.businessType?.shortCode}</Badge>
                  </Td>
                  <Td>{date(row.quoteDate)}</Td>
                  <Td align="right" className="font-medium text-slate-900">{money(row.grandTotal)}</Td>
                  <Td
                    align="right"
                    className={
                      !row.totalCost ? 'text-slate-400'
                        : row.marginPct < 15 ? 'text-amber-600'
                        : 'text-slate-600'
                    }
                  >
                    {row.totalCost ? (
                      pct(row.marginPct)
                    ) : (
                      <span title="No cost prices on this quotation yet">—</span>
                    )}
                  </Td>
                  <Td><StatusBadge status={row.status} /></Td>
                  <Td>
                    <div className="flex justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => duplicate(row.id)} title="Duplicate">
                        <Copy className="size-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => revise(row.id)} title="Create revision">
                        <GitBranch className="size-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => toggleArchive(row)} title={row.archivedAt ? 'Restore' : 'Archive'}>
                        <Archive className="size-3.5" />
                      </Button>
                    </div>
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
