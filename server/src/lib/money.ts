/** Round to 2dp without the usual float drift (0.145 -> 0.15, not 0.14). */
export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function toNumber(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : fallback;
}

export function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(round2(n));
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

/** Indian numbering: crore / lakh / thousand. Used on tax invoices. */
export function amountInWords(amount: number): string {
  const value = round2(Math.abs(amount));
  const rupees = Math.floor(value);
  const paise = Math.round((value - rupees) * 100);

  const chunk = (n: number, div: number) => Math.floor(n / div) % 100;
  const parts: string[] = [];
  const crore = Math.floor(rupees / 10000000);
  const lakh = chunk(rupees, 100000);
  const thousand = chunk(rupees, 1000);
  const hundreds = rupees % 1000;

  if (crore) parts.push(`${crore > 99 ? amountInWords(crore).replace(/ Rupees.*/, '') : twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundreds) parts.push(threeDigits(hundreds));

  const rupeeWords = parts.length ? parts.join(' ') : 'Zero';
  const sign = amount < 0 ? 'Minus ' : '';
  const paiseWords = paise ? ` and ${twoDigits(paise)} Paise` : '';
  return `${sign}Rupees ${rupeeWords}${paiseWords} Only`;
}

/** Financial year label for a date, e.g. 2026-08-16 -> "26-27". */
export function financialYear(date: Date = new Date()): string {
  const y = date.getFullYear();
  const startYear = date.getMonth() + 1 >= 4 ? y : y - 1;
  return `${String(startYear).slice(2)}-${String(startYear + 1).slice(2)}`;
}
