export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

export function relativeTime(timestamp: number, now = Date.now()): string {
  const diff = (timestamp - now) / 1000;
  const abs = Math.abs(diff);
  if (abs < 45) return 'just now';
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  return rtf.format(Math.round(diff / 86400), 'day');
}

/** Small ranking function for command-palette style matching. 0 means no match. */
export function matchScore(query: string, text: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  const t = text.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  const idx = t.indexOf(q);
  if (idx > 0 && /[\s\-_/.:]/.test(t[idx - 1] ?? '')) return 60;
  if (idx >= 0) return 40;

  let ti = 0;
  for (const ch of q) {
    ti = t.indexOf(ch, ti);
    if (ti === -1) return 0;
    ti += 1;
  }
  return 10;
}

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
export const MOD_LABEL = isMac ? '⌘' : 'Ctrl';
