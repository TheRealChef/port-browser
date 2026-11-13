import type { ID, SearchEngine, WorkspaceData } from '../../types/models';
import { matchScore } from '../../utils/misc';
import { displayUrl, normalizeInput, urlKey } from '../../utils/url';
import { tabDisplayTitle } from '../workspace/selectors';

export type Suggestion =
  | { kind: 'go'; id: string; title: string; url: string }
  | { kind: 'search'; id: string; title: string; url: string }
  | { kind: 'tab'; id: string; title: string; url: string; tabId: ID; spaceName: string }
  | { kind: 'bookmark'; id: string; title: string; url: string }
  | { kind: 'history'; id: string; title: string; url: string };

/** How many recent history entries are searched (newest first). */
const HISTORY_SCAN = 2000;
/** History counts a bit less than open tabs and bookmarks for the same match. */
const HISTORY_WEIGHT = 0.9;

const MAX_MATCHES = 6;
const OTHER_SPACE_PENALTY = 0.85;

/**
 * Address-bar suggestions: the literal destination first (so Enter keeps its
 * meaning), then matching open tabs and bookmarks, preferring the active space.
 */
export function buildSuggestions(
  query: string,
  state: WorkspaceData,
  engine: SearchEngine,
  excludeTabId: ID | null,
  history: ReadonlyArray<{ url: string; title: string; visitedAt: number }> = [],
): Suggestion[] {
  const q = query.trim();
  const target = normalizeInput(q, engine);
  if (!target) return [];

  const first: Suggestion =
    target.kind === 'url'
      ? { kind: 'go', id: 'go', title: displayUrl(target.url), url: target.url }
      : { kind: 'search', id: 'search', title: q, url: target.url };

  const score = (title: string, url: string) =>
    Math.max(matchScore(q, title), matchScore(q, displayUrl(url)) * 0.8);

  const seen = new Set<string>([urlKey(target.url)]);
  const ranked: Array<{ s: Suggestion; score: number }> = [];

  for (const tab of Object.values(state.tabs)) {
    if (!tab.url || tab.id === excludeTabId) continue;
    const title = tabDisplayTitle(tab);
    let value = score(title, tab.url);
    if (value <= 10) continue;
    if (tab.spaceId !== state.activeSpaceId) value *= OTHER_SPACE_PENALTY;
    ranked.push({
      score: value + 1,
      s: {
        kind: 'tab',
        id: `tab:${tab.id}`,
        title,
        url: tab.url,
        tabId: tab.id,
        spaceName: state.spaces[tab.spaceId]?.name ?? '',
      },
    });
  }

  for (const bookmark of Object.values(state.bookmarks)) {
    let value = score(bookmark.title, bookmark.url);
    if (value <= 10) continue;
    if (bookmark.spaceId !== state.activeSpaceId) value *= OTHER_SPACE_PENALTY;
    ranked.push({
      score: value,
      s: {
        kind: 'bookmark',
        id: `bookmark:${bookmark.id}`,
        title: bookmark.title,
        url: bookmark.url,
      },
    });
  }

  // Several visits of one page count once, with a small boost for recency and repeats.
  const visits = new Map<string, { url: string; title: string; count: number; last: number }>();
  for (const entry of history.slice(0, HISTORY_SCAN)) {
    const key = urlKey(entry.url);
    const seenVisit = visits.get(key);
    if (seenVisit) seenVisit.count += 1;
    else visits.set(key, { url: entry.url, title: entry.title, count: 1, last: entry.visitedAt });
  }
  const now = Date.now();
  for (const [key, v] of visits) {
    let value = score(v.title || displayUrl(v.url), v.url);
    if (value <= 10) continue;
    const recent = now - v.last < 7 * 24 * 60 * 60 * 1000 ? 1.05 : 1;
    value *= HISTORY_WEIGHT * recent * Math.min(1.15, 1 + v.count * 0.02);
    ranked.push({
      score: value,
      s: { kind: 'history', id: `history:${key}`, title: v.title || displayUrl(v.url), url: v.url },
    });
  }

  const matches: Suggestion[] = [];
  for (const { s } of ranked.sort((a, b) => b.score - a.score)) {
    // An open tab and a bookmark for the same page collapse into the tab.
    const key = s.kind === 'tab' ? `tab:${urlKey(s.url)}` : urlKey(s.url);
    const page = urlKey(s.url);
    if (
      seen.has(key) ||
      (s.kind !== 'tab' && seen.has(`tab:${page}`)) ||
      (s.kind === 'history' && seen.has(page))
    ) {
      continue;
    }
    seen.add(key);
    matches.push(s);
    if (matches.length >= MAX_MATCHES) break;
  }
  return [first, ...matches];
}
