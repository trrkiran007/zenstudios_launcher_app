import { Download, IndianRupee, Printer, Receipt, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Badge, Button, Card, EmptyState, ErrorState, Field, Input, Loading, Modal,
  PageHeader, Select, Stat, Table, Tabs, Td, Textarea, Th, useAction,
} from '../components/ui';
import { api, useApi } from '../lib/api';
import { useApp } from '../lib/app-context';
import { date, dateInput, money } from '../lib/format';
import type { Invoice } from '../lib/types';

const STATUS_TONE: Record<string, 'slate' | 'blue' | 'amber' | 'green' | 'red'> = {
  DRAFT: 'slate', ISSUED: 'blue', PARTIALLY_PAID: 'amber', PAID: 'green', CANCELLED: 'red',
};

export function Invoices() {
  const [params, setParams] = useSearchParams();
  const { system } = useApp();
  const { run, busy } = useAction();
  const [tab, setTab] = useState<'ALL' | 'TAX' | 'PROFORMA'>('ALL');
  const [openId, setOpenId] = useState<string | null>(params.get('open'));
  const [payment, setPayment] = useState<{ date: string; amount: number; mode: string; reference: string } | null>(null);

  const { data, loading, error, reload } = useApi<Invoice[]>(
    `/invoices${tab === 'ALL' ? '' : `?type=${tab}`}`,
    [tab],
  );
  const { data: detail, reload: reloadDetail } = useApi<Invoice>(openId ? `/invoices/${openId}` : null, [openId]);

  useEffect(() => {
    if (!openId) params.delete('open');
    setParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  const rows = data ?? [];
  const outstanding = rows
    .filter((i) => i.type === 'TAX' && i.status !== 'CANCELLED')
    .reduce((a, i) => a + (i.grandTotal - i.amountPaid), 0);
  const received = rows.reduce((a, i) => a + i.amountPaid, 0);

  const setStatus = (id: string, status: string) =>
    run(async () => {
      await api.patch(`/invoices/${id}/status`, { status });
      await reload();
      if (openId === id) await reloadDetail();
    }, 'Status updated');

  const recordPayment = () =>
    run(async () => {
      await api.post(`/invoices/${openId}/payments`, payment);
      setPayment(null);
      await reload();
      await reloadDetail();
    }, 'Payment recorded');

  return (
    <>
      <PageHeader title="Invoices & payments" subtitle="Proformas, tax invoices and what's still owed">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'ALL', label: 'All' },
            { value: 'TAX', label: 'Tax invoices' },
            { value: 'PROFORMA', label: 'Proformas' },
          ]}
        />
      </PageHeader>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Stat label="Documents" value={rows.length} />
        <Stat label="Received" value={money(received)} tone="good" />
        <Stat label="Outstanding" value={money(outstanding)} tone={outstanding > 0 ? 'warn' : 'default'} />
      </div>

      <Card padded={false}>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !rows.length ? (
          <EmptyState
            icon={<Receipt className="size-10" />}
            title="No invoices yet"
            description="Open an accepted quotation and choose “Raise invoice” to create a full or milestone invoice."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Number</Th>
                <Th>Type</Th>
                <Th>Client</Th>
                <Th>Project</Th>
                <Th>Issued</Th>
                <Th>Due</Th>
                <Th align="right">Total</Th>
                <Th align="right">Balance</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {rows.map((inv) => (
                <tr key={inv.id} className="group hover:bg-slate-50">
                  <Td>
                    <button onClick={() => setOpenId(inv.id)} className="font-medium text-brand-700 hover:underline">
                      {inv.number}
                    </button>
                  </Td>
                  <Td>{inv.type === 'TAX' ? 'Tax invoice' : 'Proforma'}</Td>
                  <Td>{inv.client?.name}</Td>
                  <Td className="text-xs text-slate-500">{inv.project?.code ?? '—'}</Td>
                  <Td>{date(inv.issueDate)}</Td>
                  <Td>
                    {inv.dueDate && new Date(inv.dueDate) < new Date() && inv.status !== 'PAID' ? (
                      <span className="text-red-600">{date(inv.dueDate)}</span>
                    ) : (
                      date(inv.dueDate)
                    )}
                  </Td>
                  <Td align="right" className="font-medium text-slate-900">{money(inv.grandTotal)}</Td>
                  <Td align="right">{money(inv.grandTotal - inv.amountPaid)}</Td>
                  <Td><Badge tone={STATUS_TONE[inv.status]}>{inv.status.replace('_', ' ').toLowerCase()}</Badge></Td>
                  <Td>
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100">
                      <Button size="sm" variant="ghost" onClick={() => window.open(api.fileUrl(`/invoices/${inv.id}/print`), '_blank')}>
                        <Printer className="size-3.5" />
                      </Button>
                      {system?.pdfEngine && (
                        <Button size="sm" variant="ghost" onClick={() => window.open(api.fileUrl(`/invoices/${inv.id}/pdf?download=1`), '_blank')}>
                          <Download className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={!!openId && !!detail}
        onClose={() => setOpenId(null)}
        wide
        title={detail ? `${detail.type === 'TAX' ? 'Tax invoice' : 'Proforma'} ${detail.number}` : ''}
        description={detail?.client?.name}
        footer={
          detail && (
            <>
              <Button
                variant="ghost"
                onClick={() =>
                  run(async () => {
                    await api.del(`/invoices/${detail.id}`);
                    setOpenId(null);
                    await reload();
                  }, 'Invoice deleted')
                }
              >
                <Trash2 className="size-4 text-red-500" />
              </Button>
              <div className="flex-1" />
              <Select
                value={detail.status}
                onChange={(e) => setStatus(detail.id, e.target.value)}
                className="w-44"
              >
                {['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'].map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ').toLowerCase()}</option>
                ))}
              </Select>
              <Button
                variant="primary"
                icon={<IndianRupee className="size-4" />}
                onClick={() =>
                  setPayment({
                    date: dateInput(new Date()),
                    amount: Math.max(0, detail.grandTotal - detail.amountPaid),
                    mode: 'BANK',
                    reference: '',
                  })
                }
              >
                Record payment
              </Button>
            </>
          )
        }
      >
        {detail && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-4">
              <Stat label="Total" value={money(detail.grandTotal)} />
              <Stat label="Received" value={money(detail.amountPaid)} tone="good" />
              <Stat label="Balance" value={money(detail.grandTotal - detail.amountPaid)} tone={detail.grandTotal - detail.amountPaid > 0 ? 'warn' : 'good'} />
              <Stat label="Due" value={date(detail.dueDate)} />
            </div>

            <PoEditor invoice={detail} onSaved={async () => { await reload(); await reloadDetail(); }} />

            <Table>
              <thead>
                <tr>
                  <Th>Description</Th>
                  <Th>Unit</Th>
                  <Th align="right">Qty</Th>
                  <Th align="right">Rate</Th>
                  <Th align="right">GST</Th>
                  <Th align="right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {(detail.items ?? []).map((it, i) => (
                  <tr key={it.id ?? i}>
                    <Td>
                      <p className="font-medium text-slate-900">{it.description}</p>
                      {it.specNote && <p className="text-xs text-slate-500">{it.specNote}</p>}
                    </Td>
                    <Td>{it.unit}</Td>
                    <Td align="right">{it.quantity}</Td>
                    <Td align="right">{money(it.rate)}</Td>
                    <Td align="right">{it.gstRate}%</Td>
                    <Td align="right" className="font-medium text-slate-900">{money(it.amount ?? 0)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {!!detail.payments?.length && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">Payments received</h3>
                <Table>
                  <thead>
                    <tr>
                      <Th>Date</Th>
                      <Th>Mode</Th>
                      <Th>Reference</Th>
                      <Th align="right">Amount</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody>
                    {detail.payments.map((p) => (
                      <tr key={p.id}>
                        <Td>{date(p.date)}</Td>
                        <Td>{p.mode}</Td>
                        <Td>{p.reference || '—'}</Td>
                        <Td align="right" className="font-medium text-slate-900">{money(p.amount)}</Td>
                        <Td>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() =>
                              run(async () => {
                                await api.del(`/invoices/payments/${p.id}`);
                                await reload();
                                await reloadDetail();
                              }, 'Payment removed')
                            }
                          >
                            <Trash2 className="size-3.5 text-red-500" />
                          </Button>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={!!payment}
        onClose={() => setPayment(null)}
        title="Record a payment"
        footer={
          <>
            <Button onClick={() => setPayment(null)}>Cancel</Button>
            <Button variant="primary" loading={busy} disabled={!payment?.amount} onClick={recordPayment}>Save</Button>
          </>
        }
      >
        {payment && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date">
              <Input type="date" value={payment.date} onChange={(e) => setPayment({ ...payment, date: e.target.value })} />
            </Field>
            <Field label="Amount" required>
              <Input type="number" step="0.01" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: Number(e.target.value) })} />
            </Field>
            <Field label="Mode">
              <Select value={payment.mode} onChange={(e) => setPayment({ ...payment, mode: e.target.value })}>
                {['BANK', 'UPI', 'CASH', 'CHEQUE', 'CARD', 'OTHER'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </Select>
            </Field>
            <Field label="Reference" hint="UTR, cheque number, txn id">
              <Input value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} />
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}

/**
 * The buyer's purchase order, editable after the fact. Corporate buyers often
 * send the PO only once the quotation is approved, which is after the invoice
 * has already been raised.
 */
function PoEditor({ invoice, onSaved }: { invoice: Invoice; onSaved: () => Promise<void> }) {
  const { run, busy } = useAction();
  const [poNumber, setPoNumber] = useState(invoice.poNumber ?? '');
  const [poDate, setPoDate] = useState(invoice.poDate ? dateInput(invoice.poDate) : '');

  useEffect(() => {
    setPoNumber(invoice.poNumber ?? '');
    setPoDate(invoice.poDate ? dateInput(invoice.poDate) : '');
  }, [invoice.id, invoice.poNumber, invoice.poDate]);

  const changed =
    poNumber.trim() !== (invoice.poNumber ?? '') ||
    poDate !== (invoice.poDate ? dateInput(invoice.poDate) : '');

  const savePo = () =>
    run(async () => {
      await api.patch(`/invoices/${invoice.id}/reference`, {
        poNumber: poNumber.trim() || null,
        poDate: poDate || null,
      });
      await onSaved();
    }, poNumber.trim() ? 'Purchase order attached' : 'Purchase order removed');

  return (
    <div className="rounded-lg border border-slate-200 p-3.5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-800">Client&rsquo;s purchase order</p>
        {changed && (
          <Button size="sm" variant="primary" loading={busy} onClick={savePo}>
            Save
          </Button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="PO number">
          <Input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="4500033379" />
        </Field>
        <Field label="PO date">
          <Input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} />
        </Field>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {invoice.poNumber
          ? 'Printed in the document header and on the subject line.'
          : 'Add it and the subject line changes to reference their PO instead of the quotation.'}
      </p>
    </div>
  );
}
