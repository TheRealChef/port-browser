import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ID } from '../types/models';
import { createId } from '../utils/misc';
import { hostnameOf, toSafeHttpUrl } from '../utils/url';
import { isRecord } from '../utils/validate';
import { createSafeStorage } from './persistence';

export const HISTORY_STORAGE_KEY = 'vela:history';
const HISTORY_SCHEMA_VERSION = 1;
export const HISTORY_LIMIT = 5000;
/** A revisit of the same page within this window updates the entry instead of adding one. */
const MERGE_WINDOW_MS = 30 * 60 * 1000;

export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  spaceId: ID;
  visitedAt: number;
}

interface HistoryData {
  /** Newest first. */
  entries: HistoryEntry[];
}

interface HistoryActions {
  recordVisit: (visit: { url: string; title: string; spaceId: ID }, now?: number) => void;
  /** Late title for the most recent visit of `url` (engines report titles after the URL). */
  updateTitle: (url: string, title: string) => void;
  remove: (ids: string[]) => void;
  removeSite: (hostname: string) => void;
  /** Deletes visits since `since` (ms timestamp); 0 clears everything. */
  clear: (since?: number) => void;
}

export type HistoryState = HistoryData & HistoryActions;

/**
 * Query parameters that commonly carry secrets (OAuth codes, tokens, signed
 * links). History never stores them; the rest of the address is kept.
 */
const SENSITIVE_PARAMS = new Set([
  'code',
  'token',
  'access_token',
  'id_token',
  'refresh_token',
  'auth',
  'password',
  'pwd',
  'secret',
  'client_secret',
  'session',
  'sessionid',
  'sid',
  'sig',
  'signature',
  'apikey',
  'api_key',
  'otp',
]);

export function redactUrl(url: string): string | null {
  const safe = toSafeHttpUrl(url);
  if (!safe) return null;
  try {
    const u = new URL(safe);
    u.username = '';
    u.password = '';
    for (const key of [...u.searchParams.keys()]) {
      if (SENSITIVE_PARAMS.has(key.toLowerCase())) u.searchParams.delete(key);
    }
    if (/(token|code|secret)=/i.test(u.hash)) u.hash = '';
    return u.toString();
  } catch {
    return null;
  }
}

function sanitizeHistory(raw: unknown): HistoryData {
  if (!isRecord(raw) || !Array.isArray(raw.entries)) return { entries: [] };
  const entries: HistoryEntry[] = [];
  for (const item of raw.entries) {
    if (!isRecord(item)) continue;
    const url = typeof item.url === 'string' ? toSafeHttpUrl(item.url) : null;
    if (!url || typeof item.visitedAt !== 'number' || !Number.isFinite(item.visitedAt)) continue;
    entries.push({
      id: typeof item.id === 'string' && item.id ? item.id.slice(0, 64) : createId(),
      url,
      title: typeof item.title === 'string' ? item.title.slice(0, 300) : '',
      spaceId: typeof item.spaceId === 'string' ? item.spaceId.slice(0, 64) : '',
      visitedAt: item.visitedAt,
    });
    if (entries.length >= HISTORY_LIMIT) break;
  }
  entries.sort((a, b) => b.visitedAt - a.visitedAt);
  return { entries };
}

export const useHistory = create<HistoryState>()(
  persist<HistoryState, [], [], HistoryData>(
    (set) => ({
      entries: [],

      recordVisit: ({ url, title, spaceId }, now = Date.now()) => {
        const clean = redactUrl(url);
        if (!clean) return;
        set((s) => {
          const index = s.entries.findIndex(
            (e) => e.url === clean && e.spaceId === spaceId && now - e.visitedAt < MERGE_WINDOW_MS,
          );
          const entries = [...s.entries];
          if (index >= 0) {
            const [existing] = entries.splice(index, 1);
            entries.unshift({ ...existing!, title: title || existing!.title, visitedAt: now });
          } else {
            entries.unshift({ id: createId(), url: clean, title, spaceId, visitedAt: now });
          }
          return { entries: entries.slice(0, HISTORY_LIMIT) };
        });
      },

      updateTitle: (url, title) => {
        const clean = redactUrl(url);
        const text = title.trim().slice(0, 300);
        if (!clean || !text) return;
        set((s) => {
          const index = s.entries.findIndex((e) => e.url === clean);
          if (index < 0 || s.entries[index]!.title === text) return s;
          const entries = [...s.entries];
          entries[index] = { ...entries[index]!, title: text };
          return { entries };
        });
      },

      remove: (ids) => {
        const drop = new Set(ids);
        set((s) => ({ entries: s.entries.filter((e) => !drop.has(e.id)) }));
      },

      removeSite: (hostname) =>
        set((s) => ({ entries: s.entries.filter((e) => hostnameOf(e.url) !== hostname) })),

      clear: (since = 0) =>
        set((s) => ({ entries: since > 0 ? s.entries.filter((e) => e.visitedAt < since) : [] })),
    }),
    {
      name: HISTORY_STORAGE_KEY,
      version: HISTORY_SCHEMA_VERSION,
      storage: createSafeStorage<HistoryData>(),
      partialize: (s) => ({ entries: s.entries }),
      merge: (persisted, current) => ({ ...current, ...sanitizeHistory(persisted) }),
    },
  ),
);
