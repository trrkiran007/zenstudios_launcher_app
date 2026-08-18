import { Plus } from 'lucide-react';
import { useState } from 'react';
import { api, useApi } from '../lib/api';
import { useApp } from '../lib/app-context';
import type { Client } from '../lib/types';
import { Button, Field, Input, Modal, Select, Textarea, useAction } from './ui';

const EMPTY = {
  name: '', kind: 'COMPANY' as const, contactPerson: '', email: '', phone: '', gstin: '',
  addressLine1: '', addressLine2: '', city: '', state: '', stateCode: '', pincode: '', notes: '',
};

/** Create-a-client dialog, reused by the quotation editor and the Clients page. */
export function ClientForm({
  open, onClose, onSaved, initial,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (client: Client) => void;
  initial?: Client | null;
}) {
  const { states } = useApp();
  const { run, busy } = useAction();
  const [form, setForm] = useState(() => ({ ...EMPTY, ...(initial ?? {}) }) as any);

  // Reset the form whenever the dialog is re-opened for a different record.
  const [seed, setSeed] = useState<string | null>(initial?.id ?? null);
  if (open && seed !== (initial?.id ?? null)) {
    setSeed(initial?.id ?? null);
    setForm({ ...EMPTY, ...(initial ?? {}) });
  }

  const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }));

  const onStateChange = (code: string) => {
    const match = states.find((s) => s.code === code);
    setForm((f: any) => ({ ...f, stateCode: code, state: match?.name ?? '' }));
  };

  const save = () =>
    run(async () => {
      const payload = { ...form };
      delete payload._count;
      delete payload.createdAt;
      delete payload.updatedAt;
      const saved = initial?.id
        ? await api.put<Client>(`/clients/${initial.id}`, payload)
        : await api.post<Client>('/clients', payload);
      onSaved(saved);
      onClose();
    }, initial?.id ? 'Client updated' : 'Client added');

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={initial?.id ? 'Edit client' : 'New client'}
      description="The GSTIN's first two digits set the place of supply, which decides CGST+SGST vs IGST."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={busy} onClick={save} disabled={!form.name?.trim()}>
            {initial?.id ? 'Save changes' : 'Add client'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" required className="sm:col-span-2">
          <Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} placeholder="Acme Interiors Pvt Ltd" />
        </Field>
        <Field label="Type">
          <Select value={form.kind} onChange={(e) => set('kind', e.target.value)}>
            <option value="COMPANY">Company</option>
            <option value="INDIVIDUAL">Individual</option>
          </Select>
        </Field>
        <Field label="Contact person">
          <Input value={form.contactPerson ?? ''} onChange={(e) => set('contactPerson', e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} placeholder="+91 …" />
        </Field>
        <Field label="GSTIN" hint="Leave blank for unregistered clients">
          <Input
            value={form.gstin ?? ''}
            onChange={(e) => {
              const gstin = e.target.value.toUpperCase();
              const code = gstin.slice(0, 2);
              setForm((f: any) => ({
                ...f,
                gstin,
                ...(/^\d{2}$/.test(code)
                  ? { stateCode: code, state: states.find((s) => s.code === code)?.name ?? f.state }
                  : {}),
              }));
            }}
            placeholder="36AAECO9870D1Z5"
          />
        </Field>
        <Field label="PAN">
          <Input value={form.pan ?? ''} onChange={(e) => set('pan', e.target.value.toUpperCase())} />
        </Field>
        <Field label="Address line 1" className="sm:col-span-2">
          <Input value={form.addressLine1 ?? ''} onChange={(e) => set('addressLine1', e.target.value)} />
        </Field>
        <Field label="Address line 2" className="sm:col-span-2">
          <Input value={form.addressLine2 ?? ''} onChange={(e) => set('addressLine2', e.target.value)} />
        </Field>
        <Field label="City">
          <Input value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} />
        </Field>
        <Field label="State">
          <Select value={form.stateCode ?? ''} onChange={(e) => onStateChange(e.target.value)}>
            <option value="">Select state…</option>
            {states.map((s) => (
              <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="PIN code">
          <Input value={form.pincode ?? ''} onChange={(e) => set('pincode', e.target.value)} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea rows={2} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

/** Select + "new client" affordance in one control. */
export function ClientPicker({
  value, onChange, refreshKey,
}: { value: string; onChange: (client: Client) => void; refreshKey?: number }) {
  const { data, reload } = useApi<Client[]>('/clients', [refreshKey]);
  const [creating, setCreating] = useState(false);

  return (
    <>
      <div className="flex gap-2">
        <Select
          value={value}
          onChange={(e) => {
            const found = data?.find((c) => c.id === e.target.value);
            if (found) onChange(found);
          }}
        >
          <option value="">Select client…</option>
          {(data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.city ? ` — ${c.city}` : ''}
            </option>
          ))}
        </Select>
        <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)} title="New client" />
      </div>
      <ClientForm
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={async (c) => {
          await reload();
          onChange(c);
        }}
      />
    </>
  );
}
