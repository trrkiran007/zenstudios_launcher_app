/**
 * Where the business operates, and everything that follows from it.
 *
 * The app was written for one Indian company, so India's rules sat directly in
 * the code: rupees, lakh and crore, states with GST codes, a year that turns
 * over in April, and four statutory identifiers. None of that is wrong — it is
 * just not universal.
 *
 * A country profile gathers those decisions in one place so the rest of the
 * code can ask instead of assume. Adding a country means adding an entry here.
 *
 * On tax: these profiles carry the mechanics and the ordinary default rate,
 * not tax advice. Rates change, and whether a particular supply is taxable
 * depends on what is being sold and to whom. Check the rates with your
 * accountant — the app makes them easy to override per item for that reason.
 */

export type TaxSystem =
  /** Split into CGST + SGST within a state, IGST across states. */
  | 'INDIA_GST'
  /** One tax line at the item's own rate. VAT, GST and sales tax all fit here. */
  | 'SINGLE'
  /** No tax line at all. */
  | 'NONE';

export type Region = { code: string; name: string };

/**
 * How a client in this country is told where to send the money.
 *
 * The details differ in kind, not just in name: India needs an IFSC and often
 * a UPI id, the United States needs a routing number and whether the account
 * is checking or savings, New Zealand encodes bank and branch inside the
 * account number itself and needs neither. So each country lists the fields
 * that apply, and the Settings form and the printed payment block are both
 * built from that list.
 */
export type BankField = {
  key:
    | 'bankAccountName' | 'bankName' | 'bankBranch' | 'bankAccountNo'
    | 'bankIfsc' | 'bankRouting' | 'bankAccountType' | 'bankSwift' | 'upiId';
  label: string;
  hint?: string;
  /** Present for a field that is chosen rather than typed. */
  options?: string[];
  mono?: boolean;
  upper?: boolean;
};

const ACCOUNT_NAME: BankField = { key: 'bankAccountName', label: 'Account name' };
const BANK_NAME: BankField = { key: 'bankName', label: 'Bank' };
const ACCOUNT_NO: BankField = { key: 'bankAccountNo', label: 'Account number', mono: true };
const SWIFT: BankField = {
  key: 'bankSwift',
  label: 'SWIFT / BIC',
  hint: 'Needed when a client abroad pays you by wire',
  mono: true,
  upper: true,
};

export type CountryProfile = {
  code: string;
  name: string;
  currency: string;
  locale: string;
  /** How the currency is named when an amount is written out in words. */
  currencyName: string;
  currencySubName: string;
  /** Lakh and crore, or thousand and million, when writing an amount in words. */
  wordScale: 'indian' | 'western';
  /** Month the accounting year starts: 4 for April, 1 for January. */
  yearStartMonth: number;
  regionLabel: string;
  regions: Region[];
  postcodeLabel: string;
  taxSystem: TaxSystem;
  /** What the tax is called on a document: GST, VAT, Sales tax. */
  taxLabel: string;
  /** The usual headline rate. Always overridable per item. */
  defaultTaxRate: number;
  /** Column heading for an item's tax classification code, if the country uses one. */
  itemCodeLabel: string;
  /** Which of the built-in statutory columns this country actually uses. */
  identifiers: ('gstin' | 'cin' | 'pan' | 'tan')[];
  /** Offered as one-click additions under Settings → Other identifiers. */
  suggestedFields: string[];
  /** Printed under the totals when selling to another country. */
  exportNote?: string;
  /** The payment details that apply here, in the order they are shown and printed. */
  bankFields: BankField[];
  /**
   * Round the invoice total to a whole unit and show the rounding.
   * Indian tax invoices do; a dollar invoice showing 1,204.00 should stay
   * 1,204.37.
   */
  roundTotals: boolean;
};

const INDIA_STATES: Region[] = [
  ['01', 'Jammu and Kashmir'], ['02', 'Himachal Pradesh'], ['03', 'Punjab'],
  ['04', 'Chandigarh'], ['05', 'Uttarakhand'], ['06', 'Haryana'], ['07', 'Delhi'],
  ['08', 'Rajasthan'], ['09', 'Uttar Pradesh'], ['10', 'Bihar'], ['11', 'Sikkim'],
  ['12', 'Arunachal Pradesh'], ['13', 'Nagaland'], ['14', 'Manipur'], ['15', 'Mizoram'],
  ['16', 'Tripura'], ['17', 'Meghalaya'], ['18', 'Assam'], ['19', 'West Bengal'],
  ['20', 'Jharkhand'], ['21', 'Odisha'], ['22', 'Chhattisgarh'], ['23', 'Madhya Pradesh'],
  ['24', 'Gujarat'], ['26', 'Dadra and Nagar Haveli and Daman and Diu'],
  ['27', 'Maharashtra'], ['29', 'Karnataka'], ['30', 'Goa'], ['31', 'Lakshadweep'],
  ['32', 'Kerala'], ['33', 'Tamil Nadu'], ['34', 'Puducherry'], ['35', 'Andaman and Nicobar Islands'],
  ['36', 'Telangana'], ['37', 'Andhra Pradesh'], ['38', 'Ladakh'],
].map(([code, name]) => ({ code, name }));

const US_STATES: Region[] = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'],
  ['CA', 'California'], ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'],
  ['DC', 'District of Columbia'], ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'],
  ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'],
  ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'], ['MD', 'Maryland'],
  ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'], ['MS', 'Mississippi'],
  ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'],
  ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'],
  ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'],
  ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['PR', 'Puerto Rico'], ['RI', 'Rhode Island'],
  ['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'],
  ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'],
  ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
].map(([code, name]) => ({ code, name }));

const NZ_REGIONS: Region[] = [
  'Northland', 'Auckland', 'Waikato', 'Bay of Plenty', 'Gisborne', "Hawke's Bay",
  'Taranaki', 'Manawatū-Whanganui', 'Wellington', 'Tasman', 'Nelson', 'Marlborough',
  'West Coast', 'Canterbury', 'Otago', 'Southland', 'Chatham Islands',
].map((name) => ({ code: name, name }));

export const COUNTRIES: CountryProfile[] = [
  {
    code: 'IN',
    name: 'India',
    currency: 'INR',
    locale: 'en-IN',
    currencyName: 'Rupees',
    currencySubName: 'Paise',
    wordScale: 'indian',
    yearStartMonth: 4,
    regionLabel: 'State',
    regions: INDIA_STATES,
    postcodeLabel: 'PIN code',
    taxSystem: 'INDIA_GST',
    taxLabel: 'GST',
    defaultTaxRate: 18,
    itemCodeLabel: 'HSN/SAC',
    identifiers: ['gstin', 'cin', 'pan', 'tan'],
    suggestedFields: [],
    exportNote: 'Supply meant for export — zero-rated. Confirm with your accountant whether you are exporting under LUT without payment of IGST, or with payment and refund.',
    roundTotals: true,
    bankFields: [
      ACCOUNT_NAME,
      BANK_NAME,
      { key: 'bankBranch', label: 'Branch' },
      ACCOUNT_NO,
      { key: 'bankIfsc', label: 'IFSC', mono: true, upper: true },
      { key: 'upiId', label: 'UPI ID' },
      SWIFT,
    ],
  },
  {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    locale: 'en-US',
    currencyName: 'Dollars',
    currencySubName: 'Cents',
    wordScale: 'western',
    yearStartMonth: 1,
    regionLabel: 'State',
    regions: US_STATES,
    postcodeLabel: 'ZIP code',
    // Sales tax is set by state and often by city, and most states do not tax
    // professional services at all. Defaulting to zero and letting each item
    // carry its own rate is the honest behaviour: better a blank the owner
    // fills in than a confident wrong number on an invoice.
    taxSystem: 'SINGLE',
    taxLabel: 'Sales tax',
    defaultTaxRate: 0,
    itemCodeLabel: '',
    identifiers: [],
    suggestedFields: ['EIN', 'State registration no.'],
    roundTotals: false,
    bankFields: [
      ACCOUNT_NAME,
      BANK_NAME,
      ACCOUNT_NO,
      {
        key: 'bankAccountType',
        label: 'Account type',
        options: ['Checking', 'Savings', 'Business checking', 'Business savings'],
      },
      {
        key: 'bankRouting',
        label: 'Routing number (ABA)',
        hint: 'Nine digits. Some banks use a different one for wires than for ACH — print the one you want paid on.',
        mono: true,
      },
      SWIFT,
    ],
  },
  {
    code: 'NZ',
    name: 'New Zealand',
    currency: 'NZD',
    locale: 'en-NZ',
    currencyName: 'Dollars',
    currencySubName: 'Cents',
    wordScale: 'western',
    yearStartMonth: 4,
    regionLabel: 'Region',
    regions: NZ_REGIONS,
    postcodeLabel: 'Postcode',
    taxSystem: 'SINGLE',
    taxLabel: 'GST',
    defaultTaxRate: 15,
    itemCodeLabel: '',
    identifiers: [],
    suggestedFields: ['NZBN', 'IRD number'],
    roundTotals: false,
    bankFields: [
      ACCOUNT_NAME,
      BANK_NAME,
      {
        key: 'bankAccountNo',
        label: 'Account number',
        hint: 'BB-bbbb-AAAAAAA-SS — the bank and branch are already in it, so there is no separate code',
        mono: true,
      },
      SWIFT,
    ],
  },
];

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

export const DEFAULT_COUNTRY = 'IN';

/** Falls back to India, which is what every existing database is. */
export function countryProfile(code?: string | null): CountryProfile {
  return BY_CODE.get((code ?? '').toUpperCase()) ?? BY_CODE.get(DEFAULT_COUNTRY)!;
}

export function isKnownCountry(code?: string | null): boolean {
  return BY_CODE.has((code ?? '').toUpperCase());
}
