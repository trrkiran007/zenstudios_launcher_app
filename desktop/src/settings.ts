import fs from 'node:fs';
import path from 'node:path';

/**
 * Desktop-shell settings, kept next to the data rather than inside the app
 * bundle so they survive an app update.
 *
 * `mode` is the forward path to a shared company install: today it is "local"
 * and the app runs its own API against a database on this Mac. Point it at a
 * hosted deployment and the same app becomes a client of that server, with no
 * change to the interface or the data model.
 */
export type ShellSettings = {
  mode: 'local' | 'remote';
  remoteUrl: string;
  windowBounds?: { width: number; height: number; x?: number; y?: number };
};

const DEFAULTS: ShellSettings = { mode: 'local', remoteUrl: '' };

export function settingsFile(dataDir: string) {
  return path.join(dataDir, 'desktop-settings.json');
}

export function readSettings(dataDir: string): ShellSettings {
  try {
    const raw = JSON.parse(fs.readFileSync(settingsFile(dataDir), 'utf8'));
    return { ...DEFAULTS, ...raw };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeSettings(dataDir: string, patch: Partial<ShellSettings>) {
  const next = { ...readSettings(dataDir), ...patch };
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(settingsFile(dataDir), JSON.stringify(next, null, 2));
  return next;
}
