import { useMemo, useState } from 'react';
import { CornerDownLeft, Search } from '../icons';
import { useNavigation } from '../../app/providers/hostContext';
import { useWorkspace } from '../../stores/workspaceStore';
import { bookmarksOfSpace, tabDisplayTitle, tabsOfSpace } from '../../features/workspace/selectors';
import type { ID } from '../../types/models';
import { cn, matchScore } from '../../utils/misc';
import { displayUrl } from '../../utils/url';
import { Favicon } from '../common/Favicon';

interface Match {
  id: string;
  title: string;
  url: string;
  kind: 'Tab' | 'Bookmark';
  open: () => void;
}

/** Omnibox-style search for the start page: matches open tabs and bookmarks, else navigates. */
export function QuickSearch({ spaceId, autoFocus }: { spaceId: ID; autoFocus?: boolean }) {
  const nav = useNavigation();
  const tabs = useWorkspace((s) => s.tabs);
  const bookmarks = useWorkspace((s) => s.bookmarks);
  const selectTab = useWorkspace((s) => s.selectTab);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(-1);

  const matches = useMemo<Match[]>(() => {
    if (!query.trim()) return [];
    const tabMatches = tabsOfSpace(tabs, spaceId)
      .filter((t) => t.url)
      .map((t) => ({
        id: `tab:${t.id}`,
        title: tabDisplayTitle(t),
        url: t.url,
        kind: 'Tab' as const,
        open: () => selectTab(t.id),
        score: Math.max(
          matchScore(query, tabDisplayTitle(t)),
          matchScore(query, displayUrl(t.url)) * 0.8,
        ),
      }));
    const bookmarkMatches = bookmarksOfSpace(bookmarks, spaceId).map((b) => ({
      id: `bookmark:${b.id}`,
      title: b.title,
      url: b.url,
      kind: 'Bookmark' as const,
      open: () => nav.openUrl(b.url, { title: b.title }),
      score: Math.max(matchScore(query, b.title), matchScore(query, displayUrl(b.url)) * 0.8),
    }));
    return [...tabMatches, ...bookmarkMatches]
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [query, tabs, bookmarks, spaceId, nav, selectTab]);

  const submit = () => {
    const match = matches[highlight];
    if (match) match.open();
    else if (nav.submit(query)) setQuery('');
  };

  return (
    <div className="relative">
      <div className="field flex h-11 items-center gap-2.5 rounded-xl px-3.5">
        <Search size={16} className="shrink-0 text-fg-3" />
        <input
          autoFocus={autoFocus}
          aria-label="Search tabs and bookmarks, or enter an address"
          placeholder="Search tabs and bookmarks, or enter an address"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlight(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, matches.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, -1));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            } else if (e.key === 'Escape' && query) {
              e.stopPropagation();
              setQuery('');
            }
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-fg-3"
        />
        {query && <CornerDownLeft size={14} className="shrink-0 text-fg-3" />}
      </div>
      {matches.length > 0 && (
        <ul className="absolute inset-x-0 top-[calc(100%+6px)] z-20 animate-pop rounded-xl bg-raised p-1 shadow-pop">
          {matches.map((m, i) => (
            <li key={m.id}>
              <button
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={m.open}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left',
                  i === highlight && 'bg-hover',
                )}
              >
                <Favicon url={m.url} />
                <span className="min-w-0 flex-1 truncate text-[13px]">{m.title}</span>
                <span className="text-[11px] text-fg-3">{m.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
