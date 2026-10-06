/**
 * Raise an invoice that has no quotation behind it.
 *
 * Interiors work quotation → project → invoice, and that flow is untouched.
 * Services often do not: the agreement is a statement of work or a contract,
 * and the provider invoices against it as work is delivered. There was no way
 * into that from the app — the API could already create a standalone invoice,
 * but nothing called it.
 */
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { api } from '../lib/api';
import { useApp } from '../lib/app-context';
import { money } from '../lib/format';
import type { Client, Invoice } from '../lib/types';
import { ClientPicker } from './ClientPicker';
import { Button, Field, Input, Modal, Select, Textarea, useAction } from './ui';

type Line = {
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  gstRate: number;
};

const blankLine = (gstRate: number): Line => ({
  description: '',
  unit: 'Nos',
  quantity: 1,
  rate: 0,
  gstRate,
});

const today = () => new Date().toISOString().slice(0, 10);

export function NewInvoiceForm({
  open, onClose, onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (invoice: Invoice) => void;
}) {
  const { org, units, countries } = useApp();
  const { run, busy } = useAction();

  const profile = countries.find((c) => c.code === (org?.countryCode ?? 'IN'));
  const defaultRate = profile?.defaultTaxRate ?? 18;
  const taxLabel = profile?.taxLabel ?? 'GST';

  const [clientId, setClientId] = useState('');
  const [client, setClient] = useState<Client | null>(null);
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([blankLine(defaultRate)]);

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, n) => (n === i ? { ...l, ...patch } : l)));

  const usable = lines.filter((l) => l.description.trim() && l.quantity > 0);
  const subtotal = usable.reduce((a, l) => a + l.quantity * l.rate, 0);

  const reset = () => {
    setClientId(''); setClient(null); setIssueDate(today()); setDueDate('');
    setPoNumber(''); setNotes(''); setLines([blankLine(defaultRate)]);
  };

  const create = () =>
    run(async () => {
      const invoice = await api.post<Invoice>('/invoices', {
        type: 'TAX',
        clientId,
        issueDate,
        dueDate: dueDate || null,
        poNumber: poNumber.trim() || null,
        notes: notes.trim() || null,
        items: usable.map((l) => ({
          description: l.description.trim(),
          unit: l.unit,
          quantity: l.quantity,
          rate: l.rate,
          gstRate: l.gstRate,
        })),
      });
      reset();
      onCreated(invoice);
      onClose();
    }, 'Invoice created');

  const blocked = !clientId || usable.length === 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New invoice"
      description="For work with no quotation behind it — a statement of work, a contract, or a one-off"
      wide
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={busy} disabled={blocked} onClick={create}>
            Create draft
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Client" required className="sm:col-span-2">
          <ClientPicker
            value={clientId}
            onChange={(picked) => {
              setClientId(picked.id);
              setClient(picked);
            }}
          />
        </Field>
        <Field label="Invoice date">
          <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
        </Field>
        <Field label="Due date">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
        <Field
          label="Client's PO or SOW reference"
          className="sm:col-span-2"
          hint="Printed in the subject line. Large buyers reconcile on their own reference."
        >
          <Input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="4500033379" />
        </Field>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-700">Lines</h4>
          <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setLines((ls) => [...ls, blankLine(defaultRate)])}>
            Add line
          </Button>
        </div>

        <div className="space-y-2">
          {lines.map((line, i) => (
            <div key={i} className="grid items-end gap-2 sm:grid-cols-[1fr_5rem_4.5rem_6rem_5rem_auto]">
              <Field label={i === 0 ? 'Description' : undefined}>
                <Input
                  value={line.description}
                  onChange={(e) => setLine(i, { description: e.target.value })}
                  placeholder="Senior engineer — October 2026"
                />
              </Field>
              <Field label={i === 0 ? 'Unit' : undefined}>
                <Select value={line.unit} onChange={(e) => setLine(i, { unit: e.target.value })}>
                  {units.map((u) => <option key={u} value={u}>{u}</option>)}
                </Select>
              </Field>
              <Field label={i === 0 ? 'Qty' : undefined}>
                <Input
                  type="number"
                  value={line.quantity}
                  onChange={(e) => setLine(i, { quantity: Number(e.target.value) })}
                />
              </Field>
              <Field label={i === 0 ? 'Rate' : undefined}>
                <Input
                  type="number"
                  value={line.rate}
                  onChange={(e) => setLine(i, { rate: Number(e.target.value) })}
                />
              </Field>
              <Field label={i === 0 ? `${taxLabel} %` : undefined}>
                <Input
                  type="number"
                  value={line.gstRate}
                  onChange={(e) => setLine(i, { gstRate: Number(e.target.value) })}
                />
              </Field>
              <Button
                size="sm"
                variant="ghost"
                disabled={lines.length === 1}
                onClick={() => setLines((ls) => ls.filter((_, n) => n !== i))}
              >
                <Trash2 className="size-3.5 text-red-500" />
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
          <span className="text-slate-500">
            {usable.length} line{usable.length === 1 ? '' : 's'}
            {client?.countryCode && client.countryCode !== (org?.countryCode ?? 'IN')
              ? ' · export, zero-rated'
              : ''}
          </span>
          <span className="font-semibold tnum">{money(subtotal)} before {taxLabel}</span>
        </div>
      </div>

      <Field label="Notes" className="mt-4">
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </Modal>
  );
}
