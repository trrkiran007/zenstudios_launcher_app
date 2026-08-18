/** Print where the installer landed — the question everyone asks after a build. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const releaseDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'release');
const dmgs = fs.existsSync(releaseDir)
  ? fs.readdirSync(releaseDir).filter((f) => f.endsWith('.dmg'))
  : [];

if (!dmgs.length) {
  console.log('\nNo .dmg found in desktop/release — did the build finish?\n');
} else {
  console.log('\n  Installer ready:\n');
  for (const name of dmgs) {
    const full = path.join(releaseDir, name);
    const mb = (fs.statSync(full).size / 1024 / 1024).toFixed(0);
    console.log(`    ${full}   (${mb} MB)`);
  }
  console.log('\n  Open the folder:  open "' + releaseDir + '"');
  console.log('  Install:          double-click the .dmg, drag ZenStudios to Applications,');
  console.log('                    then right-click the app > Open the first time.\n');
}
