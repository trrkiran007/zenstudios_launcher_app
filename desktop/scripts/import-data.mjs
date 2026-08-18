/**
 * Copy the terminal version's data into the desktop app.
 *
 * The two keep separate databases on purpose: <repo>/data for `npm run dev`,
 * and ~/Library/Application Support/ZenStudios/data for the .app. This moves
 * everything — quotations, projects, clients, attachments and the logo — from
 * the first into the second, so switching to the desktop app is not a fresh start.
 *
 * Any existing app data is set aside first, never overwritten in place.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

const source = path.join(repoRoot, 'data');
const target = path.join(os.homedir(), 'Library', 'Application Support', 'ZenStudios', 'data');

if (!fs.existsSync(path.join(source, 'app.db'))) {
  console.error(`✗ No database found at ${source}/app.db — nothing to import.`);
  process.exit(1);
}

if (fs.existsSync(path.join(target, 'app.db'))) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backup = `${target}-replaced-${stamp}`;
  fs.renameSync(target, backup);
  console.log(`› existing app data moved aside → ${backup}`);
}

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.cpSync(source, target, { recursive: true });

// The desktop shell's own settings do not belong to the terminal data set.
fs.rmSync(path.join(target, 'desktop-settings.json'), { force: true });

const count = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).length : 0);
console.log(`\n✓ imported into ${target}`);
console.log(`  database   : ${(fs.statSync(path.join(target, 'app.db')).size / 1024).toFixed(0)} KB`);
console.log(`  attachments: ${count(path.join(target, 'uploads'))} file(s)`);
console.log(`  branding   : ${count(path.join(target, 'branding'))} file(s)`);
console.log('\nOpen ZenStudios — your company details, clients and documents will be there.\n');
