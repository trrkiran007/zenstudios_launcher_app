/**
 * Local autosave for the quotation editor.
 *
 * The editor holds a whole quotation in React state, and until it is saved that
 * state is the only copy. A reload, a crash or a mis-click used to lose it, so
 * every keystroke is mirrored into localStorage and offered back on return.
 *
 * This is a safety net, not storage: the moment a quotation is saved to the
 * server its entry is cleared.
 */

const PREFIX = 'zenstudios.draft.';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const draftKey = (id?: string) => `${PREFIX}${id ?? 'new'}`;

export type StoredDraft<D, C> = { savedAt: number; draft: D; client: C | null };

export function saveDraft<D, C>(key: string, draft: D, client: C | null) {
  try {
    const payload: StoredDraft<D, C> = { savedAt: Date.now(), draft, client };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Quota or private mode — autosave is best-effort and must never break editing.
  }
}

export function readDraft<D, C>(key: string): StoredDraft<D, C> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft<D, C>;
    if (!parsed?.draft || typeof parsed.savedAt !== 'number') return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** "2 minutes ago" — for telling someone how old the recovered work is. */
export function agoLabel(ts: number) {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return 'moments ago';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
