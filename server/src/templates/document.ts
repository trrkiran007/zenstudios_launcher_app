import fs from 'node:fs';
import path from 'node:path';
import { BRANDING_DIR } from '../config.js';
import { amountInWords, formatINR, round2 } from '../lib/money.js';
import type { Totals } from '../lib/totals.js';

export type DocOrg = {
  brandName: string;
  legalName: string;
  trademarkLine?: string | null;
  cin?: string | null;
  pan?: string | null;
  tan?: string | null;
  gstin?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  stateCode?: string | null;
  pincode?: string | null;
  email?: string | null;
  phone?: string | null;
  altPhone?: string | null;
  website?: string | null;
  logoPath?: string | null;
  brandColor: string;
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNo?: string | null;
  bankIfsc?: string | null;
  bankBranch?: string | null;
  upiId?: string | null;
};

export type DocParty = {
  name: string;
  contactPerson?: string | null;
  gstin?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  stateCode?: string | null;
  pincode?: string | null;
};

export type DocItem = {
  description: string;
  specNote?: string | null;
  hsnSac?: string | null;
  unit: string;
  quantity: number;
  rate: number;
  discountPct: number;
  gstRate: number;
  amount: number;
};

export type DocSection = { name: string; notes?: string | null; items: DocItem[] };

export type DocumentModel = {
  kind: 'QUOTATION' | 'PROFORMA' | 'TAX_INVOICE';
  title: string;
  number: string;
  date: Date;
  secondaryDateLabel?: string;
  secondaryDate?: Date | null;
  subject?: string | null;
  org: DocOrg;
  party: DocParty;
  sections: DocSection[];
  totals: Totals;
  showHsn: boolean;
  showSectionTotals: boolean;
  notes?: string | null;
  terms?: string | null;
  amountPaid?: number;
  statusStamp?: string | null;
};

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const nl2br = (s: unknown) => esc(s).replace(/\n/g, '<br/>');

const fmtDate = (d?: Date | null) =>
  d
    ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(
        new Date(d),
      )
    : '—';

const qty = (n: number) => (Number.isInteger(n) ? String(n) : String(round2(n)));

function logoDataUri(org: DocOrg): string | null {
  if (!org.logoPath) return null;
  const file = path.join(BRANDING_DIR, path.basename(org.logoPath));
  if (!fs.existsSync(file)) return null;
  const ext = path.extname(file).toLowerCase();
  const mime =
    ext === '.svg' ? 'image/svg+xml' : ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
}

/** Wordmark used until a logo file is uploaded in Settings. */
function fallbackMark(org: DocOrg): string {
  const [first, ...rest] = org.brandName.split(/(?=[A-Z])/);
  const tail = rest.join('') || '';
  return `<div class="wordmark"><span class="wm-dark">${esc(first)}</span><span class="wm-brand">${esc(
    tail,
  )}</span><sup>™</sup></div>`;
}

function partyBlock(p: DocParty): string {
  const lines = [
    p.contactPerson && `Attn: ${esc(p.contactPerson)}`,
    p.addressLine1 && esc(p.addressLine1),
    p.addressLine2 && esc(p.addressLine2),
    [p.city, p.state, p.pincode].filter(Boolean).map(esc).join(', '),
    p.gstin && `<b>GSTIN:</b> ${esc(p.gstin)}`,
    p.phone && `Ph: ${esc(p.phone)}`,
    p.email && esc(p.email),
  ].filter(Boolean);
  return lines.join('<br/>');
}

function itemsTable(model: DocumentModel): string {
  const { showHsn } = model;
  const cols = showHsn ? 8 : 7;
  const head = `
    <thead>
      <tr>
        <th class="c-sn">#</th>
        <th class="c-desc">Description</th>
        ${showHsn ? '<th class="c-hsn">HSN/SAC</th>' : ''}
        <th class="c-unit">Unit</th>
        <th class="c-num">Qty</th>
        <th class="c-num">Rate</th>
        <th class="c-num">GST%</th>
        <th class="c-num">Amount</th>
      </tr>
    </thead>`;

  const body = model.sections
    .map((section) => {
      const sectionTotal = section.items.reduce((a, it) => a + it.amount, 0);
      const rows = section.items
        .map(
          (it, i) => `
        <tr>
          <td class="c-sn">${i + 1}</td>
          <td class="c-desc">
            <div class="item-name">${esc(it.description)}</div>
            ${it.specNote ? `<div class="item-spec">${nl2br(it.specNote)}</div>` : ''}
            ${it.discountPct ? `<div class="item-spec">Line discount ${round2(it.discountPct)}%</div>` : ''}
          </td>
          ${showHsn ? `<td class="c-hsn">${esc(it.hsnSac || '—')}</td>` : ''}
          <td class="c-unit">${esc(it.unit)}</td>
          <td class="c-num">${qty(it.quantity)}</td>
          <td class="c-num">${formatINR(it.rate)}</td>
          <td class="c-num">${round2(it.gstRate)}%</td>
          <td class="c-num">${formatINR(it.amount)}</td>
        </tr>`,
        )
        .join('');

      const header =
        model.sections.length > 1 || section.name.toLowerCase() !== 'items'
          ? `<tr class="section-row"><td colspan="${cols}">${esc(section.name)}${
              section.notes ? `<span class="section-note">${esc(section.notes)}</span>` : ''
            }</td></tr>`
          : '';

      const footer =
        model.showSectionTotals && model.sections.length > 1
          ? `<tr class="section-total"><td colspan="${cols - 1}">${esc(section.name)} subtotal</td><td class="c-num">${formatINR(
              sectionTotal,
            )}</td></tr>`
          : '';

      return header + rows + footer;
    })
    .join('');

  return `<table class="items">${head}<tbody>${body}</tbody></table>`;
}

function taxBreakup(model: DocumentModel): string {
  const t = model.totals;
  if (!t.slabs.length) return '';
  const rows = t.slabs
    .map(
      (s) => `<tr>
        <td>${round2(s.gstRate)}%</td>
        <td class="c-num">${formatINR(s.taxableValue)}</td>
        ${
          t.isIntraState
            ? `<td class="c-num">${formatINR(s.cgst)}</td><td class="c-num">${formatINR(s.sgst)}</td>`
            : `<td class="c-num" colspan="2">${formatINR(s.igst)}</td>`
        }
        <td class="c-num">${formatINR(s.cgst + s.sgst + s.igst)}</td>
      </tr>`,
    )
    .join('');
  return `
    <table class="tax-breakup">
      <thead>
        <tr>
          <th>GST rate</th><th class="c-num">Taxable value</th>
          ${t.isIntraState ? '<th class="c-num">CGST</th><th class="c-num">SGST</th>' : '<th class="c-num" colspan="2">IGST</th>'}
          <th class="c-num">Total tax</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function totalsBlock(model: DocumentModel): string {
  const t = model.totals;
  const row = (label: string, value: string, cls = '') =>
    `<tr class="${cls}"><td>${label}</td><td class="c-num">${value}</td></tr>`;
  const balance = model.amountPaid !== undefined ? round2(t.grandTotal - model.amountPaid) : null;

  return `<table class="totals">
    ${row('Subtotal', formatINR(t.subtotal))}
    ${t.discountAmount ? row('Discount', `− ${formatINR(t.discountAmount)}`) : ''}
    ${row('Taxable value', formatINR(t.taxableValue))}
    ${t.isIntraState ? row('CGST', formatINR(t.cgst)) + row('SGST', formatINR(t.sgst)) : row('IGST', formatINR(t.igst))}
    ${t.roundOff ? row('Round off', formatINR(t.roundOff)) : ''}
    ${row('<b>Grand total</b>', `<b>${formatINR(t.grandTotal)}</b>`, 'grand')}
    ${model.amountPaid !== undefined ? row('Amount received', `− ${formatINR(model.amountPaid)}`) : ''}
    ${balance !== null ? row('<b>Balance due</b>', `<b>${formatINR(balance)}</b>`, 'grand') : ''}
  </table>`;
}

export function renderDocumentHtml(model: DocumentModel): string {
  const { org, party } = model;
  const brand = org.brandColor || '#16A34A';
  const logo = logoDataUri(org);
  const heading =
    model.kind === 'QUOTATION' ? 'Quotation' : model.kind === 'PROFORMA' ? 'Proforma Invoice' : 'Tax Invoice';

  const orgAddress = [
    org.addressLine1,
    org.addressLine2,
    [org.city, org.state, org.pincode].filter(Boolean).join(', '),
  ]
    .filter(Boolean)
    .map(esc)
    .join('<br/>');

  const regLines = [
    org.gstin ? `<b>GSTIN:</b> ${esc(org.gstin)}` : null,
    org.cin ? `<b>CIN:</b> ${esc(org.cin)}` : null,
    org.pan ? `<b>PAN:</b> ${esc(org.pan)}` : null,
  ].filter(Boolean);

  const bankRows = [
    ['Account name', org.bankAccountName],
    ['Bank', [org.bankName, org.bankBranch].filter(Boolean).join(' — ')],
    ['Account no.', org.bankAccountNo],
    ['IFSC', org.bankIfsc],
    ['UPI', org.upiId],
  ].filter(([, v]) => v) as [string, string][];

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${esc(model.number)} — ${esc(org.brandName)}</title>
<style>
  :root { --brand: ${esc(brand)}; --ink: #111827; --muted: #6B7280; --line: #E5E7EB; --soft: #F9FAFB; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    color: var(--ink); font-size: 10.5px; line-height: 1.45;
    background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 12mm 12mm 14mm; }
  @page { size: A4; margin: 0; }

  .head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start;
          border-bottom: 2px solid var(--brand); padding-bottom: 10px; }
  .head img { max-height: 54px; max-width: 230px; object-fit: contain; }
  .wordmark { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
  .wm-dark { color: var(--ink); } .wm-brand { color: var(--brand); }
  .wordmark sup { font-size: 9px; font-weight: 600; }
  .org { text-align: right; max-width: 62mm; font-size: 9.5px; color: var(--muted); }
  .org .legal { color: var(--ink); font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: .2px; }
  .tm { font-size: 8.5px; color: var(--muted); margin-top: 2px; }

  .doc-title { display: flex; justify-content: space-between; align-items: flex-end; margin: 14px 0 10px; }
  .doc-title h1 { margin: 0; font-size: 20px; letter-spacing: 3px; text-transform: uppercase; color: var(--brand); }
  .doc-meta { text-align: right; font-size: 10px; }
  .doc-meta b { display: inline-block; min-width: 78px; color: var(--muted); font-weight: 600; text-align: left; }

  .stamp { display: inline-block; border: 1.5px solid var(--brand); color: var(--brand);
           padding: 2px 8px; border-radius: 3px; font-weight: 700; letter-spacing: 1.5px; font-size: 9px; }

  .parties { display: flex; gap: 10px; margin: 6px 0 12px; }
  .card { flex: 1; border: 1px solid var(--line); border-radius: 4px; padding: 8px 10px; background: var(--soft); }
  .card h3 { margin: 0 0 4px; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); }
  .card .pname { font-weight: 700; font-size: 11.5px; margin-bottom: 2px; }

  .subject { margin: 0 0 10px; font-size: 11px; }
  .subject b { color: var(--muted); font-weight: 600; }

  table { width: 100%; border-collapse: collapse; }
  .items th { background: var(--brand); color: #fff; font-size: 9px; text-transform: uppercase;
              letter-spacing: .6px; padding: 6px 6px; text-align: left; font-weight: 600; }
  .items td { padding: 6px; border-bottom: 1px solid var(--line); vertical-align: top; }
  .items tr { page-break-inside: avoid; }
  .c-num { text-align: right; white-space: nowrap; }
  .c-sn { width: 6mm; color: var(--muted); }
  .c-unit { width: 14mm; }
  .c-hsn { width: 18mm; }
  .items th.c-num { text-align: right; }
  .item-name { font-weight: 600; }
  .item-spec { color: var(--muted); font-size: 9.5px; margin-top: 2px; }
  .section-row td { background: #EEF6F0; font-weight: 700; text-transform: uppercase;
                    letter-spacing: .8px; font-size: 9.5px; color: var(--brand); border-bottom: 1px solid var(--line); }
  .section-note { font-weight: 400; text-transform: none; letter-spacing: 0; color: var(--muted); margin-left: 8px; }
  .section-total td { background: #FAFAFA; font-weight: 700; font-size: 10px; }

  .foot { display: flex; gap: 12px; margin-top: 12px; align-items: flex-start; }
  .foot-left { flex: 1.25; }
  .foot-right { width: 78mm; }
  .totals td { padding: 4px 6px; border-bottom: 1px solid var(--line); }
  .totals tr.grand td { background: #EEF6F0; border-bottom: none; font-size: 12px; }
  .tax-breakup { margin-top: 10px; font-size: 9.5px; }
  .tax-breakup th { background: var(--soft); text-align: left; padding: 4px 6px; border: 1px solid var(--line);
                    font-size: 8.5px; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); }
  .tax-breakup td { padding: 4px 6px; border: 1px solid var(--line); }

  .words { margin-top: 10px; padding: 6px 8px; background: var(--soft); border-left: 3px solid var(--brand); font-size: 10px; }
  .block { margin-top: 12px; page-break-inside: avoid; }
  .block h4 { margin: 0 0 4px; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); }
  .block .body { font-size: 9.5px; color: #374151; white-space: pre-wrap; }
  .bank td { padding: 2px 0; font-size: 9.5px; }
  .bank td:first-child { color: var(--muted); width: 30mm; }

  .sign { margin-top: 18px; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid; }
  .sign .for { text-align: right; font-size: 10px; }
  .sign .line { margin-top: 34px; border-top: 1px solid var(--ink); padding-top: 3px; min-width: 55mm; color: var(--muted); font-size: 9px; }
  .disclaimer { margin-top: 14px; padding-top: 8px; border-top: 1px solid var(--line);
                font-size: 8.5px; color: var(--muted); text-align: center; }
</style>
</head>
<body>
<div class="page">

  <div class="head">
    <div>
      ${logo ? `<img src="${logo}" alt="${esc(org.brandName)}"/>` : fallbackMark(org)}
      ${org.trademarkLine ? `<div class="tm">${esc(org.trademarkLine)}</div>` : ''}
    </div>
    <div class="org">
      <div class="legal">${esc(org.legalName)}</div>
      ${orgAddress}
      ${regLines.length ? `<div style="margin-top:3px">${regLines.join('<br/>')}</div>` : ''}
      <div style="margin-top:3px">
        ${org.phone ? esc(org.phone) : ''}${org.altPhone ? ` / ${esc(org.altPhone)}` : ''}
        ${org.email ? `<br/>${esc(org.email)}` : ''}
        ${org.website ? `<br/>${esc(org.website)}` : ''}
      </div>
    </div>
  </div>

  <div class="doc-title">
    <div>
      <h1>${heading}</h1>
      ${model.statusStamp ? `<div style="margin-top:6px"><span class="stamp">${esc(model.statusStamp)}</span></div>` : ''}
    </div>
    <div class="doc-meta">
      <div><b>Number</b> ${esc(model.number)}</div>
      <div><b>Date</b> ${fmtDate(model.date)}</div>
      ${
        model.secondaryDate
          ? `<div><b>${esc(model.secondaryDateLabel || 'Valid till')}</b> ${fmtDate(model.secondaryDate)}</div>`
          : ''
      }
      <div><b>Place of supply</b> ${esc(
        [party.state, party.stateCode].filter(Boolean).join(' — ') || org.state || '—',
      )}</div>
    </div>
  </div>

  <div class="parties">
    <div class="card">
      <h3>${model.kind === 'QUOTATION' ? 'Quotation for' : 'Bill to'}</h3>
      <div class="pname">${esc(party.name)}</div>
      ${partyBlock(party)}
    </div>
    <div class="card">
      <h3>From</h3>
      <div class="pname">${esc(org.brandName)}</div>
      ${esc(org.legalName)}<br/>
      ${orgAddress}
      ${org.gstin ? `<br/><b>GSTIN:</b> ${esc(org.gstin)}` : ''}
    </div>
  </div>

  ${model.subject ? `<p class="subject"><b>Subject:</b> ${esc(model.subject)}</p>` : ''}

  ${itemsTable(model)}

  <div class="foot">
    <div class="foot-left">
      ${taxBreakup(model)}
      <div class="words"><b>Amount in words:</b> ${esc(amountInWords(model.totals.grandTotal))}</div>
      ${
        bankRows.length
          ? `<div class="block"><h4>Payment details</h4><table class="bank">${bankRows
              .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`)
              .join('')}</table></div>`
          : ''
      }
    </div>
    <div class="foot-right">
      ${totalsBlock(model)}
    </div>
  </div>

  ${model.notes ? `<div class="block"><h4>Notes</h4><div class="body">${nl2br(model.notes)}</div></div>` : ''}
  ${model.terms ? `<div class="block"><h4>Terms &amp; conditions</h4><div class="body">${nl2br(model.terms)}</div></div>` : ''}

  <div class="sign">
    <div style="font-size:9px;color:var(--muted);max-width:80mm">
      ${
        model.kind === 'QUOTATION'
          ? 'Accepted &amp; confirmed by client<div class="line">Signature / Date</div>'
          : 'This is a computer-generated document.'
      }
    </div>
    <div class="for">
      For <b>${esc(org.legalName)}</b>
      <div class="line">Authorised signatory</div>
    </div>
  </div>

  <div class="disclaimer">
    ${esc(org.brandName)}${org.trademarkLine ? ` — ${esc(org.trademarkLine)}` : ''}
    ${org.cin ? ` · CIN ${esc(org.cin)}` : ''}${org.gstin ? ` · GSTIN ${esc(org.gstin)}` : ''}
  </div>

</div>
</body>
</html>`;
}
