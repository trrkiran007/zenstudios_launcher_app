/**
 * Export / import helpers for moving setup and quotations between installs.
 *
 * Everything travels as a plain .json file the user hands over however they
 * like — email, shared drive, USB stick. Nothing here talks to the network
 * beyond the app's own API, so it works fully offline.
 */

/**
 * ZenStudios transfer file extension. The contents are ordinary JSON — the
 * extension exists so these files are recognisable at a glance, and so the
 * desktop app can register itself as their handler.
 */
export const ZNS = '.zns';

/** Trigger a browser download of `data` as a pretty-printed .zns file. */
export function downloadFile(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith(ZNS) ? filename : `${filename}${ZNS}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the download has certainly started.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Open the OS file picker and parse the chosen file.
 *
 * `.json` is still accepted so files exported before the `.zns` extension
 * existed keep working.
 */
export function pickTransferFile(): Promise<unknown | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = `${ZNS},.json,application/json`;

    input.onchange = async () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) return resolve(null);
      try {
        resolve(JSON.parse(await file.text()));
      } catch {
        reject(new Error(`"${file.name}" could not be read as a ZenStudios file.`));
      }
    };

    // Fires when the picker is dismissed without choosing anything.
    input.oncancel = () => {
      input.remove();
      resolve(null);
    };

    document.body.appendChild(input);
    input.click();
  });
}

/** Reject a file that is the wrong kind before it reaches the server. */
export function expectKind(file: unknown, kind: string, label: string): Record<string, unknown> {
  const obj = file as Record<string, unknown> | null;
  if (!obj || typeof obj !== 'object' || obj.kind !== kind) {
    throw new Error(`That file is not a ZenStudios ${label}. Check you picked the right one.`);
  }
  return obj;
}

/** Filename-safe slug, e.g. "ZS/INT/26-27/001" → "ZS-INT-26-27-001". */
export function slug(value: string) {
  return value.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'export';
}

/** Today as YYYY-MM-DD, for stamping export filenames. */
export function stamp() {
  return new Date().toISOString().slice(0, 10);
}
