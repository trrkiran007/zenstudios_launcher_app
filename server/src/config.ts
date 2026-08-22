import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));

export const SERVER_ROOT = path.resolve(here, '..');
export const REPO_ROOT = path.resolve(SERVER_ROOT, '..');

dotenv.config({ path: path.join(SERVER_ROOT, '.env'), quiet: true });

/**
 * Where the database, uploads and logo live.
 *
 * Defaults to <repo>/data for terminal use. The desktop app overrides it with
 * ZEN_DATA_DIR so data sits in ~/Library/Application Support and survives an
 * app update, rather than inside the application bundle.
 */
export const DATA_DIR = process.env.ZEN_DATA_DIR
  ? path.resolve(process.env.ZEN_DATA_DIR)
  : path.join(REPO_ROOT, 'data');

export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
export const BRANDING_DIR = path.join(DATA_DIR, 'branding');
export const WEB_DIST = process.env.ZEN_WEB_DIST
  ? path.resolve(process.env.ZEN_WEB_DIST)
  : path.join(REPO_ROOT, 'web', 'dist');
const SECRETS_FILE = path.join(DATA_DIR, 'secrets.json');

for (const dir of [DATA_DIR, UPLOAD_DIR, BRANDING_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

// API_PORT, not PORT — some dev launchers inject PORT for the web server, and
// the API must not fight the Vite dev server for it.
/**
 * Shown in the UI so a support conversation can start from a known build.
 *
 * The desktop shell passes its own version through ZEN_APP_VERSION, because
 * that is the number on the .dmg the user actually installed. Terminal use
 * falls back to the server package version.
 */
export const APP_VERSION = (() => {
  if (process.env.ZEN_APP_VERSION?.trim()) return process.env.ZEN_APP_VERSION.trim();
  try {
    return JSON.parse(fs.readFileSync(path.join(SERVER_ROOT, 'package.json'), 'utf8')).version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
})();

/** True when running inside the Electron shell rather than a browser tab. */
export const IS_DESKTOP = process.env.ZEN_DESKTOP === '1';

export const PORT = Number(process.env.API_PORT || 4321);
export const IS_PROD = process.env.NODE_ENV === 'production';

type Secrets = { anthropicApiKey?: string };

function readSecrets(): Secrets {
  try {
    return JSON.parse(fs.readFileSync(SECRETS_FILE, 'utf8')) as Secrets;
  } catch {
    return {};
  }
}

/** Env wins so a machine-level key can override whatever is stored locally. */
export function getAnthropicKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY?.trim() || readSecrets().anthropicApiKey?.trim() || undefined;
}

export function setAnthropicKey(key: string | null) {
  const secrets = readSecrets();
  if (key && key.trim()) secrets.anthropicApiKey = key.trim();
  else delete secrets.anthropicApiKey;
  fs.writeFileSync(SECRETS_FILE, JSON.stringify(secrets, null, 2), { mode: 0o600 });
}

export function anthropicKeySource(): 'env' | 'stored' | 'none' {
  if (process.env.ANTHROPIC_API_KEY?.trim()) return 'env';
  if (readSecrets().anthropicApiKey?.trim()) return 'stored';
  return 'none';
}
