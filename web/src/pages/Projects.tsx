import { Boxes, LayoutGrid, List, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ProjectDetail } from '../components/ProjectDetail';
import {
  Badge, Button, Card, EmptyState, ErrorState, Input, Loading, PageHeader,
  Table, Tabs, Td, Th, cx,
} from '../components/ui';
import { useApi } from '../lib/api';
import { useActiveBusinessTypes } from '../lib/app-context';
import { date, money, pct } from '../lib/format';
import type { Project } from '../lib/types';

const OPEN_TABS_KEY = 'zen.openProjects';

type OpenTab = { id: string; code: string; name: string; color: string; businessTypeId: string };

function readOpenTabs(): OpenTab[] {
  try {
    return JSON.parse(localStorage.getItem(OPEN_TABS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function Projects() {
  const { id } = useParams();
  const navigate = useNavigate();
  const businessTypes = useActiveBusinessTypes();

  const [tab, setTab] = useState<string>(businessTypes[0]?.id ?? 'ALL');
  const [view, setView] = useState<'board' | 'list'>('board');
  const [q, setQ] = useState('');
  const [openTabs, setOpenTabs] = useState<OpenTab[]>(readOpenTabs);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (tab !== 'ALL') p.set('businessTypeId', tab);
    if (q.trim()) p.set('q', q.trim());
    return `/projects?${p}`;
  }, [tab, q]);

  const { data, loading, error, reload } = useApi<Project[]>(query);

  useEffect(() => {
    localStorage.setItem(OPEN_TABS_KEY, JSON.stringify(openTabs));
  }, [openTabs]);

  // Opening a project adds it to the tab strip, so several stay reachable at once.
  useEffect(() => {
    if (!id || !data) return;
    const project = data.find((p) => p.id === id);
    if (!project) return;
    setOpenTabs((tabs) =>
      tabs.some((t) => t.id === id)
        ? tabs
        : [
            ...tabs,
            {
              id: project.id,
              code: project.code,
              name: project.name,
              color: project.businessType?.color ?? '#16A34A',
              businessTypeId: project.businessTypeId,
            },
          ].slice(-8),
    );
  }, [id, data]);

  const closeTab = (tabId: string) => {
    setOpenTabs((tabs) => {
      const next = tabs.filter((t) => t.id !== tabId);
      if (tabId === id) navigate(next.length ? `/projects/${next[next.length - 1].id}` : '/projects');
      return next;
    });
  };

  const businessType = businessTypes.find((b) => b.id === tab);
  const stages = businessType?.stages ?? [];

  const byStage = useMemo(() => {
    const map = new Map<string, Project[]>();
    for (const stage of stages) map.set(stage.id, []);
    for (const p of data ?? []) {
      if (!map.has(p.stageId)) map.set(p.stageId, []);
      map.get(p.stageId)!.push(p);
    }
    return map;
  }, [data, stages]);

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Converted opportunities, tracked stage by stage"
        actions={
          <div className="flex overflow-hidden rounded-lg ring-1 ring-slate-300">
            <button
              onClick={() => setView('board')}
              className={cx('px-3 py-1.5 text-sm', view === 'board' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600')}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={cx('px-3 py-1.5 text-sm', view === 'list' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600')}
            >
              <List className="size-4" />
            </button>
          </div>
        }
      >
        <Tabs
          value={tab}
          onChange={(v) => {
            setTab(v);
            if (id) navigate('/projects');
          }}
          tabs={[
            ...businessTypes.map((b) => ({ value: b.id, label: b.name, color: b.color })),
            { value: 'ALL', label: 'All' },
          ]}
        />
      </PageHeader>

      {openTabs.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {openTabs.map((t) => (
            <div
              key={t.id}
              className={cx(
                'group flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium ring-1 transition',
                t.id === id
                  ? 'bg-white text-slate-900 ring-slate-300 shadow-sm'
                  : 'bg-slate-100 text-slate-600 ring-transparent hover:bg-slate-200',
              )}
            >
              <span className="size-2 rounded-full" style={{ background: t.color }} />
              <button onClick={() => navigate(`/projects/${t.id}`)} className="max-w-[180px] truncate">
                {t.code} · {t.name}
              </button>
              <button onClick={() => closeTab(t.id)} className="text-slate-400 hover:text-slate-700">
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {id ? (
        <ProjectDetail key={id} id={id} />
      ) : (
        <>
          <div className="mb-4 relative max-w-sm">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search code, name or client…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>

          {loading ? (
            <Loading />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : !data?.length ? (
            <Card>
              <EmptyState
                icon={<Boxes className="size-10" />}
                title="No projects yet"
                description="Projects appear here when you convert an accepted quotation. Open a quotation and choose “Convert to project”."
                action={<Button variant="primary" onClick={() => navigate('/quotations')}>Go to quotations</Button>}
              />
            </Card>
          ) : view === 'board' && tab !== 'ALL' ? (
            <div className="flex gap-3 overflow-x-auto pb-4">
              {stages.map((stage) => {
                const items = byStage.get(stage.id) ?? [];
                return (
                  <div key={stage.id} className="w-72 shrink-0">
                    <div className="mb-2 flex items-center justify-between px-1">
                      <span className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-600 uppercase">
                        <span className="size-2 rounded-full" style={{ background: stage.color }} />
                        {stage.name}
                      </span>
                      <span className="text-xs text-slate-400">{items.length}</span>
                    </div>
                    <div className="min-h-[80px] space-y-2 rounded-xl bg-slate-100/70 p-2">
                      {items.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => navigate(`/projects/${p.id}`)}
                          className="w-full rounded-lg bg-white p-3 text-left shadow-sm ring-1 ring-slate-200 transition hover:ring-brand-300"
                        >
                          <p className="text-xs font-medium text-slate-400">{p.code}</p>
                          <p className="mt-0.5 line-clamp-2 text-sm font-medium text-slate-900">{p.name}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">{p.client?.name}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="tnum text-xs font-semibold text-slate-700">{money(p.contractValue)}</span>
                            {!!p.openTaskCount && <Badge tone="amber">{p.openTaskCount} open</Badge>}
                          </div>
                        </button>
                      ))}
                      {!items.length && <p className="py-4 text-center text-xs text-slate-400">Empty</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Card padded={false}>
              <Table>
                <thead>
                  <tr>
                    <Th>Code</Th>
                    <Th>Project</Th>
                    <Th>Client</Th>
                    <Th>Stage</Th>
                    <Th align="right">Value</Th>
                    <Th align="right">Margin</Th>
                    <Th>Target</Th>
                    <Th align="center">Open tasks</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((p) => {
                    const margin = p.contractValue ? ((p.contractValue - p.estimatedCost) / p.contractValue) * 100 : 0;
                    return (
                      <tr key={p.id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/projects/${p.id}`)}>
                        <Td className="font-medium text-brand-700">{p.code}</Td>
                        <Td className="max-w-[240px]"><span className="line-clamp-1 text-slate-900">{p.name}</span></Td>
                        <Td>{p.client?.name}</Td>
                        <Td><Badge dot={p.stage?.color}>{p.stage?.name}</Badge></Td>
                        <Td align="right" className="font-medium text-slate-900">{money(p.contractValue)}</Td>
                        <Td align="right">{pct(margin)}</Td>
                        <Td>{date(p.targetDate)}</Td>
                        <Td align="center">{p.openTaskCount || '—'}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card>
          )}
        </>
      )}
    </>
  );
}
