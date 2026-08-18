import type { Router } from 'express';
import { attachmentsRouter, notesRouter } from './activity.js';
import { benchmarkRouter } from './benchmark.js';
import { businessTypesRouter } from './businessTypes.js';
import { catalogRouter } from './catalog.js';
import { clientsRouter } from './clients.js';
import { expensesRouter } from './expenses.js';
import { invoicesRouter } from './invoices.js';
import { projectsRouter, tasksRouter } from './projects.js';
import { quotationsRouter } from './quotations.js';
import { reportsRouter } from './reports.js';
import { settingsRouter } from './settings.js';
import { transferRouter } from './transfer.js';

/** Mount path → router. Adding a route here is the only wiring step. */
export const activityRouters: Record<string, Router> = {
  '/settings': settingsRouter,
  '/business-types': businessTypesRouter,
  '/clients': clientsRouter,
  '/catalog': catalogRouter,
  '/quotations': quotationsRouter,
  '/projects': projectsRouter,
  '/tasks': tasksRouter,
  '/notes': notesRouter,
  '/attachments': attachmentsRouter,
  '/expenses': expensesRouter,
  '/invoices': invoicesRouter,
  '/reports': reportsRouter,
  '/benchmark': benchmarkRouter,
  '/transfer': transferRouter,
};
