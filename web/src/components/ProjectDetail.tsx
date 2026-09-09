import {
  CheckCircle2, ChevronRight, CirclePlus, ExternalLink, FileText, Paperclip, Plus,
  Receipt, Trash2, Wallet,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, useApi } from '../lib/api';
import { date, dateInput, dateTime, fileSize, money, pct, relative } from '../lib/format';
import type { Expense, ProjectDetail as Detail, Task } from '../lib/types';
import { Attachments } from './Attachments';
import {
  Badge, Button, Card, Checkbox, ErrorState, Field, Input, Loading, Modal,
  Select, Stat, Table, Tabs, Td, Textarea, Th, cx, useAction,
} from './ui';

const TASK_STATUS: Task['status'][] = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'];
const PRIORITY_TONE: Record<string, 'slate' | 'blue' | 'amber' | 'red'> = {
  LOW: 'slate', MEDIUM: 'blue', HIGH: 'amber', URGENT: 'red',
};

export function ProjectDetail({
  id,
  onLoaded,
}: {
  id: string;
  /** Reports the project's line of business so the page tabs can follow it. */
  onLoaded?: (businessTypeId: string) => void;
}) {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi<Detail>(`/projects/${id}`, [id]);

  useEffect(() => {
    if (data?.businessTypeId) onLoaded?.(data.businessTypeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.businessTypeId]);
  const { run, busy } = useAction();
  const [tab, setTab] = useState<'overview' | 'tasks' | 'money' | 'files' | 'log'>('overview');
  const [stageNote, setStageNote] = useState('');
  const [stageFiles, setStageFiles] = useState<File[]>([]);
  const [attachingTo, setAttachingTo] = useState<string | null>(null);
  const [billing, setBilling] = useState(false);
  const [billMode, setBillMode] = useState<'REMAINING' | 'PERCENT' | 'AMOUNT'>('REMAINING');
  const [billPct, setBillPct] = useState(50);
  const [billAmount, setBillAmount] = useState(0);
  const [billType, setBillType] = useState<'TAX' | 'PROFORMA'>('TAX');
  const [billLabel, setBillLabel] = useState('');
  const [billQuoteTerms, setBillQuoteTerms] = useState(false);

  const [movingTo, setMovingTo] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<Partial<Task> | null>(null);
  const [expenseForm, setExpenseForm] = useState<Partial<Expense> | null>(null);
  const [note, setNote] = useState('');

  /**
   * Keep an open editor's attachment list in step with the server.
   *
   * The task and expense modals render from a snapshot taken when they opened,
   * so uploading or deleting refreshed the project behind them while the modal
   * kept showing the old list — an upload appeared to do nothing, and deleting
   * twice asked the server to remove an id that was already gone.
   */
  const ids = (list?: { id: string }[]) => (list ?? []).map((a) => a.id).join(',');

  useEffect(() => {
    if (!data || !taskForm?.id) return;
    const fresh = data.tasks.find((t) => t.id === taskForm.id);
    if (fresh && ids(fresh.attachments) !== ids(taskForm.attachments)) {
      setTaskForm((f) => (f && f.id === fresh.id ? { ...f, attachments: fresh.attachments } : f));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, taskForm?.id]);

  useEffect(() => {
    if (!data || !expenseForm?.id) return;
    const fresh = data.expenses.find((e) => e.id === expenseForm.id);
    if (fresh && ids(fresh.attachments) !== ids(expenseForm.attachments)) {
      setExpenseForm((f) => (f && f.id === fresh.id ? { ...f, attachments: fresh.attachments } : f));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, expenseForm?.id]);

  const { data: billPos, reload: reloadBilling } = useApi<{
    contractTaxable: number; invoicedTaxable: number; remainingTaxable: number;
    receivedTotal: number; invoiceCount: number; clientArchived: boolean; clientName: string;
  }>(`/invoices/billing/project/${id}`, [id]);

  const raiseInvoice = () =>
    run(async () => {
      const inv = await api.post<{ id: string }>('/invoices/from-project', {
        projectId: id,
        type: billType,
        mode: billMode,
        ...(billMode === 'PERCENT' ? { percentage: billPct } : {}),
        ...(billMode === 'AMOUNT' ? { amount: billAmount } : {}),
        label: billLabel.trim() || null,
        useQuotationTerms: billQuoteTerms,
      });
      setBilling(false);
      await Promise.all([reload(), reloadBilling()]);
      navigate(`/invoices?open=${inv.id}`);
    }, 'Invoice drafted');

  const { data: categories } = useApi<string[]>('/expenses/categories');

  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? 'Project not found'} onRetry={reload} />;

  const stageIndex = data.stages.findIndex((s) => s.id === data.stageId);

  /**
   * Conversion seeds the first few tasks from stage names, so a done task often
   * means the project has really moved on. Ticking a task deliberately does not
   * move the stage — that stays an explicit decision — but when the checklist
   * has clearly run ahead we say so and offer the move in one click.
   */
  const stageSuggestion = (() => {
    const done = new Set(
      data.tasks.filter((t) => t.status === 'DONE').map((t) => t.title.trim().toLowerCase()),
    );
    let furthest = -1;
    data.stages.forEach((st, i) => {
      if (done.has(st.name.trim().toLowerCase())) furthest = Math.max(furthest, i);
    });
    // Suggest the stage after the last completed one.
    const target = data.stages[furthest + 1];
    // Only when the checklist is genuinely ahead of the stage. Equal means the
    // current stage's own task is ticked, which is not a discrepancy.
    if (furthest < 0 || !target || furthest <= stageIndex) return null;
    return { target, completed: data.stages[furthest] };
  })();

  const nextStage = data.stages[stageIndex + 1];

  const moveStage = (stageId: string) =>
    run(async () => {
      // The move first, then its paperwork onto the note the move created, so a
      // failed upload cannot leave the project stranded between stages.
      const moved = await api.patch<{ stageNoteId?: string }>(`/projects/${data.id}/stage`, {
        stageId,
        note: stageNote || null,
      });

      if (stageFiles.length && moved.stageNoteId) {
        const form = new FormData();
        form.append('noteId', moved.stageNoteId);
        stageFiles.forEach((f) => form.append('files', f));
        await api.upload('/attachments', form);
      }

      setStageNote('');
      setStageFiles([]);
      setMovingTo(null);
      await reload();
    }, stageFiles.length ? `Stage updated · ${stageFiles.length} file(s) attached` : 'Stage updated');

  const saveTask = () =>
    run(async () => {
      const body = {
        projectId: data.id,
        title: taskForm!.title,
        description: taskForm!.description ?? null,
        assignee: taskForm!.assignee ?? null,
        status: taskForm!.status ?? 'TODO',
        priority: taskForm!.priority ?? 'MEDIUM',
        dueDate: taskForm!.dueDate || null,
      };
      if (taskForm!.id) await api.put(`/tasks/${taskForm!.id}`, body);
      else await api.post('/tasks', body);
      setTaskForm(null);
      await reload();
    }, taskForm?.id ? 'Task updated' : 'Task added');

  const toggleTask = (task: Task) =>
    run(async () => {
      await api.put(`/tasks/${task.id}`, { status: task.status === 'DONE' ? 'TODO' : 'DONE' });
      await reload();
    });

  const saveExpense = () =>
    run(async () => {
      const body = {
        projectId: data.id,
        date: expenseForm!.date || null,
        category: expenseForm!.category ?? 'Material',
        vendor: expenseForm!.vendor ?? null,
        description: expenseForm!.description ?? null,
        amount: Number(expenseForm!.amount) || 0,
        gstAmount: Number(expenseForm!.gstAmount) || 0,
        billable: !!expenseForm!.billable,
        paymentStatus: expenseForm!.paymentStatus ?? 'PAID',
        reference: expenseForm!.reference ?? null,
      };
      if (expenseForm!.id) await api.put(`/expenses/${expenseForm!.id}`, body);
      else await api.post('/expenses', body);
      setExpenseForm(null);
      await reload();
    }, expenseForm?.id ? 'Expense updated' : 'Expense recorded');

  const addNote = () =>
    run(async () => {
      await api.post('/notes', { projectId: data.id, body: note });
      setNote('');
      await reload();
    }, 'Note added');

  const openTasks = data.tasks.filter((t) => t.status !== 'DONE');

  return (
    <div className="space-y-5">
      {/* Stage rail */}
      <Card padded={false}>
        <div className="flex items-center gap-1 overflow-x-auto px-4 py-3">
          {data.stages.map((stage, i) => {
            const done = i < stageIndex;
            const current = stage.id === data.stageId;
            return (
              <button
                key={stage.id}
                onClick={() => !current && setMovingTo(stage.id)}
                className={cx(
                  'flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition',
                  current
                    ? 'text-white shadow-sm'
                    : done
                      ? 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100',
                )}
                style={current ? { background: stage.color } : undefined}
              >
                {done && <CheckCircle2 className="size-3.5" />}
                {stage.name}
                {i < data.stages.length - 1 && <ChevronRight className="size-3 opacity-40" />}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Contract value" value={money(data.finance.contractValue)} sub={data.quotation?.number} />
        <Stat
          label="Budgeted profit"
          value={money(data.finance.budgetedProfit)}
          sub={`${pct(data.finance.budgetedMarginPct)} on ${money(data.finance.budgetedCost)} of quoted cost`}
          tone={data.finance.budgetedProfit >= 0 ? 'good' : 'bad'}
        />
        <Stat
          label="Spent so far"
          value={money(data.finance.actualCost)}
          sub={
            data.finance.budgetedCost > 0
              ? `${pct(data.finance.spendAgainstBudgetPct)} of budget · ${
                  data.finance.costVariance >= 0
                    ? `${money(data.finance.costVariance)} left`
                    : `${money(-data.finance.costVariance)} over`
                }`
              : 'No budget set'
          }
          tone={data.finance.costVariance < 0 ? 'bad' : 'default'}
        />
        <Stat
          label="Outstanding"
          value={money(data.finance.outstanding)}
          sub={`${money(data.finance.receivedTotal)} received of ${money(data.finance.invoicedTotal)}`}
          tone={data.finance.outstanding > 0 ? 'warn' : 'default'}
        />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'tasks', label: 'Tasks', count: openTasks.length },
          { value: 'money', label: 'Money', count: data.expenses.length + data.invoices.length },
          { value: 'files', label: 'Files', count: data.attachments.length },
          { value: 'log', label: 'Activity', count: data.notesLog.length },
        ]}
      />

      {tab === 'overview' && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Card title="Project" className="lg:col-span-2">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail2 label="Code" value={data.code} />
              <Detail2 label="Client" value={data.client?.name ?? '—'} />
              <Detail2 label="Line of business" value={data.businessType?.name ?? '—'} />
              <Detail2 label="Current stage" value={data.stage?.name ?? '—'} />
              <Detail2 label="Started" value={date(data.startDate)} />
              <Detail2 label="Target" value={date(data.targetDate)} />
              <Detail2 label="Status" value={<span className="capitalize">{data.status.replace('_', ' ').toLowerCase()}</span>} />
              <Detail2
                label="Source quotation"
                value={
                  data.quotation ? (
                    <Link to={`/quotations/${data.quotation.id}`} className="text-brand-700 hover:underline">
                      {data.quotation.number} <ExternalLink className="inline size-3" />
                    </Link>
                  ) : (
                    '—'
                  )
                }
              />
            </dl>
            {data.description && <p className="mt-4 text-sm whitespace-pre-wrap text-slate-600">{data.description}</p>}
          </Card>

          <Card title="Move forward">
            {nextStage ? (
              <>
                <p className="text-sm text-slate-600">
                  Next stage is <span className="font-medium text-slate-900">{nextStage.name}</span>.
                </p>
                <Button
                  variant="primary"
                  className="mt-3 w-full"
                  disabled={busy}
                  onClick={() => setMovingTo(nextStage.id)}
                >
                  Move to {nextStage.name}
                </Button>
              </>
            ) : (
              <p className="text-sm text-slate-500">This project is at the final stage.</p>
            )}
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="mb-2 text-xs font-medium text-slate-500">Open tasks</p>
              {openTasks.length ? (
                <ul className="space-y-1.5">
                  {openTasks.slice(0, 5).map((t) => (
                    <li key={t.id} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-slate-300" />
                      <span className="min-w-0 flex-1 truncate text-slate-700">{t.title}</span>
                      {t.dueDate && <span className="shrink-0 text-xs text-slate-400">{relative(t.dueDate)}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Nothing open.</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {tab === 'tasks' && (
        <Card
          padded={false}
          title="Tasks"
          subtitle={`${openTasks.length} open of ${data.tasks.length} · ticking these does not move the project stage`}
          actions={
            <Button size="sm" variant="primary" icon={<Plus className="size-3.5" />} onClick={() => setTaskForm({ status: 'TODO', priority: 'MEDIUM' })}>
              Add task
            </Button>
          }
        >
          {stageSuggestion && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-amber-50/60 px-4 py-3">
              <p className="text-sm text-amber-900">
                Tasks are ticked through <strong>{stageSuggestion.completed.name}</strong>, but the
                project is still in <strong>{data.stage?.name}</strong>.
              </p>
              <Button size="sm" onClick={() => setMovingTo(stageSuggestion.target.id)}>
                Move to {stageSuggestion.target.name}
              </Button>
            </div>
          )}

          {data.tasks.length ? (
            <Table>
              <thead>
                <tr>
                  <Th className="w-8" />
                  <Th>Task</Th>
                  <Th>Assignee</Th>
                  <Th>Priority</Th>
                  <Th>Due</Th>
                  <Th>Status</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {data.tasks.map((t) => (
                  <tr key={t.id} className="group hover:bg-slate-50">
                    <Td>
                      <input
                        type="checkbox"
                        checked={t.status === 'DONE'}
                        onChange={() => toggleTask(t)}
                        className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                      />
                    </Td>
                    <Td>
                      <button onClick={() => setTaskForm({ ...t, dueDate: dateInput(t.dueDate) })} className="text-left">
                        <p className={cx('font-medium', t.status === 'DONE' ? 'text-slate-400 line-through' : 'text-slate-900')}>
                          {t.title}
                        </p>
                        {t.description && <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{t.description}</p>}
                      </button>
                    </Td>
                    <Td>{t.assignee || <span className="text-slate-400">Unassigned</span>}</Td>
                    <Td><Badge tone={PRIORITY_TONE[t.priority]}>{t.priority.toLowerCase()}</Badge></Td>
                    <Td>
                      {t.dueDate ? (
                        <span className={new Date(t.dueDate) < new Date() && t.status !== 'DONE' ? 'text-red-600' : ''}>
                          {date(t.dueDate)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </Td>
                    <Td>
                      <Select
                        value={t.status}
                        onChange={(e) =>
                          run(async () => {
                            await api.put(`/tasks/${t.id}`, { status: e.target.value });
                            await reload();
                          })
                        }
                        className="h-7 py-0 text-xs"
                      >
                        {TASK_STATUS.map((s) => (
                          <option key={s} value={s}>{s.replace('_', ' ').toLowerCase()}</option>
                        ))}
                      </Select>
                    </Td>
                    <Td>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100"
                        onClick={() =>
                          run(async () => {
                            await api.del(`/tasks/${t.id}`);
                            await reload();
                          }, 'Task deleted')
                        }
                      >
                        <Trash2 className="size-3.5 text-red-500" />
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-500">No tasks yet.</p>
              <Button className="mt-3" size="sm" onClick={() => setTaskForm({ status: 'TODO', priority: 'MEDIUM' })}>
                Add the first task
              </Button>
            </div>
          )}
        </Card>
      )}

      {tab === 'money' && (
        <div className="space-y-5">
          <Card
            padded={false}
            title="Invoices"
            subtitle={
              billPos
                ? `${money(billPos.invoicedTaxable)} of ${money(billPos.contractTaxable)} invoiced (before GST) · ${money(billPos.remainingTaxable)} left`
                : undefined
            }
            actions={
              <div className="flex items-center gap-2">
                <Link to="/invoices" className="text-xs font-medium text-brand-700 hover:underline">
                  All invoices
                </Link>
                <Button
                  size="sm"
                  variant="primary"
                  icon={<Receipt className="size-3.5" />}
                  onClick={() => {
                    setBillAmount(billPos?.remainingTaxable ?? 0);
                    setBillMode(billPos && billPos.remainingTaxable > 0 ? 'REMAINING' : 'AMOUNT');
                    setBilling(true);
                  }}
                >
                  Raise invoice
                </Button>
              </div>
            }
          >
            {data.invoices.length ? (
              <Table>
                <thead>
                  <tr>
                    <Th>Number</Th>
                    <Th>Type</Th>
                    <Th>Issued</Th>
                    <Th align="right">Total</Th>
                    <Th align="right">Received</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((inv) => (
                    <tr key={inv.id}>
                      <Td className="font-medium text-slate-900">{inv.number}</Td>
                      <Td>{inv.type === 'TAX' ? 'Tax invoice' : 'Proforma'}</Td>
                      <Td>{date(inv.issueDate)}</Td>
                      <Td align="right">{money(inv.grandTotal)}</Td>
                      <Td align="right">{money(inv.amountPaid)}</Td>
                      <Td><Badge tone={inv.status === 'PAID' ? 'green' : inv.status === 'CANCELLED' ? 'red' : 'blue'}>{inv.status.replace('_', ' ').toLowerCase()}</Badge></Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                Nothing invoiced yet. Use <strong>Raise invoice</strong> above to bill the
                whole contract, a percentage milestone, or a specific amount.
              </p>
            )}
          </Card>

          <Card
            padded={false}
            title="Expenses"
            subtitle={`${money(data.finance.actualCost)} spent against a ${money(data.finance.budgetedCost)} budget · profit at actuals ${money(data.finance.actualProfit)} (${pct(data.finance.actualMarginPct)})`}
            actions={
              <Button size="sm" variant="primary" icon={<CirclePlus className="size-3.5" />} onClick={() => setExpenseForm({ category: 'Material', paymentStatus: 'PAID', date: dateInput(new Date()) })}>
                Record expense
              </Button>
            }
          >
            {data.expenses.length ? (
              <Table>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Category</Th>
                    <Th>Vendor</Th>
                    <Th>Description</Th>
                    <Th align="right">Amount</Th>
                    <Th>Status</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {data.expenses.map((e) => (
                    <tr key={e.id} className="group hover:bg-slate-50">
                      <Td>{date(e.date)}</Td>
                      <Td>{e.category}</Td>
                      <Td>{e.vendor || '—'}</Td>
                      <Td className="max-w-[240px]"><span className="line-clamp-1">{e.description || '—'}</span></Td>
                      <Td align="right" className="font-medium text-slate-900">{money(e.amount)}</Td>
                      <Td><Badge tone={e.paymentStatus === 'PAID' ? 'green' : 'amber'}>{e.paymentStatus.toLowerCase()}</Badge></Td>
                      <Td>
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100">
                          <Button size="sm" variant="ghost" onClick={() => setExpenseForm({ ...e, date: dateInput(e.date) })}>
                            <Wallet className="size-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              run(async () => {
                                await api.del(`/expenses/${e.id}`);
                                await reload();
                              }, 'Expense deleted')
                            }
                          >
                            <Trash2 className="size-3.5 text-red-500" />
                          </Button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">No expenses recorded yet.</p>
            )}
          </Card>
        </div>
      )}

      {tab === 'files' && (
        <Card title="Files & screenshots" subtitle="Site photos, signed copies, drawings, bills">
          <Attachments owner={{ projectId: data.id }} items={data.attachments} onChange={reload} />
        </Card>
      )}

      {tab === 'log' && (
        <Card title="Activity log">
          <div className="mb-4 flex gap-2">
            <Input
              placeholder="Log a note — site visit, client call, delay reason…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && note.trim() && addNote()}
            />
            <Button variant="primary" disabled={!note.trim() || busy} onClick={addNote}>Add</Button>
          </div>
          {data.notesLog.length ? (
            <ul className="space-y-4">
              {data.notesLog.map((n) => (
                <li key={n.id} className="flex gap-3">
                  <span
                    className={cx(
                      'mt-1.5 size-2 shrink-0 rounded-full',
                      n.kind === 'NOTE' ? 'bg-brand-500' : n.kind === 'STAGE_CHANGE' ? 'bg-sky-500' : 'bg-slate-300',
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700">{n.body}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{n.author} · {dateTime(n.createdAt)}</p>
                    {n.attachments?.length ? (
                      <div className="mt-2">
                        <Attachments owner={{ noteId: n.id }} items={n.attachments} onChange={reload} compact />
                      </div>
                    ) : (
                      // Without this a note with no files could never get one.
                      <button
                        className="mt-1 text-xs font-medium text-slate-400 hover:text-brand-700"
                        onClick={() => setAttachingTo(attachingTo === n.id ? null : n.id)}
                      >
                        {attachingTo === n.id ? 'Cancel' : '+ Attach a file'}
                      </button>
                    )}
                    {attachingTo === n.id && !n.attachments?.length && (
                      <div className="mt-2">
                        <Attachments
                          owner={{ noteId: n.id }}
                          items={[]}
                          onChange={async () => {
                            setAttachingTo(null);
                            await reload();
                          }}
                          compact
                        />
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">Nothing logged yet.</p>
          )}
        </Card>
      )}

      {/* Stage move */}
      <Modal
        open={!!movingTo}
        onClose={() => setMovingTo(null)}
        title={`Move to ${data.stages.find((s) => s.id === movingTo)?.name ?? ''}`}
        description="The move is recorded in the activity log with your note."
        footer={
          <>
            <Button onClick={() => setMovingTo(null)}>Cancel</Button>
            <Button variant="primary" loading={busy} onClick={() => movingTo && moveStage(movingTo)}>Move</Button>
          </>
        }
      >
        <Field label="Note (optional)">
          <Textarea rows={3} value={stageNote} onChange={(e) => setStageNote(e.target.value)} placeholder="What changed?" />
        </Field>

        <div className="mt-4">
          <Field label="Attach paperwork (optional)">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-xs text-slate-500 transition hover:border-brand-400 hover:bg-brand-50">
              <Paperclip className="size-4 text-slate-400" />
              <span>
                Purchase order, signed approval, delivery challan, site photos —{' '}
                <span className="font-medium text-brand-700">browse</span>
              </span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  setStageFiles(Array.from(e.target.files ?? []));
                  e.target.value = '';
                }}
              />
            </label>
          </Field>

          {stageFiles.length > 0 && (
            <ul className="mt-2 space-y-1">
              {stageFiles.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-2 rounded bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700"
                >
                  <FileText className="size-3.5 shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1 truncate">{f.name}</span>
                  <span className="text-slate-400">{fileSize(f.size)}</span>
                  <button
                    className="text-slate-400 hover:text-red-500"
                    onClick={() => setStageFiles((fs) => fs.filter((_, n) => n !== i))}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1.5 text-xs text-slate-500">
            Filed against this move in the Activity log, so it stays with the stage it belongs to.
          </p>
        </div>
      </Modal>

      {/* Task */}
      <Modal
        open={!!taskForm}
        onClose={() => setTaskForm(null)}
        title={taskForm?.id ? 'Edit task' : 'New task'}
        footer={
          <>
            <Button onClick={() => setTaskForm(null)}>Cancel</Button>
            <Button variant="primary" loading={busy} disabled={!taskForm?.title?.trim()} onClick={saveTask}>Save</Button>
          </>
        }
      >
        {taskForm && (
          <div className="space-y-4">
            <Field label="Title" required>
              <Input value={taskForm.title ?? ''} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
            </Field>
            <Field label="Description">
              <Textarea rows={3} value={taskForm.description ?? ''} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Assignee" hint="Type a teammate's name">
                <Input value={taskForm.assignee ?? ''} onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })} />
              </Field>
              <Field label="Due date">
                <Input type="date" value={(taskForm.dueDate as string) ?? ''} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
              </Field>
              <Field label="Priority">
                <Select value={taskForm.priority ?? 'MEDIUM'} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as Task['priority'] })}>
                  {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
                    <option key={p} value={p}>{p.toLowerCase()}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Status">
                <Select value={taskForm.status ?? 'TODO'} onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as Task['status'] })}>
                  {TASK_STATUS.map((s) => (
                    <option key={s} value={s}>{s.replace('_', ' ').toLowerCase()}</option>
                  ))}
                </Select>
              </Field>
            </div>
            {taskForm.id && (
              <div className="border-t border-slate-100 pt-4">
                <p className="mb-2 text-[13px] font-medium text-slate-700">Attachments</p>
                <Attachments owner={{ taskId: taskForm.id }} items={taskForm.attachments ?? []} onChange={reload} compact />
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={billing}
        onClose={() => setBilling(false)}
        title="Raise an invoice for this project"
        description="Billed against the contract, so it knows what has already been invoiced."
        footer={
          <>
            <Button onClick={() => setBilling(false)}>Cancel</Button>
            <Button variant="primary" loading={busy} onClick={raiseInvoice}>Create draft</Button>
          </>
        }
      >
        {billPos && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-center">
              <div>
                <p className="text-[11px] tracking-wide text-slate-500 uppercase">Contract</p>
                <p className="tnum text-sm font-semibold text-slate-900">{money(billPos.contractTaxable)}</p>
              </div>
              <div>
                <p className="text-[11px] tracking-wide text-slate-500 uppercase">Invoiced</p>
                <p className="tnum text-sm font-semibold text-slate-900">{money(billPos.invoicedTaxable)}</p>
              </div>
              <div>
                <p className="text-[11px] tracking-wide text-slate-500 uppercase">Left</p>
                <p className={cx('tnum text-sm font-semibold', billPos.remainingTaxable > 0 ? 'text-brand-700' : 'text-slate-400')}>
                  {money(billPos.remainingTaxable)}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500">All three figures are before GST.</p>

            {billPos.remainingTaxable <= 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
                The whole contract is already invoiced on {billPos.invoiceCount} document(s). If the
                client still owes you money, that is a <strong>payment</strong> outstanding, not a new
                invoice — record what they have paid against the existing invoice and its balance will
                show what is due. Raising a second tax invoice for the same work would declare the
                supply twice and pay GST on it twice.
              </div>
            )}

            {billPos.clientArchived && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
                This project bills <strong>{billPos.clientName}</strong>, an archived client record.
                Check that is still the right one before issuing.
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Document type">
                <Select value={billType} onChange={(e) => setBillType(e.target.value as 'TAX' | 'PROFORMA')}>
                  <option value="TAX">Tax invoice</option>
                  <option value="PROFORMA">Proforma / payment request</option>
                </Select>
              </Field>
              <Field label="Amount to bill">
                <Select value={billMode} onChange={(e) => setBillMode(e.target.value as typeof billMode)}>
                  <option value="REMAINING">Everything not yet invoiced</option>
                  <option value="PERCENT">A percentage of the contract</option>
                  <option value="AMOUNT">A specific amount</option>
                </Select>
              </Field>
            </div>

            {billMode === 'PERCENT' && (
              <Field label="Percentage of contract" hint={`= ${money((billPos.contractTaxable * billPct) / 100)} before GST`}>
                <Input type="number" min={1} max={100} value={billPct} onChange={(e) => setBillPct(Number(e.target.value))} />
              </Field>
            )}
            {billMode === 'AMOUNT' && (
              <Field label="Amount before GST">
                <Input type="number" min={1} value={billAmount} onChange={(e) => setBillAmount(Number(e.target.value))} />
              </Field>
            )}

            <Field label="Terms to print on the invoice">
              <Select
                value={billQuoteTerms ? 'QUOTE' : 'ORG'}
                onChange={(e) => setBillQuoteTerms(e.target.value === 'QUOTE')}
              >
                <option value="ORG">My standard invoice terms</option>
                <option value="QUOTE">The quotation&rsquo;s terms — what the client agreed</option>
              </Select>
            </Field>
            {billQuoteTerms && (
              <p className="-mt-2 text-xs text-slate-500">
                Read them once afterwards — a validity clause belongs on a quotation, not an invoice.
              </p>
            )}

            <Field label="Description on the invoice" hint="Leave blank to generate one">
              <Input value={billLabel} onChange={(e) => setBillLabel(e.target.value)} placeholder="Second milestone — fabrication complete" />
            </Field>
          </div>
        )}
      </Modal>

      {/* Expense */}
      <Modal
        open={!!expenseForm}
        onClose={() => setExpenseForm(null)}
        title={expenseForm?.id ? 'Edit expense' : 'Record expense'}
        footer={
          <>
            <Button onClick={() => setExpenseForm(null)}>Cancel</Button>
            <Button variant="primary" loading={busy} disabled={!expenseForm?.amount} onClick={saveExpense}>Save</Button>
          </>
        }
      >
        {expenseForm && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date">
              <Input type="date" value={(expenseForm.date as string) ?? ''} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} />
            </Field>
            <Field label="Category">
              <Select value={expenseForm.category ?? 'Material'} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}>
                {(categories ?? ['Material']).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Vendor">
              <Input value={expenseForm.vendor ?? ''} onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })} />
            </Field>
            <Field label="Reference / bill no.">
              <Input value={expenseForm.reference ?? ''} onChange={(e) => setExpenseForm({ ...expenseForm, reference: e.target.value })} />
            </Field>
            <Field label="Amount (incl. GST)" required>
              <Input type="number" step="0.01" value={expenseForm.amount ?? ''} onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })} />
            </Field>
            <Field label="Of which GST" hint="For your input credit tracking">
              <Input type="number" step="0.01" value={expenseForm.gstAmount ?? ''} onChange={(e) => setExpenseForm({ ...expenseForm, gstAmount: Number(e.target.value) })} />
            </Field>
            <Field label="Payment status">
              <Select value={expenseForm.paymentStatus ?? 'PAID'} onChange={(e) => setExpenseForm({ ...expenseForm, paymentStatus: e.target.value as Expense['paymentStatus'] })}>
                <option value="PAID">Paid</option>
                <option value="PARTIAL">Partially paid</option>
                <option value="UNPAID">Unpaid</option>
              </Select>
            </Field>
            <div className="flex items-end pb-2">
              <Checkbox
                label="Rebillable to client"
                checked={!!expenseForm.billable}
                onChange={(v) => setExpenseForm({ ...expenseForm, billable: v })}
              />
            </div>
            <Field label="Description" className="sm:col-span-2">
              <Textarea rows={2} value={expenseForm.description ?? ''} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} />
            </Field>
            {expenseForm.id && (
              <div className="sm:col-span-2">
                <p className="mb-2 text-[13px] font-medium text-slate-700">Bill / receipt</p>
                <Attachments owner={{ expenseId: expenseForm.id }} items={expenseForm.attachments ?? []} onChange={reload} compact />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Detail2({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

export const ProjectIcons = { FileText, Receipt };
