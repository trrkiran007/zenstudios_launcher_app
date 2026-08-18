import { Router } from 'express';
import { prisma } from '../db.js';
import { h, parseDate } from '../lib/http.js';
import { financialYear, round2 } from '../lib/money.js';

export const reportsRouter = Router();

/** Start of the Indian financial year containing `d`. */
function fyStart(d = new Date()) {
  const year = d.getMonth() + 1 >= 4 ? d.getFullYear() : d.getFullYear() - 1;
  return new Date(year, 3, 1);
}

function range(req: { query: Record<string, unknown> }) {
  const from = parseDate(req.query.from) ?? fyStart();
  const to = parseDate(req.query.to) ?? new Date();
  return { from, to, label: `${from.toISOString().slice(0, 10)} → ${to.toISOString().slice(0, 10)}` };
}

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

reportsRouter.get(
  '/dashboard',
  h(async (req, res) => {
    const { from, to } = range(req as any);
    const businessTypeId = req.query.businessTypeId ? String(req.query.businessTypeId) : undefined;
    const btFilter = businessTypeId ? { businessTypeId } : {};

    const [quotes, projects, invoices, expenses, businessTypes] = await Promise.all([
      prisma.quotation.findMany({
        where: { ...btFilter, archivedAt: null, quoteDate: { gte: from, lte: to } },
        select: {
          id: true, status: true, grandTotal: true, taxableValue: true, totalCost: true,
          grossProfit: true, quoteDate: true, businessTypeId: true,
        },
      }),
      prisma.project.findMany({
        where: btFilter,
        include: {
          stage: true,
          businessType: { select: { id: true, name: true, color: true } },
          expenses: { select: { amount: true } },
          invoices: { select: { grandTotal: true, amountPaid: true, status: true, type: true } },
        },
      }),
      prisma.invoice.findMany({
        where: { issueDate: { gte: from, lte: to }, status: { not: 'CANCELLED' }, ...(businessTypeId ? { project: { businessTypeId } } : {}) },
        select: { grandTotal: true, amountPaid: true, issueDate: true, type: true, status: true, dueDate: true },
      }),
      prisma.expense.findMany({
        where: { date: { gte: from, lte: to }, ...(businessTypeId ? { project: { businessTypeId } } : {}) },
        select: { amount: true, category: true, date: true },
      }),
      prisma.businessType.findMany({ where: { active: true }, orderBy: { order: 'asc' } }),
    ]);

    const byStatus = (s: string) => quotes.filter((q) => q.status === s);
    const sum = (arr: number[]) => round2(arr.reduce((a, b) => a + b, 0));

    const decided = quotes.filter((q) => ['ACCEPTED', 'REJECTED'].includes(q.status));
    const accepted = byStatus('ACCEPTED');

    const activeProjects = projects.filter((p) => p.status === 'ACTIVE');
    const taxInvoices = invoices.filter((i) => i.type === 'TAX');
    const invoicedTotal = sum(taxInvoices.map((i) => i.grandTotal));
    const receivedTotal = sum(taxInvoices.map((i) => i.amountPaid));

    const now = new Date();
    const overdue = taxInvoices.filter(
      (i) => i.status !== 'PAID' && i.dueDate && new Date(i.dueDate) < now,
    );

    // Monthly revenue (invoiced) vs expenses, over the selected window.
    const months = new Map<string, { month: string; invoiced: number; received: number; expenses: number }>();
    const touch = (d: Date) => {
      const k = monthKey(new Date(d));
      if (!months.has(k)) months.set(k, { month: k, invoiced: 0, received: 0, expenses: 0 });
      return months.get(k)!;
    };
    for (let d = new Date(from.getFullYear(), from.getMonth(), 1); d <= to; d.setMonth(d.getMonth() + 1)) touch(d);
    taxInvoices.forEach((i) => {
      const m = touch(new Date(i.issueDate));
      m.invoiced = round2(m.invoiced + i.grandTotal);
      m.received = round2(m.received + i.amountPaid);
    });
    expenses.forEach((e) => {
      const m = touch(new Date(e.date));
      m.expenses = round2(m.expenses + e.amount);
    });

    const pipelineByStage = Object.values(
      activeProjects.reduce<Record<string, { stage: string; color: string; count: number; value: number; order: number }>>(
        (acc, p) => {
          const k = `${p.businessTypeId}:${p.stage.id}`;
          acc[k] ??= { stage: p.stage.name, color: p.stage.color, count: 0, value: 0, order: p.stage.order };
          acc[k].count += 1;
          acc[k].value = round2(acc[k].value + p.contractValue);
          return acc;
        },
        {},
      ),
    ).sort((a, b) => a.order - b.order);

    const byBusinessType = businessTypes.map((bt) => {
      const btQuotes = quotes.filter((q) => q.businessTypeId === bt.id);
      const btProjects = projects.filter((p) => p.businessTypeId === bt.id);
      const btAccepted = btQuotes.filter((q) => q.status === 'ACCEPTED');
      return {
        id: bt.id,
        key: bt.key,
        name: bt.name,
        color: bt.color,
        quoteCount: btQuotes.length,
        quoteValue: sum(btQuotes.map((q) => q.grandTotal)),
        wonValue: sum(btAccepted.map((q) => q.grandTotal)),
        activeProjects: btProjects.filter((p) => p.status === 'ACTIVE').length,
        pipelineValue: sum(btProjects.filter((p) => p.status === 'ACTIVE').map((p) => p.contractValue)),
      };
    });

    const expenseByCategory = Object.values(
      expenses.reduce<Record<string, { category: string; amount: number }>>((acc, e) => {
        acc[e.category] ??= { category: e.category, amount: 0 };
        acc[e.category].amount = round2(acc[e.category].amount + e.amount);
        return acc;
      }, {}),
    ).sort((a, b) => b.amount - a.amount);

    res.json({
      financialYear: financialYear(to),
      window: { from, to },
      quotes: {
        total: quotes.length,
        totalValue: sum(quotes.map((q) => q.grandTotal)),
        draft: byStatus('DRAFT').length,
        sent: byStatus('SENT').length,
        accepted: accepted.length,
        rejected: byStatus('REJECTED').length,
        acceptedValue: sum(accepted.map((q) => q.grandTotal)),
        openValue: sum(quotes.filter((q) => ['DRAFT', 'SENT'].includes(q.status)).map((q) => q.grandTotal)),
        conversionRate: decided.length ? round2((accepted.length / decided.length) * 100) : 0,
        expectedMargin: accepted.length
          ? round2((sum(accepted.map((q) => q.grossProfit)) / Math.max(sum(accepted.map((q) => q.taxableValue)), 1)) * 100)
          : 0,
      },
      projects: {
        active: activeProjects.length,
        onHold: projects.filter((p) => p.status === 'ON_HOLD').length,
        completed: projects.filter((p) => p.status === 'COMPLETED').length,
        pipelineValue: sum(activeProjects.map((p) => p.contractValue)),
      },
      money: {
        invoiced: invoicedTotal,
        received: receivedTotal,
        outstanding: round2(invoicedTotal - receivedTotal),
        overdueCount: overdue.length,
        overdueValue: sum(overdue.map((i) => round2(i.grandTotal - i.amountPaid))),
        expenses: sum(expenses.map((e) => e.amount)),
      },
      monthly: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)),
      pipelineByStage,
      byBusinessType,
      expenseByCategory,
    });
  }),
);

/** Per-project P&L: quoted revenue vs item cost + booked expenses. */
reportsRouter.get(
  '/profitability',
  h(async (req, res) => {
    const businessTypeId = req.query.businessTypeId ? String(req.query.businessTypeId) : undefined;
    const projects = await prisma.project.findMany({
      where: businessTypeId ? { businessTypeId } : {},
      include: {
        client: { select: { name: true } },
        businessType: { select: { name: true, color: true } },
        stage: { select: { name: true } },
        expenses: { select: { amount: true } },
        invoices: { where: { status: { not: 'CANCELLED' }, type: 'TAX' }, select: { grandTotal: true, amountPaid: true } },
        quotation: { select: { number: true, taxableValue: true, totalCost: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(
      projects.map((p) => {
        const revenue = p.quotation?.taxableValue ?? p.contractValue;
        const actualCost = round2(p.expenses.reduce((a, e) => a + e.amount, 0));
        const budgetedCost = p.estimatedCost;
        const invoiced = round2(p.invoices.reduce((a, i) => a + i.grandTotal, 0));
        const received = round2(p.invoices.reduce((a, i) => a + i.amountPaid, 0));
        const margin = (cost: number) => (revenue > 0 ? round2(((revenue - cost) / revenue) * 100) : 0);
        return {
          id: p.id,
          code: p.code,
          name: p.name,
          client: p.client.name,
          businessType: p.businessType.name,
          color: p.businessType.color,
          stage: p.stage.name,
          status: p.status,
          quotationNumber: p.quotation?.number ?? null,
          revenue,
          budgetedCost,
          actualCost,
          costVariance: round2(budgetedCost - actualCost),
          budgetedProfit: round2(revenue - budgetedCost),
          budgetedMarginPct: margin(budgetedCost),
          actualProfit: round2(revenue - actualCost),
          actualMarginPct: margin(actualCost),
          invoiced,
          received,
          outstanding: round2(invoiced - received),
        };
      }),
    );
  }),
);

reportsRouter.get(
  '/receivables',
  h(async (req, res) => {
    const invoices = await prisma.invoice.findMany({
      where: { type: 'TAX', status: { in: ['ISSUED', 'PARTIALLY_PAID'] } },
      include: { client: { select: { name: true } }, project: { select: { code: true, name: true } } },
      orderBy: { dueDate: 'asc' },
    });
    const now = Date.now();
    res.json(
      invoices.map((i) => {
        const balance = round2(i.grandTotal - i.amountPaid);
        const days = i.dueDate ? Math.floor((now - new Date(i.dueDate).getTime()) / 86400000) : 0;
        return {
          id: i.id,
          number: i.number,
          client: i.client.name,
          project: i.project ? `${i.project.code} — ${i.project.name}` : null,
          issueDate: i.issueDate,
          dueDate: i.dueDate,
          grandTotal: i.grandTotal,
          amountPaid: i.amountPaid,
          balance,
          daysOverdue: days > 0 ? days : 0,
          bucket: days <= 0 ? 'Current' : days <= 30 ? '1-30 days' : days <= 60 ? '31-60 days' : days <= 90 ? '61-90 days' : '90+ days',
        };
      }),
    );
  }),
);

/** Rate benchmark drawn only from your own accepted quotes. */
reportsRouter.get(
  '/rate-history',
  h(async (req, res) => {
    const businessTypeId = req.query.businessTypeId ? String(req.query.businessTypeId) : undefined;
    const items = await prisma.quotationItem.findMany({
      where: {
        section: {
          quotation: {
            archivedAt: null,
            ...(businessTypeId ? { businessTypeId } : {}),
            status: { in: ['SENT', 'ACCEPTED'] },
          },
        },
      },
      include: { section: { include: { quotation: { select: { number: true, quoteDate: true, status: true } } } } },
      orderBy: { id: 'desc' },
      take: 4000,
    });

    const grouped = new Map<string, { description: string; unit: string; rates: number[]; lastUsed: Date }>();
    for (const it of items) {
      const key = `${it.description.trim().toLowerCase()}|${it.unit}`;
      const g = grouped.get(key) ?? {
        description: it.description.trim(),
        unit: it.unit,
        rates: [],
        lastUsed: it.section.quotation.quoteDate,
      };
      g.rates.push(it.rate);
      if (it.section.quotation.quoteDate > g.lastUsed) g.lastUsed = it.section.quotation.quoteDate;
      grouped.set(key, g);
    }

    res.json(
      [...grouped.values()]
        .filter((g) => g.rates.length > 0)
        .map((g) => {
          const sorted = [...g.rates].sort((a, b) => a - b);
          return {
            description: g.description,
            unit: g.unit,
            uses: g.rates.length,
            min: sorted[0],
            median: sorted[Math.floor(sorted.length / 2)],
            max: sorted[sorted.length - 1],
            avg: round2(g.rates.reduce((a, b) => a + b, 0) / g.rates.length),
            lastUsed: g.lastUsed,
          };
        })
        .sort((a, b) => b.uses - a.uses),
    );
  }),
);
