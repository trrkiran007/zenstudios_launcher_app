import { Building2, Pencil, Plus, Search, User } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ClientForm } from '../components/ClientPicker';
import {
  Badge, Button, Card, EmptyState, ErrorState, Input, Loading, PageHeader,
  Table, Td, Th, useAction,
} from '../components/ui';
import { api, useApi } from '../lib/api';
import type { Client } from '../lib/types';

export function Clients() {
  const [q, setQ] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [creating, setCreating] = useState(false);
  const { run } = useAction();

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (showArchived) p.set('archived', '1');
    return `/clients?${p}`;
  }, [q, showArchived]);

  const { data, loading, error, reload } = useApi<Client[]>(query);

  const toggleArchive = (client: Client) =>
    run(async () => {
      await api.put(`/clients/${client.id}`, { archived: !client.archived });
      await reload();
    }, client.archived ? 'Client restored' : 'Client archived');

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle={`${data?.length ?? 0} record(s)`}
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
            New client
          </Button>
        }
      />

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search name, GSTIN, phone, city…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Button variant={showArchived ? 'primary' : 'secondary'} onClick={() => setShowArchived((a) => !a)}>
            {showArchived ? 'Including archived' : 'Show archived'}
          </Button>
        </div>

        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !data?.length ? (
          <EmptyState
            icon={<Building2 className="size-10" />}
            title="No clients yet"
            description="Add the companies and individuals you quote for. Their GSTIN drives the CGST/SGST vs IGST split automatically."
            action={<Button variant="primary" onClick={() => setCreating(true)}>Add a client</Button>}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Contact</Th>
                <Th>Location</Th>
                <Th>GSTIN</Th>
                <Th align="center">Quotes</Th>
                <Th align="center">Projects</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id} className="group hover:bg-slate-50">
                  <Td>
                    <div className="flex items-center gap-2">
                      {c.kind === 'COMPANY' ? (
                        <Building2 className="size-4 shrink-0 text-slate-400" />
                      ) : (
                        <User className="size-4 shrink-0 text-slate-400" />
                      )}
                      <span className="font-medium text-slate-900">{c.name}</span>
                      {c.archived && <Badge tone="amber">archived</Badge>}
                    </div>
                  </Td>
                  <Td>
                    {c.contactPerson && <p>{c.contactPerson}</p>}
                    <p className="text-xs text-slate-500">{[c.phone, c.email].filter(Boolean).join(' · ') || '—'}</p>
                  </Td>
                  <Td>{[c.city, c.state].filter(Boolean).join(', ') || '—'}</Td>
                  <Td className="font-mono text-xs">{c.gstin || <span className="text-slate-400">Unregistered</span>}</Td>
                  <Td align="center">{c._count?.quotations ?? 0}</Td>
                  <Td align="center">{c._count?.projects ?? 0}</Td>
                  <Td>
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleArchive(c)}>
                        {c.archived ? 'Restore' : 'Archive'}
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <ClientForm open={creating} onClose={() => setCreating(false)} onSaved={reload} />
      <ClientForm open={!!editing} initial={editing} onClose={() => setEditing(null)} onSaved={reload} />
    </>
  );
}
