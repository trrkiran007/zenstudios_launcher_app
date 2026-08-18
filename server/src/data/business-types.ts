/**
 * The lines of business ZenStudios quotes for, with their delivery pipelines
 * and default terms.
 *
 * These are seed defaults only. Everything here is editable in Settings once the
 * app is running, and adding a new line of business needs no code change.
 */

export type StageSeed = { name: string; color: string; isTerminal?: boolean; isWon?: boolean };

export type BusinessTypeSeed = {
  key: string;
  name: string;
  shortCode: string;
  layout: 'SECTIONED' | 'FLAT';
  sectionLabel: string;
  description: string;
  color: string;
  order: number;
  enableBenchmark: boolean;
  defaultTerms: string;
  stages: StageSeed[];
};

const INTERIOR_TERMS = `1. This quotation is valid for 15 days from the date of issue.
2. Payment schedule: 10% on design sign-off, 40% on order confirmation, 40% before dispatch of material, 10% on handover.
3. Rates are for the scope and specifications stated above. Any change in scope, material, brand or finish will be quoted separately.
4. Civil work, plumbing, structural changes, and statutory approvals are excluded unless explicitly listed.
5. Electrical work is limited to what is listed; concealed conduiting and DB changes are excluded unless stated.
6. Site should be handed over free of debris, with water and power available. Waiting charges apply for site delays beyond 7 days.
7. Delivery timeline commences from the date of design sign-off and receipt of advance.
8. Warranty: 1 year on workmanship. Hardware and appliances carry the respective manufacturer's warranty.
9. Colour and grain variation in natural materials (veneer, stone, wood) is inherent and not a defect.
10. Prices are subject to GST as applicable and shown separately.`;

const B2B_TERMS = `1. This quotation is valid for 15 days from the date of issue.
2. Prices are Ex-works unless stated otherwise. Freight, insurance and unloading are extra at actuals.
3. Payment terms: 50% advance along with Purchase Order, balance 50% against proforma before dispatch.
4. Delivery: 2-4 weeks from receipt of confirmed PO and advance, subject to stock availability.
5. Goods once dispatched will not be taken back unless damaged in transit and reported within 48 hours with photographic evidence.
6. Warranty as per the respective manufacturer's standard terms. We facilitate but do not underwrite manufacturer warranty.
7. Prices are subject to GST as applicable and shown separately. E-way bill will be generated as required.
8. Any statutory levy introduced after the date of this quotation will be charged at actuals.
9. Orders are subject to confirmation in writing. Verbal instructions are not binding.
10. Disputes, if any, are subject to the jurisdiction of courts at Hyderabad, Telangana.`;

/**
 * Retail work is priced against constraints residential work simply does not
 * have: brand guideline compliance, mall and landlord permissions, and the fact
 * that a live store can usually only be worked on after trading hours.
 */
const RETAIL_TERMS = `1. This quotation is valid for 30 days from the date of issue.
2. Rates are based on the site survey and the brand guidelines / artwork supplied. Any revision to brand artwork, specification or scope after sign-off will be quoted separately.
3. Payment terms: 50% along with the Purchase Order, 40% on completion of fabrication and before dispatch to site, 10% within 15 days of handover.
4. Statutory approvals are excluded: municipal signage permission, mall or landlord NOC, fire NOC, hoarding licence and any associated fees are to the client's account.
5. Work is quoted for normal working hours. Night work, holiday work, or working in restricted mall hours is chargeable extra unless the quotation explicitly states night-shift execution.
6. The client shall provide, free of cost at site: unobstructed access, a secure area for material storage, three-phase power, water, and the store shut-down window agreed in writing.
7. Existing structure, facade, flooring and electrical infrastructure are assumed sound. Rectification of pre-existing defects, structural strengthening and load augmentation are excluded.
8. Scaffolding, cranes, hydraulic ladders and other access equipment are included only where listed as a line item.
9. Warranty: 12 months on workmanship. LED modules, drivers and power supplies carry the manufacturer's warranty. Damage from water ingress caused by pre-existing facade defects, from voltage fluctuation, or from third-party interference is excluded.
10. Colour reproduction on printed and painted surfaces is matched as closely as the medium allows; an exact Pantone match across different substrates cannot be guaranteed.
11. Delivery timeline commences from written PO, approved artwork and receipt of advance, and assumes uninterrupted site access.
12. Prices are subject to GST as applicable and shown separately. Disputes, if any, are subject to the jurisdiction of courts at Hyderabad, Telangana.`;

export const BUSINESS_TYPES: BusinessTypeSeed[] = [
  {
    key: 'INTERIOR',
    name: 'Interior Design',
    shortCode: 'INT',
    layout: 'SECTIONED',
    sectionLabel: 'Room',
    description: 'Residential and commercial interior design, build and fit-out.',
    color: '#16A34A',
    order: 0,
    enableBenchmark: true,
    defaultTerms: INTERIOR_TERMS,
    stages: [
      { name: 'Design Sign-off', color: '#8B5CF6' },
      { name: 'Advance Received', color: '#6366F1' },
      { name: 'Site Measurement', color: '#0EA5E9' },
      { name: 'Production', color: '#F59E0B' },
      { name: 'Delivery', color: '#F97316' },
      { name: 'Installation', color: '#10B981' },
      { name: 'Snagging', color: '#EF4444' },
      { name: 'Handover', color: '#16A34A' },
      { name: 'Closed', color: '#64748B', isTerminal: true, isWon: true },
    ],
  },
  {
    key: 'RETAIL_BRANDING',
    name: 'Retail & Commercial Branding',
    shortCode: 'RTL',
    layout: 'SECTIONED',
    sectionLabel: 'Zone',
    description:
      'Store branding and rebranding, shop-in-shop, outlet interiors and exteriors, signage and facade work for brand stores, retail chains and distributor outlets.',
    color: '#7C3AED',
    order: 1,
    enableBenchmark: true,
    defaultTerms: RETAIL_TERMS,
    stages: [
      { name: 'Brief & Site Survey', color: '#8B5CF6' },
      { name: 'Design & Brand Approval', color: '#6366F1' },
      { name: 'PO Received', color: '#0EA5E9' },
      { name: 'Fabrication', color: '#F59E0B' },
      { name: 'Site Mobilisation', color: '#F97316' },
      { name: 'Installation', color: '#10B981' },
      { name: 'Commissioning', color: '#14B8A6' },
      { name: 'Snagging & Handover', color: '#EF4444' },
      { name: 'Closed', color: '#64748B', isTerminal: true, isWon: true },
    ],
  },
  {
    key: 'B2B_PROCUREMENT',
    name: 'B2B Procurement & Resale',
    shortCode: 'B2B',
    layout: 'FLAT',
    sectionLabel: 'Group',
    description: 'Sourcing and reselling products to client companies.',
    color: '#0EA5E9',
    order: 2,
    enableBenchmark: false,
    defaultTerms: B2B_TERMS,
    stages: [
      { name: 'PO Received', color: '#8B5CF6' },
      { name: 'Vendor PO Raised', color: '#6366F1' },
      { name: 'In Transit', color: '#0EA5E9' },
      { name: 'Delivered', color: '#10B981' },
      { name: 'Invoiced', color: '#F59E0B' },
      { name: 'Payment Received', color: '#16A34A' },
      { name: 'Closed', color: '#64748B', isTerminal: true, isWon: true },
    ],
  },
];

export const INVOICE_TERMS = `1. Payment due within 15 days of invoice date unless otherwise agreed in writing.
2. Interest at 18% per annum is chargeable on amounts outstanding beyond the due date.
3. Please quote the invoice number on all remittances.
4. Goods and services remain the property of OMHome Services Private Limited until paid for in full.
5. Subject to Hyderabad, Telangana jurisdiction.`;

export { INTERIOR_TERMS, B2B_TERMS, RETAIL_TERMS };
