export type Organization = {
  id: string;
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
  logoPath: string | null;
  brandColor: string;
  accentColor: string;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNo: string | null;
  bankIfsc: string | null;
  bankBranch: string | null;
  upiId: string | null;
  defaultTerms: string | null;
  defaultInvoiceTerms: string | null;
  defaultValidityDays: number;
  invoicePrefix: string;
  proformaPrefix: string;
};

export type PipelineStage = {
  id: string;
  businessTypeId: string;
  name: string;
  order: number;
  color: string;
  isTerminal: boolean;
  isWon: boolean;
};

export type BusinessType = {
  id: string;
  key: string;
  name: string;
  shortCode: string;
  layout: 'SECTIONED' | 'FLAT';
  sectionLabel: string;
  description: string | null;
  color: string;
  active: boolean;
  order: number;
  enableBenchmark: boolean;
  defaultTerms: string | null;
  stages?: PipelineStage[];
  _count?: { quotations: number; projects: number; catalogItems: number };
};

export type Client = {
  id: string;
  name: string;
  kind: 'COMPANY' | 'INDIVIDUAL';
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  altPhone: string | null;
  gstin: string | null;
  pan: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  stateCode: string | null;
  pincode: string | null;
  notes: string | null;
  archived: boolean;
  _count?: { quotations: number; projects: number; invoices: number };
};

export type CatalogItem = {
  id: string;
  businessTypeId: string;
  name: string;
  sku: string | null;
  brand: string | null;
  category: string | null;
  unit: string;
  defaultRate: number;
  costPrice: number;
  hsnSac: string | null;
  gstRate: number;
  specNote: string | null;
  active: boolean;
};

export type QuotationItem = {
  id?: string;
  catalogItemId?: string | null;
  description: string;
  specNote: string | null;
  hsnSac: string | null;
  unit: string;
  quantity: number;
  rate: number;
  costPrice: number;
  discountPct: number;
  gstRate: number;
  amount?: number;
};

export type QuotationSection = {
  id?: string;
  name: string;
  notes: string | null;
  items: QuotationItem[];
};

export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'SUPERSEDED';

export type Quotation = {
  id: string;
  number: string;
  version: number;
  parentId: string | null;
  businessTypeId: string;
  clientId: string;
  title: string;
  status: QuotationStatus;
  quoteDate: string;
  validUntil: string | null;
  taxMode: 'FULL_GST' | 'FLAT';
  flatGstRate: number;
  placeOfSupplyState: string | null;
  placeOfSupplyCode: string | null;
  discountType: 'NONE' | 'PERCENT' | 'AMOUNT';
  discountValue: number;
  notes: string | null;
  termsText: string | null;
  subtotal: number;
  discountAmount: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  roundOff: number;
  grandTotal: number;
  totalCost: number;
  grossProfit: number;
  marginPct: number;
  archivedAt: string | null;
  createdAt: string;
  businessType?: BusinessType;
  client?: Client;
  sections?: QuotationSection[];
  project?: { id: string; code: string } | null;
  revisions?: { id: string; number: string; version: number; status: string }[];
  parent?: { id: string; number: string; version: number } | null;
  _count?: { revisions: number };
};

export type Task = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  assignee: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate: string | null;
  order: number;
  attachments?: Attachment[];
  project?: { id: string; code: string; name: string; businessType?: { name: string; color: string } };
};

export type Attachment = {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  caption: string | null;
  createdAt: string;
};

export type Note = {
  id: string;
  body: string;
  author: string;
  kind: 'NOTE' | 'STAGE_CHANGE' | 'SYSTEM';
  createdAt: string;
  attachments?: Attachment[];
};

export type Expense = {
  id: string;
  projectId: string;
  date: string;
  category: string;
  vendor: string | null;
  description: string | null;
  amount: number;
  gstAmount: number;
  billable: boolean;
  paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL';
  reference: string | null;
  attachments?: Attachment[];
  project?: { id: string; code: string; name: string; businessType?: { name: string; color: string } };
};

export type Payment = {
  id: string;
  invoiceId: string;
  date: string;
  amount: number;
  mode: string;
  reference: string | null;
  notes: string | null;
};

export type InvoiceItem = {
  id?: string;
  description: string;
  specNote: string | null;
  hsnSac: string | null;
  unit: string;
  quantity: number;
  rate: number;
  discountPct: number;
  gstRate: number;
  amount?: number;
};

export type Invoice = {
  id: string;
  number: string;
  type: 'PROFORMA' | 'TAX';
  projectId: string | null;
  quotationId: string | null;
  clientId: string;
  issueDate: string;
  dueDate: string | null;
  poNumber: string | null;
  poDate: string | null;
  taxMode: 'FULL_GST' | 'FLAT';
  flatGstRate: number;
  placeOfSupplyState: string | null;
  placeOfSupplyCode: string | null;
  discountType: 'NONE' | 'PERCENT' | 'AMOUNT';
  discountValue: number;
  subtotal: number;
  discountAmount: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  roundOff: number;
  grandTotal: number;
  amountPaid: number;
  status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
  notes: string | null;
  termsText: string | null;
  client?: { id: string; name: string };
  project?: { id: string; code: string; name: string } | null;
  items?: InvoiceItem[];
  payments?: Payment[];
};

export type Project = {
  id: string;
  code: string;
  name: string;
  businessTypeId: string;
  clientId: string;
  quotationId: string | null;
  stageId: string;
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  contractValue: number;
  estimatedCost: number;
  description: string | null;
  startDate: string | null;
  targetDate: string | null;
  updatedAt: string;
  businessType?: BusinessType;
  client?: Client;
  stage?: PipelineStage;
  quotation?: { id: string; number: string; title: string; grandTotal: number; taxableValue: number } | null;
  openTaskCount?: number;
  _count?: { tasks: number; expenses: number; attachments: number; invoices: number };
};

export type ProjectDetail = Project & {
  tasks: Task[];
  expenses: Expense[];
  invoices: Invoice[];
  notesLog: Note[];
  attachments: Attachment[];
  stageEvents: { id: string; fromStage: string | null; toStage: string; note: string | null; changedAt: string }[];
  stages: PipelineStage[];
  finance: {
    contractValue: number;
    revenue: number;
    /** Cost of the quoted line items — the plan. */
    budgetedCost: number;
    /** Expenses actually booked against the project — the reality. */
    actualCost: number;
    costVariance: number;
    budgetedProfit: number;
    budgetedMarginPct: number;
    actualProfit: number;
    actualMarginPct: number;
    spendAgainstBudgetPct: number;
    invoicedTotal: number;
    receivedTotal: number;
    outstanding: number;
  };
};

export type CompetitorQuote = {
  id: string;
  competitorName: string;
  city: string | null;
  clientSegment: string | null;
  projectType: string | null;
  carpetArea: number | null;
  sourceNote: string | null;
  quoteDate: string | null;
  originalName: string | null;
  mimeType: string | null;
  pageCount: number | null;
  status: 'UPLOADED' | 'EXTRACTED' | 'ANALYZED' | 'FAILED';
  totalValue: number | null;
  summary: string | null;
  critique: string | null;
  error: string | null;
  createdAt: string;
  items?: CompetitorLineItem[];
  analysis?: CompetitorAnalysis | null;
  _count?: { items: number };
};

export type CompetitorLineItem = {
  id: string;
  room: string | null;
  category: string | null;
  description: string;
  unit: string | null;
  quantity: number | null;
  rate: number | null;
  amount: number | null;
  notes: string | null;
};

export type CompetitorAnalysis = {
  competitorName: string | null;
  quoteDateText: string | null;
  projectType: string | null;
  carpetAreaSqft: number | null;
  totalValue: number | null;
  currency: string;
  taxTreatment: string;
  summary: string;
  structureNotes: string;
  pricingPatterns: string[];
  commercialTerms: string[];
  redFlags: string[];
  strengths: string[];
  gapsInMyPractice: string[];
  critique: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
};

export type Dashboard = {
  financialYear: string;
  window: { from: string; to: string };
  quotes: {
    total: number; totalValue: number; draft: number; sent: number; accepted: number;
    rejected: number; acceptedValue: number; openValue: number; conversionRate: number; expectedMargin: number;
  };
  projects: { active: number; onHold: number; completed: number; pipelineValue: number };
  money: {
    invoiced: number; received: number; outstanding: number;
    overdueCount: number; overdueValue: number; expenses: number;
  };
  monthly: { month: string; invoiced: number; received: number; expenses: number }[];
  pipelineByStage: { stage: string; color: string; count: number; value: number }[];
  byBusinessType: {
    id: string; key: string; name: string; color: string; quoteCount: number;
    quoteValue: number; wonValue: number; activeProjects: number; pipelineValue: number;
  }[];
  expenseByCategory: { category: string; amount: number }[];
};

export type SystemInfo = {
  aiKeySource: 'env' | 'stored' | 'none';
  aiEnabled: boolean;
  pdfEngine: boolean;
  /** Version of the installed app, shown in the sidebar and Settings. */
  appVersion?: string;
  /** True inside the Electron shell — switches on the draggable title strip. */
  desktop?: boolean;
};
