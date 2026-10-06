/*
 * Money and dates follow the country the business is set up in.
 *
 * One install serves one business, so rather than pass a country code into
 * every call the active one is held here and set once, from the organisation,
 * when the app loads. Until then it is India — which is what every existing
 * install is, so nothing flickers.
 */
type Formatting = { locale: string; currency: string };

const FORMATTING: Record<string, Formatting> = {
  IN: { locale: 'en-IN', currency: 'INR' },
  US: { locale: 'en-US', currency: 'USD' },
  NZ: { locale: 'en-NZ', currency: 'NZD' },
};

let active: Formatting = FORMATTING.IN;
let full = build();
let compact = build('compact');
let plain = buildPlain();

function build(notation?: 'compact') {
  return new Intl.NumberFormat(active.locale, {
    style: 'currency',
    currency: active.currency,
    ...(notation === 'compact'
      ? { notation, maximumFractionDigits: 1 }
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  });
}

function buildPlain() {
  return new Intl.NumberFormat(active.locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** Called once the organisation is known, and again if its country changes. */
export function useCountry(code?: string | null) {
  const next = FORMATTING[(code ?? '').toUpperCase()] ?? FORMATTING.IN;
  if (next === active) return;
  active = next;
  full = build();
  compact = build('compact');
  plain = buildPlain();
}

export const currencyCode = () => active.currency;

export const money = (n: number | null | undefined) => full.format(Number(n ?? 0));
export const moneyShort = (n: number | null | undefined) => compact.format(Number(n ?? 0));

export const num = (n: number | null | undefined, dp = 2) =>
  dp === 2
    ? plain.format(Number(n ?? 0))
    : new Intl.NumberFormat(active.locale, { minimumFractionDigits: 0, maximumFractionDigits: dp }).format(
        Number(n ?? 0),
      );

export function date(v: string | Date | null | undefined) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(active.locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

export function dateTime(v: string | Date | null | undefined) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(active.locale, {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(d);
}

export const pct = (n: number | null | undefined) => `${num(n, 1)}%`;

/** "3 days ago" / "in 2 days" for due dates and activity feeds. */
export function relative(v: string | Date | null | undefined) {
  if (!v) return '—';
  const d = new Date(v).getTime();
  if (Number.isNaN(d)) return '—';
  const diff = d - Date.now();
  const days = Math.round(diff / 86400000);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (Math.abs(days) >= 1) return rtf.format(days, 'day');
  const hours = Math.round(diff / 3600000);
  if (Math.abs(hours) >= 1) return rtf.format(hours, 'hour');
  return rtf.format(Math.round(diff / 60000), 'minute');
}

/** yyyy-MM-dd for <input type="date"> */
export function dateInput(v: string | Date | null | undefined) {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const fileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
