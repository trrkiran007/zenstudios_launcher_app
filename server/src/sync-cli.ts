/**
 * Run the starter-data sync from the terminal.
 *
 * It lives in its own file because the sync itself is imported by the server,
 * and a module cannot reliably tell whether it is the entry point once esbuild
 * has bundled everything into one file.
 *
 * Pass --app to work on the desktop app's database rather than the repository's.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

if (process.argv.includes('--app') && !process.env.DATABASE_URL) {
  // The app keeps its data in the folder it has always used, so look for the
  // original before falling back to the current name.
  const support = path.join(os.homedir(), 'Library', 'Application Support');
  const legacy = path.join(support, 'ZenStudios');
  const dir = fs.existsSync(legacy) ? legacy : path.join(support, 'BlueMount BOS');
  process.env.DATABASE_URL = `file:${path.join(dir, 'data', 'app.db')}`;
  console.log(`Using ${path.join(dir, 'data', 'app.db')}`);
}

const { prisma } = await import('./db.js');
const { syncStarterData } = await import('./sync.js');

await syncStarterData()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
