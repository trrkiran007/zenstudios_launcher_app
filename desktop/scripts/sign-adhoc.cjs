/**
 * Ad-hoc sign the packaged app, innermost binaries first.
 *
 * Without this the bundle ships with only the signature the linker leaves on
 * the main executable: no sealed resources, Info.plist unbound. That is
 * invisible on the machine that built it, because a locally produced app is
 * never quarantined. Copy it to another Mac and Gatekeeper validates the
 * signature, finds it inconsistent with the bundle, and reports the app as
 * "damaged" — which reads as corrupt and offers no way past it.
 *
 * A consistent ad-hoc signature is still not notarised, so macOS will warn
 * about an unidentified developer. But that warning has a documented bypass —
 * right-click, Open — and "damaged" does not.
 *
 * Signing order matters: codesign seals a bundle's contents, so anything nested
 * has to be signed before the thing containing it. Apple deprecates --deep for
 * exactly this reason, so the nesting is walked explicitly.
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const sign = (target) =>
  execFileSync('codesign', ['--force', '--sign', '-', '--timestamp=none', target], {
    stdio: ['ignore', 'ignore', 'pipe'],
  });

/** Every nested bundle and loadable binary, deepest first. */
function nested(appPath) {
  const out = [];
  const walk = (dir, depth = 0) => {
    if (depth > 8) return;
    let items;
    try {
      items = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const item of items) {
      const full = path.join(dir, item.name);
      if (item.isSymbolicLink()) continue;
      if (item.isDirectory()) {
        walk(full, depth + 1);
        if (/\.(app|framework)$/.test(item.name)) out.push(full);
      } else if (/\.(dylib|so|node)$/.test(item.name)) {
        out.push(full);
      }
    }
  };
  walk(appPath);
  return out;
}

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`,
  );

  const targets = nested(appPath);
  let signed = 0;
  for (const target of targets) {
    try {
      sign(target);
      signed++;
    } catch (err) {
      // A binary that refuses to sign would fail the outer seal, so say which.
      console.warn(`  [sign] skipped ${path.relative(appPath, target)}: ${err.message.split('\n')[0]}`);
    }
  }

  sign(appPath); // the bundle last, once everything inside it is sealed
  console.log(`  [sign] ad-hoc signed ${signed} nested item(s) and the app bundle`);

  // Fail the build rather than ship a bundle that will read as "damaged".
  execFileSync('codesign', ['--verify', '--strict', appPath], { stdio: 'pipe' });
  console.log('  [sign] signature verifies');
};
