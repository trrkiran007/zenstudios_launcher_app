import { countryProfile, DEFAULT_COUNTRY } from '../data/countries.js';

/** Round to 2dp without the usual float drift (0.145 -> 0.15, not 0.14). */
export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function toNumber(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : fallback;
}

/*
 * Money, dates and written amounts all follow the country the business is set
 * up in. One install serves one business, so rather than thread a country code
 * through every call site the active profile is held here and set once, when
 * the organisation is read.
 */
let active = countryProfile(DEFAULT_COUNTRY);
let formatter = buildFormatter();

function buildFormatter() {
  return new Intl.NumberFormat(active.locale, {
    style: 'currency',
    currency: active.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Called whenever the organisation is loaded, so a country change takes effect. */
export function useCountry(code?: string | null) {
  const next = countryProfile(code);
  if (next.code === active.code) return;
  active = next;
  formatter = buildFormatter();
}

export const activeCountry = () => active;

export function formatMoney(n: number): string {
  return formatter.format(round2(n));
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
  'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  const o = ONES[n % 10];
  return o ? `${t} ${o}` : t;
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h) parts.push(`${ONES[h]} Hundred`);
  if (rest) parts.push(twoDigits(rest));
  return parts.join(' ');
}

/** Written out for a tax invoice, in the country's own scale and currency. */
export function amountInWords(amount: number): string {
  const value = round2(Math.abs(amount));
  const whole = Math.floor(value);
  const fraction = Math.round((value - whole) * 100);

  const parts =
    active.wordScale === 'indian' ? indianScale(whole) : westernScale(whole);

  const main = parts.length ? parts.join(' ') : 'Zero';
  const sign = amount < 0 ? 'Minus ' : '';
  const sub = fraction ? ` and ${twoDigits(fraction)} ${active.currencySubName}` : '';
  return `${sign}${active.currencyName} ${main}${sub} Only`;
}

/** Crore, lakh, thousand — how an Indian invoice reads. */
function indianScale(n: number): string[] {
  const chunk = (v: number, div: number) => Math.floor(v / div) % 100;
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  const lakh = chunk(n, 100000);
  const thousand = chunk(n, 1000);
  const hundreds = n % 1000;

  if (crore) parts.push(`${crore > 99 ? indianScale(crore).join(' ') : twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundreds) parts.push(threeDigits(hundreds));
  return parts;
}

/** Billion, million, thousand — everywhere else. */
function westernScale(n: number): string[] {
  const parts: string[] = [];
  const groups: [number, string][] = [
    [1000000000, 'Billion'],
    [1000000, 'Million'],
    [1000, 'Thousand'],
  ];
  let rest = n;
  for (const [size, name] of groups) {
    const count = Math.floor(rest / size);
    if (count) {
      parts.push(`${threeDigits(count)} ${name}`);
      rest -= count * size;
    }
  }
  if (rest) parts.push(threeDigits(rest));
  return parts;
}

/** Financial year label for a date, e.g. 2026-08-16 -> "26-27". */
export function financialYear(date: Date = new Date()): string {
  const y = date.getFullYear();
  // A country whose accounting year is the calendar year gets a single year in
  // the document number: ZS/INT/26/001 rather than ZS/INT/26-27/001.
  if (active.yearStartMonth === 1) return String(y).slice(2);
  const startYear = date.getMonth() + 1 >= active.yearStartMonth ? y : y - 1;
  return `${String(startYear).slice(2)}-${String(startYear + 1).slice(2)}`;
}
