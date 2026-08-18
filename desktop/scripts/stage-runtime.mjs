/**
 * Stage the server's runtime dependencies for packaging.
 *
 * The server is bundled with esbuild using --packages=external, so at runtime it
 * still does `import "express"`. Those packages must therefore exist inside the
 * app. They are installed into a clean, production-only tree here and shipped as
 * extraResources at Resources/app/node_modules — Node resolves them by walking
 * up from Resources/app/server/dist/server.mjs.
 *
 * Shipping them as extraResources (rather than inside app.asar) also means
 * Prisma's native query engine is a normal file on disk, which is exactly what
 * it needs in order to load.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(here, '..');
const repoRoot = path.resolve(desktopDir, '..');

const serverPkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'server', 'package.json'), 'utf8'));

// Puppeteer is deliberately excluded: the desktop app renders PDFs with
// Electron's own Chromium, which saves ~180 MB and a moving part.
const EXCLUDE = new Set(['puppeteer', 'cross-env']);
const dependencies = Object.fromEntries(
  Object.entries(serverPkg.dependencies).filter(([name]) => !EXCLUDE.has(name)),
);

const stageDir = path.join(desktopDir, 'build', 'runtime');
fs.rmSync(stageDir, { recursive: true, force: true });
fs.mkdirSync(stageDir, { recursive: true });

fs.writeFileSync(
  path.join(stageDir, 'package.json'),
  JSON.stringify({ name: 'zen-runtime', version: '1.0.0', private: true, dependencies }, null, 2),
);

console.log('› installing runtime dependencies');
console.log('  ' + Object.keys(dependencies).join(', '));
execFileSync(
  'npm',
  ['install', '--omit=dev', '--no-audit', '--no-fund', '--ignore-scripts', '--silent'],
  { cwd: stageDir, stdio: 'inherit' },
);

// The Prisma client generated against our schema lives in the workspace root as
// a dotfolder; a plain `npm install @prisma/client` produces only a stub.
const generated = path.join(repoRoot, 'node_modules', '.prisma');
if (!fs.existsSync(generated)) {
  throw new Error('node_modules/.prisma is missing — run `npm run db:push` first so Prisma generates its client.');
}
console.log('› copying the generated Prisma client and query engine');
fs.cpSync(generated, path.join(stageDir, 'node_modules', '.prisma'), { recursive: true, dereference: true });

const engineDir = path.join(stageDir, 'node_modules', '.prisma', 'client');
const engines = fs.existsSync(engineDir)
  ? fs.readdirSync(engineDir).filter((f) => f.startsWith('libquery_engine'))
  : [];
if (!engines.length) throw new Error('No Prisma query engine found in the staged client.');

/*
 * Trim what a packaged desktop build provably cannot use. Every entry below is
 * either a build-time artefact or a platform we do not ship.
 */
const modules = path.join(stageDir, 'node_modules');
const before = dirSize(modules);

const prune = [
  // Canvas rendering for pdfjs. We only call getTextContent(), never render.
  '@napi-rs',
  // pdfjs builds we do not import — the code uses legacy/build/pdf.mjs.
  'pdfjs-dist/build',
  'pdfjs-dist/web',
  'pdfjs-dist/types',
  'pdfjs-dist/image_decoders',
  // TypeScript declarations are dead weight at runtime.
  '@prisma/client/scripts',
];

for (const rel of prune) {
  const target = path.join(modules, rel);
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
}

// Prisma keeps engines for every platform; we ship one Mac build.
for (const dir of [path.join(modules, '.prisma', 'client'), path.join(modules, '@prisma', 'client')]) {
  if (!fs.existsSync(dir)) continue;
  for (const entry of fs.readdirSync(dir)) {
    const isForeignEngine =
      entry.startsWith('libquery_engine') && !entry.includes('darwin-arm64');
    const isWindowsEngine = entry.startsWith('query_engine') && entry.endsWith('.dll.node');
    if (isForeignEngine || isWindowsEngine) fs.rmSync(path.join(dir, entry), { force: true });
  }
}

// .d.ts files across the tree: large for Prisma, useless once packaged.
let removedTypes = 0;
(function stripDts(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) stripDts(full);
    else if (entry.name.endsWith('.d.ts')) {
      fs.rmSync(full, { force: true });
      removedTypes++;
    }
  }
})(modules);

const after = dirSize(modules);
console.log(`› pruned ${removedTypes} type declaration files and unused platform binaries`);
console.log(
  `\n✓ runtime staged → desktop/build/runtime/node_modules ` +
    `(${mb(before)} → ${mb(after)}, engine: ${engines[0]})\n`,
);

function dirSize(dir) {
  return Number(execFileSync('du', ['-sk', dir]).toString().split('\t')[0]) * 1024;
}
function mb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
}
