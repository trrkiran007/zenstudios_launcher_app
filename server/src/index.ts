import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { IS_PROD, PORT, WEB_DIST } from './config.js';
import { prisma } from './db.js';
import { errorHandler } from './lib/http.js';
import { closePdfEngine } from './lib/pdf.js';
import { GST_STATES } from './lib/states.js';
import { activityRouters } from './routes/index.js';

export function createApp({ serveWeb = IS_PROD }: { serveWeb?: boolean } = {}) {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  const api = express.Router();
  api.get('/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));
  api.get('/meta/states', (_req, res) => res.json(GST_STATES));
  api.get('/meta/units', (_req, res) =>
    res.json(['Sq.ft', 'R.ft', 'Nos', 'Set', 'Lump sum', 'Sq.mt', 'Kg', 'Litre', 'Hour', 'Day', 'Month']),
  );

  for (const [mount, router] of Object.entries(activityRouters)) api.use(mount, router);

  app.use('/api', api);

  // The built SPA is served from the same origin as the API, so the desktop
  // shell and a hosted deployment both work with relative /api calls.
  if (serveWeb && fs.existsSync(WEB_DIST)) {
    app.use(express.static(WEB_DIST));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(WEB_DIST, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}

export type RunningServer = { url: string; port: number; close: () => Promise<void> };

/**
 * Start the API. Port 0 asks the OS for a free port, which is what the desktop
 * app uses so it never collides with something already running on 4321.
 */
export function startServer({
  port = PORT,
  serveWeb = IS_PROD,
}: { port?: number; serveWeb?: boolean } = {}): Promise<RunningServer> {
  const app = createApp({ serveWeb });

  return new Promise((resolve, reject) => {
    const server = app.listen(port, '127.0.0.1', () => {
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;
      resolve({
        url: `http://127.0.0.1:${actualPort}`,
        port: actualPort,
        close: async () => {
          await new Promise<void>((done) => server.close(() => done()));
          await closePdfEngine();
          await prisma.$disconnect();
        },
      });
    });
    server.on('error', reject);
  });
}

/* --------------------------- terminal entry point ------------------------ */

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const running = await startServer();
  console.log(`\n  ZenStudios API  →  ${running.url}/api`);
  if (IS_PROD && fs.existsSync(WEB_DIST)) console.log(`  App             →  ${running.url}\n`);
  else console.log('');

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received, shutting down…`);
    await running.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}
