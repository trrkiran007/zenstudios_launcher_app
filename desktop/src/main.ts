import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  app, BrowserWindow, dialog, Menu, shell, type MenuItemConstructorOptions,
} from 'electron';
import { readSettings, writeSettings } from './settings.js';

// Set before any getPath('userData') call, so data lands in a folder named for
// the product rather than the internal package name.
app.setName('ZenStudios');

const isDev = !app.isPackaged;

/** Data lives outside the bundle so an app update never touches it. */
const DATA_DIR = path.join(app.getPath('userData'), 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const BRANDING_DIR = path.join(DATA_DIR, 'branding');
const DB_FILE = path.join(DATA_DIR, 'app.db');

/** Files shipped inside the bundle: the server, the built UI, the seed database. */
const resourcesDir = isDev ? path.join(__dirname, '..', '..') : process.resourcesPath;
const SERVER_ENTRY = isDev
  ? path.join(resourcesDir, 'server', 'dist', 'server.mjs')
  : path.join(resourcesDir, 'app', 'server', 'dist', 'server.mjs');
const WEB_DIST = isDev
  ? path.join(resourcesDir, 'web', 'dist')
  : path.join(resourcesDir, 'app', 'web', 'dist');
const TEMPLATE_DB = isDev
  ? path.join(__dirname, '..', 'resources', 'app-template.db')
  : path.join(resourcesDir, 'app-template.db');

let mainWindow: BrowserWindow | null = null;
let quitting = false;
let server: { url: string; close: () => Promise<void> } | null = null;

/* ------------------------------ first run ------------------------------- */

/**
 * On first launch, copy the seeded template database into the data directory.
 * Shipping a prepared database avoids having to run Prisma's migration engine
 * inside a packaged app, which is the usual source of grief here.
 */
function ensureDataDir() {
  for (const dir of [DATA_DIR, UPLOAD_DIR, BRANDING_DIR]) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    if (!fs.existsSync(TEMPLATE_DB)) {
      throw new Error(`Seed database missing at ${TEMPLATE_DB}. Run "npm run build:db" in desktop/.`);
    }
    fs.copyFileSync(TEMPLATE_DB, DB_FILE);
  }
}

/* ------------------------------ the server ------------------------------ */

async function startEmbeddedServer() {
  process.env.ZEN_DATA_DIR = DATA_DIR;
  process.env.ZEN_WEB_DIST = WEB_DIST;
  process.env.DATABASE_URL = `file:${DB_FILE}`;
  process.env.NODE_ENV = 'production';

  // In a packaged app the runtime tree sits at Resources/app/node_modules.
  // Point Prisma straight at its native engine rather than relying on the
  // client's own path guessing, which assumes a normal project layout.
  if (app.isPackaged) {
    const enginesDir = path.join(process.resourcesPath, 'app', 'node_modules', '.prisma', 'client');
    if (fs.existsSync(enginesDir)) {
      const engine = fs
        .readdirSync(enginesDir)
        .find((f) => f.startsWith('libquery_engine') && f.endsWith('.node'));
      if (engine) process.env.PRISMA_QUERY_ENGINE_LIBRARY = path.join(enginesDir, engine);
    }
  }

  const mod = await import(pathToFileURL(SERVER_ENTRY).href);
  // Port 0 -> the OS picks a free one, so we never fight an already-running copy.
  const running = await mod.startServer({ port: 0, serveWeb: true });

  // Render PDFs with Electron's own Chromium. This is why the desktop build
  // does not need Puppeteer at all.
  mod.setPdfRenderer?.(renderPdfWithElectron);
  return running;
}

/**
 * Hidden window -> printToPDF, at the A4 page size the templates declare.
 *
 * The HTML goes through a temp file rather than a data: URL — a packaged build
 * closes the connection on large data URLs, which surfaces as "Connection
 * closed." from printToPDF. Offscreen rendering is avoided for the same reason.
 */
async function renderPdfOnce(html: string): Promise<Buffer> {
  const tmpFile = path.join(
    os.tmpdir(),
    `zen-pdf-${Date.now()}-${Math.random().toString(16).slice(2)}.html`,
  );
  fs.writeFileSync(tmpFile, html, 'utf8');

  const win = new BrowserWindow({
    show: false,
    width: 1240,
    height: 1754,
    webPreferences: {
      javascript: false,
      sandbox: true,
      contextIsolation: true,
      // A hidden window is throttled by default, which can stall printToPDF
      // when the app is in the background.
      backgroundThrottling: false,
    },
  });

  try {
    await win.loadFile(tmpFile);
    return await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: { marginType: 'none' },
      generateDocumentOutline: false,
    });
  } finally {
    if (!win.isDestroyed()) win.destroy();
    fs.rmSync(tmpFile, { force: true });
  }
}

async function renderPdfWithElectron(html: string): Promise<Buffer> {
  if (quitting) throw new Error('ZenStudios is closing, so the PDF was not generated. Reopen the app and try again.');

  try {
    return await renderPdfOnce(html);
  } catch (first) {
    // The render window can lose its renderer — most often because the app was
    // quitting or was force-stopped mid-render, which Electron reports as the
    // bare string "Connection closed." One clean retry covers the transient case.
    if (quitting) throw new Error('ZenStudios is closing, so the PDF was not generated. Reopen the app and try again.');
    console.warn('[pdf] first attempt failed, retrying:', first);

    try {
      return await renderPdfOnce(html);
    } catch (second) {
      const detail = second instanceof Error ? second.message : String(second);
      throw new Error(
        `The PDF could not be generated (${detail}). This usually means the app was interrupted ` +
          'mid-render. Reopen ZenStudios and try again — or use Print view and save as PDF.',
      );
    }
  }
}

/* ------------------------------- window --------------------------------- */

async function resolveStartUrl(): Promise<string> {
  const settings = readSettings(DATA_DIR);

  if (settings.mode === 'remote' && settings.remoteUrl.trim()) {
    return settings.remoteUrl.trim().replace(/\/$/, '');
  }

  ensureDataDir();
  server = await startEmbeddedServer();
  return server.url;
}

async function createWindow() {
  const { windowBounds } = readSettings(DATA_DIR);

  mainWindow = new BrowserWindow({
    width: windowBounds?.width ?? 1440,
    height: windowBounds?.height ?? 920,
    x: windowBounds?.x,
    y: windowBounds?.y,
    minWidth: 1024,
    minHeight: 700,
    title: 'ZenStudios',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#f8fafc',
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  mainWindow.on('close', () => {
    if (!mainWindow) return;
    const b = mainWindow.getBounds();
    writeSettings(DATA_DIR, { windowBounds: { width: b.width, height: b.height, x: b.x, y: b.y } });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // External links open in the real browser, not inside the app shell.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (server && url.startsWith(server.url)) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });

  try {
    const url = await resolveStartUrl();
    await mainWindow.loadURL(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await mainWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(
        `<body style="font:14px -apple-system;padding:40px;color:#111">
           <h2>ZenStudios could not start</h2>
           <pre style="white-space:pre-wrap;color:#b91c1c">${message}</pre>
           <p>Use <b>ZenStudios &rsaquo; Server…</b> to switch back to the local database,
              or reveal the data folder from the same menu.</p>
         </body>`,
      )}`,
    );
  }
}

/* -------------------------------- menu ---------------------------------- */

function go(pathname: string) {
  if (!mainWindow) return;
  const base = server?.url ?? readSettings(DATA_DIR).remoteUrl;
  if (base) void mainWindow.loadURL(`${base.replace(/\/$/, '')}${pathname}`);
}

async function chooseServerMode() {
  const settings = readSettings(DATA_DIR);
  const { response } = await dialog.showMessageBox({
    type: 'question',
    title: 'Server',
    message: 'Where should ZenStudios read and write data?',
    detail:
      `Currently: ${settings.mode === 'local' ? 'this Mac (local database)' : settings.remoteUrl}\n\n` +
      'Local keeps everything on this Mac — right for a single user.\n' +
      'Company server points this app at a shared deployment so your team sees the same ' +
      'quotations and projects. The app restarts either way.',
    buttons: ['Cancel', 'Use this Mac', 'Use a company server…'],
    defaultId: 0,
    cancelId: 0,
  });

  if (response === 1) {
    writeSettings(DATA_DIR, { mode: 'local' });
    relaunch();
  } else if (response === 2) {
    // Electron has no text-input dialog; the URL is edited in the settings file.
    const file = path.join(DATA_DIR, 'desktop-settings.json');
    writeSettings(DATA_DIR, { mode: 'remote', remoteUrl: settings.remoteUrl || 'https://' });
    await dialog.showMessageBox({
      type: 'info',
      title: 'Company server',
      message: 'Enter the server address',
      detail:
        `Open ${file} and set "remoteUrl" to your server, for example ` +
        'https://quotes.zenstudios.in — then reopen ZenStudios.',
      buttons: ['Reveal the file'],
    });
    shell.showItemInFolder(file);
    app.quit();
  }
}

function relaunch() {
  app.relaunch();
  app.exit(0);
}

async function backupData() {
  const stamp = new Date().toISOString().slice(0, 10);
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Back up ZenStudios data',
    defaultPath: path.join(app.getPath('documents'), `zenstudios-backup-${stamp}.zip`),
    filters: [{ name: 'Zip archive', extensions: ['zip'] }],
  });
  if (canceled || !filePath) return;

  // ditto ships with macOS and preserves the folder structure faithfully.
  const result = spawnSync('/usr/bin/ditto', ['-c', '-k', '--sequesterRsrc', DATA_DIR, filePath]);
  await dialog.showMessageBox({
    type: result.status === 0 ? 'info' : 'error',
    message: result.status === 0 ? 'Backup saved' : 'Backup failed',
    detail:
      result.status === 0
        ? `Everything — database, attachments and logo — is in ${path.basename(filePath)}.`
        : String(result.stderr ?? 'Could not create the archive.'),
    buttons: ['OK'],
  });
  if (result.status === 0) shell.showItemInFolder(filePath);
}

function buildMenu() {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'ZenStudios',
      submenu: [
        { role: 'about', label: 'About ZenStudios' },
        { type: 'separator' },
        { label: 'Server…', click: () => void chooseServerMode() },
        { label: 'Back up data…', click: () => void backupData() },
        { label: 'Reveal data folder', click: () => shell.openPath(DATA_DIR) },
        { type: 'separator' },
        { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: 'Quit ZenStudios' },
      ],
    },
    {
      label: 'File',
      submenu: [
        { label: 'New Quotation', accelerator: 'CmdOrCtrl+N', click: () => go('/quotations/new') },
        { label: 'New Client', accelerator: 'CmdOrCtrl+Shift+N', click: () => go('/clients') },
        { type: 'separator' },
        { label: 'Print…', accelerator: 'CmdOrCtrl+P', click: () => mainWindow?.webContents.print() },
      ],
    },
    { label: 'Edit', submenu: [
      { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
      { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
    ] },
    {
      label: 'Go',
      submenu: [
        { label: 'Dashboard', accelerator: 'CmdOrCtrl+1', click: () => go('/') },
        { label: 'Quotations', accelerator: 'CmdOrCtrl+2', click: () => go('/quotations') },
        { label: 'Projects', accelerator: 'CmdOrCtrl+3', click: () => go('/projects') },
        { label: 'Invoices', accelerator: 'CmdOrCtrl+4', click: () => go('/invoices') },
        { label: 'Reports', accelerator: 'CmdOrCtrl+5', click: () => go('/reports') },
        { type: 'separator' },
        { label: 'Rate card & products', click: () => go('/catalog') },
        { label: 'Market benchmark', click: () => go('/benchmark') },
        { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: () => go('/settings') },
      ],
    },
    { label: 'View', submenu: [
      { role: 'reload' }, { role: 'forceReload' }, { type: 'separator' },
      { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' },
      { role: 'togglefullscreen' }, { role: 'toggleDevTools' },
    ] },
    { role: 'windowMenu' },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* ------------------------------ lifecycle ------------------------------- */

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    buildMenu();
    await createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) void createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', async () => {
    quitting = true;
    await server?.close().catch(() => {});
  });
}
