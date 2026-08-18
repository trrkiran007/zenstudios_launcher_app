import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Company identity used to seed a fresh database.
 *
 * Real values live in server/company.json, which is deliberately NOT in version
 * control — it carries CIN, PAN, TAN and contact details. company.example.json
 * is committed as the template. Everything here is editable in Settings once
 * the app is running; this only decides what a brand-new database starts with.
 */
export type CompanyProfile = {
  brandName: string;
  legalName: string;
  trademarkLine: string | null;
  cin: string | null;
  pan: string | null;
  tan: string | null;
  gstin: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  stateCode: string | null;
  pincode: string | null;
  country: string;
  email: string | null;
  phone: string | null;
  altPhone: string | null;
  website: string | null;
  brandColor: string;
};

const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const FALLBACK: CompanyProfile = {
  brandName: 'ZenStudios',
  legalName: 'OMHOME SERVICES PRIVATE LIMITED',
  trademarkLine: 'A trademark of OMHome Services Pvt Ltd.',
  cin: null,
  pan: null,
  tan: null,
  gstin: null,
  addressLine1: null,
  addressLine2: null,
  city: 'Hyderabad',
  state: 'Telangana',
  stateCode: '36',
  pincode: null,
  country: 'India',
  email: null,
  phone: null,
  altPhone: null,
  website: null,
  brandColor: '#16A34A',
};

/** company.json wins; the committed example is the fallback. */
export function loadCompanyProfile(): CompanyProfile {
  for (const name of ['company.json', 'company.example.json']) {
    const file = path.join(SERVER_ROOT, name);
    if (!fs.existsSync(file)) continue;
    try {
      return { ...FALLBACK, ...(JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<CompanyProfile>) };
    } catch (err) {
      console.warn(`[company] ${name} could not be read: ${err instanceof Error ? err.message : err}`);
    }
  }
  return FALLBACK;
}
