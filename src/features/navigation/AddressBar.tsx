import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppWindow,
  ArrowRight,
  ExternalLink,
  Globe,
  Lock,
  Search,
  Server,
  Star,
} from 'lucide-react';
import { useNavigation } from '../../app/providers/hostContext';
import { Favicon } from '../../components/common/Favicon';
import { IconButton } from '../../components/common/IconButton';
import { useSettings } from '../../stores/settingsStore';
import { useUI } from '../../stores/uiStore';
import { useWorkspace } from '../../stores/workspaceStore';
import { useHistory } from '../../stores/historyStore';
import { activeTab, bookmarksOfSpace } from '../workspace/selectors';
import { editBookmarkFlow, removeBookmarkWithUndo } from '../bookmarks/bookmarkActions';
import { cn, MOD_LABEL } from '../../utils/misc';
import { displayUrl, isLocalUrl, urlKey } from '../../utils/url';
import { buildSuggestions, type Suggestion } from './suggestions';

export function AddressBar() {
  const nav = useNavigation();
  const tab = useWorkspace(activeTab);
  const bookmarks = useWorkspace((s) => s.bookmarks);
  const addBookmark = useWorkspace((s) => s.addBookmark);
  const focusToken = useUI((s) => s.addressFocusToken);
  const setSuggestionsOpen = useUI((s) => s.setSuggestionsOpen);
  const engine = useSettings((s) => s.searchEngine);
  const input = useRef<HTMLInputElement>(null);
  const keepSelectionOnMouseUp = useRef(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);

  const url = tab?.url ?? '';
  const editing = draft !== null && draft.trim() !== '' && draft !== url;

  const suggestions = useMemo<Suggestion[]>(() => {
    if (!editing || draft === null) return [];
    return buildSuggestions(
      draft,
      useWorkspace.getState(),
      engine,
      tab?.id ?? null,
      useHistory.getState().entries,
    );
  }, [editing, draft, engine, tab?.id]);
  const open = suggestions.length > 0;
  const active = Math.min(highlight, Math.max(suggestions.length - 1, 0));

  useEffect(() => {
    setSuggestionsOpen(open);
  }, [open, setSuggestionsOpen]);
  useEffect(() => () => setSuggestionsOpen(false), [setSuggestionsOpen]);

  useEffect(() => {
    if (focusToken === 0) return;
    input.current?.focus();
    input.current?.select();
  }, [focusToken]);

  const bookmark = url
    ? bookmarksOfSpace(bookmarks, tab?.spaceId ?? '').find((b) => urlKey(b.url) === urlKey(url))
    : undefined;

  const LeadIcon = !url
    ? Search
    : isLocalUrl(url)
      ? Server
      : url.startsWith('https:')
        ? Lock
        : Globe;

  const finish = () => {
    setDraft(null);
    setHighlight(0);
    input.current?.blur();
  };

  const run = (suggestion: Suggestion | undefined, newTab: boolean) => {
    if (draft === null) return;
    if (!suggestion || suggestion.kind === 'go' || suggestion.kind === 'search') {
      if (nav.submit(draft, { newTab })) finish();
      return;
    }
    if (suggestion.kind === 'tab') {
      useUI.getState().setSettingsOpen(false);
      useWorkspace.getState().selectTab(suggestion.tabId);
    } else {
      nav.submit(suggestion.url, { newTab });
    }
    finish();
  };

  return (
    <div className="relative flex min-w-0 flex-1">
      <div
        className={cn(
          'group flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-lg border pl-2.5 pr-1 transition-ui',
          draft !== null
            ? 'border-focus/80 bg-surface shadow-[0_0_0_3px_var(--focus-soft)]'
            : 'border-transparent bg-canvas/70 hover:border-line hover:bg-canvas',
        )}
      >
        <LeadIcon size={14} className="shrink-0 text-fg-3" strokeWidth={2} />
        <input
          ref={input}
          role="combobox"
          aria-label="Address and search bar"
          aria-expanded={open}
          aria-controls="address-suggestions"
          aria-activedescendant={open ? `suggestion-${suggestions[active]?.id}` : undefined}
          spellCheck={false}
          autoComplete="off"
          placeholder={`Search or enter address  ·  ${MOD_LABEL}+L`}
          className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-fg outline-none placeholder:text-fg-3"
          value={draft ?? url}
          onMouseDown={(e) => {
            // A click that focuses the field should keep the select-all from onFocus.
            keepSelectionOnMouseUp.current = document.activeElement !== e.currentTarget;
          }}
          onMouseUp={(e) => {
            if (keepSelectionOnMouseUp.current) e.preventDefault();
            keepSelectionOnMouseUp.current = false;
          }}
          onFocus={(e) => {
            setDraft(url);
            // Select synchronously: deferring it lets fast typing after Ctrl+L be overwritten.
            e.target.select();
          }}
          onBlur={() => {
            setDraft(null);
            setHighlight(0);
          }}
          onChange={(e) => {
            setDraft(e.target.value);
            setHighlight(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' && open) {
              e.preventDefault();
              setHighlight((active + 1) % suggestions.length);
            } else if (e.key === 'ArrowUp' && open) {
              e.preventDefault();
              setHighlight((active - 1 + suggestions.length) % suggestions.length);
            } else if (e.key === 'Enter') {
              e.preventDefault();
              run(suggestions[active], e.altKey || e.metaKey);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              if (open && draft !== url) {
                setDraft(url);
                requestAnimationFrame(() => input.current?.select());
              } else {
                finish();
              }
            }
          }}
        />
        {tab && url && draft === null && (
          <div className="flex items-center opacity-70 transition-ui group-hover:opacity-100">
            <IconButton
              size="sm"
              icon={Star}
              label={bookmark ? 'Remove bookmark' : 'Bookmark this page'}
              className={bookmark ? 'text-hint [&_svg]:fill-current' : undefined}
              onClick={() => {
                if (bookmark) {
                  removeBookmarkWithUndo(bookmark.id);
                  return;
                }
                const id = addBookmark({
                  url,
                  title: tab.customTitle ?? tab.title,
                  spaceId: tab.spaceId,
                });
                useUI.getState().showToast('Bookmarked', 'success', {
                  label: 'Choose folder…',
                  run: () => void editBookmarkFlow(id),
                });
              }}
            />
            <IconButton
              size="sm"
              icon={ExternalLink}
              label="Open in browser"
              onClick={() => nav.openExternal(url)}
            />
          </div>
        )}
      </div>

      {open && (
        <ul
          id="address-suggestions"
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+4px)] z-[80] animate-pop rounded-xl bg-elevated p-1 shadow-pop"
          onMouseDown={(e) => e.preventDefault()}
        >
          {suggestions.map((s, i) => (
            <li
              key={s.id}
              id={`suggestion-${s.id}`}
              role="option"
              aria-selected={i === active}
              onMouseMove={() => i !== active && setHighlight(i)}
              onClick={(e) => run(s, e.altKey || e.metaKey)}
              className={cn(
                'flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px]',
                i === active ? 'bg-hover text-fg' : 'text-fg-2',
              )}
            >
              <SuggestionIcon suggestion={s} />
              <span className="min-w-0 flex-1 truncate">
                <span className="text-fg">{s.title}</span>
                {(s.kind === 'tab' || s.kind === 'bookmark' || s.kind === 'history') && (
                  <span className="ml-2 text-[12px] text-fg-3">{displayUrl(s.url)}</span>
                )}
              </span>
              <span className="shrink-0 text-[11.5px] text-fg-3">
                {s.kind === 'go' && 'Open'}
                {s.kind === 'search' && 'Search'}
                {s.kind === 'tab' && `Switch to tab · ${s.spaceName}`}
                {s.kind === 'bookmark' && 'Bookmark'}
                {s.kind === 'history' && 'History'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SuggestionIcon({ suggestion }: { suggestion: Suggestion }) {
  switch (suggestion.kind) {
    case 'go':
      return <ArrowRight size={15} className="shrink-0 text-focus" />;
    case 'search':
      return <Search size={15} className="shrink-0 text-focus" />;
    case 'tab':
      return (
        <span className="relative shrink-0">
          <Favicon url={suggestion.url} />
          <AppWindow
            size={9}
            className="absolute -bottom-1 -right-1 rounded-sm bg-elevated text-fg-2"
          />
        </span>
      );
    case 'bookmark':
    case 'history':
      return <Favicon url={suggestion.url} />;
  }
}
