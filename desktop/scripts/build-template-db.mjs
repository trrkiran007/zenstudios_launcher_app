/**
 * Build the seed database shipped inside the app bundle.
 *
 * On first launch the desktop app copies this file into its data directory.
 * Preparing it at build time means the packaged app never has to run Prisma's
 * migration engine, which is the usual cause of "works in dev, fails in the
 * .app" problems.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(here, '..');
const repoRoot = path.resolve(desktopDir, '..');
const serverDir = path.join(repoRoot, 'server');

const outFile = path.join(desktopDir, 'resources', 'app-template.db');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'zen-template-'));

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.rmSync(outFile, { force: true });

const env = {
  ...process.env,
  DATABASE_URL: `file:${outFile}`,
  // Keep the seed's directory creation inside a throwaway folder.
  ZEN_DATA_DIR: scratch,
};

const run = (cmd, args) =>
  execFileSync(cmd, args, { cwd: serverDir, env, stdio: 'inherit', shell: false });

console.log('› creating schema');
run('npx', ['prisma', 'db', 'push', '--skip-generate', '--accept-data-loss']);

console.log('› seeding company details, business types and starter catalog');
run('npx', ['tsx', 'src/seed.ts']);

fs.rmSync(scratch, { recursive: true, force: true });

const size = (fs.statSync(outFile).size / 1024).toFixed(0);
console.log(`\n✓ template database ready → desktop/resources/app-template.db (${size} KB)\n`);
