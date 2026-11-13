import { History } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { EntityIcon } from '../../components/common/EntityIcon';
import { createPortal } from 'react-dom';
import {
  Compass,
  CornerDownLeft,
  FolderPlus,
  Globe,
  LayoutDashboard,
  Library,
  PanelLeft,
  Upload,
  RotateCcw,
  Plus,
  Search,
  Settings,
  SquarePlus,
} from 'lucide-react';
import { useNavigation } from '../../app/providers/hostContext';
import { Favicon } from '../../components/common/Favicon';
import { Kbd } from '../../components/common/Kbd';
import { useSettings } from '../../stores/settingsStore';
import { useUI } from '../../stores/uiStore';
import { useWorkspace } from '../../stores/workspaceStore';
import { cn, matchScore, MOD_LABEL } from '../../utils/misc';
import { displayUrl, normalizeInput } from '../../utils/url';
import { createDashboardFlow, createGroupFlow, createSpaceFlow } from '../workspace/actions';
import { ACCENTS } from '../workspace/appearance';
import { folderLabel, pickBookmarksFile } from '../bookmarks/bookmarkActions';
import { sortedSpaces, tabDisplayTitle } from '../workspace/selectors';

type Section =
  'Go to' | 'Actions' | 'Spaces' | 'Tabs' | 'Groups' | 'Dashboards' | 'Folders' | 'Bookmarks';

interface PaletteItem {
  id: string;
  section: Section;
  title: string;
  subtitle?: string;
  icon: ReactNode;
  hint?: string;
  keywords?: string;
  run: () => void;
}

const SECTION_ORDER: Section[] = [
  'Go to',
  'Actions',
  'Spaces',
  'Tabs',
  'Groups',
  'Dashboards',
  'Folders',
  'Bookmarks',
];
const PER_SECTION = 7;

export function CommandPalette() {
  const open = useUI((s) => s.paletteOpen);
  if (!open) return null;
  return <Palette />;
}

function useItems(query: string): PaletteItem[] {
  const nav = useNavigation();
  const ws = useWorkspace();
  const engine = useSettings((s) => s.searchEngine);
  const ui = useUI.getState;

  return useMemo(() => {
    const spaces = sortedSpaces(ws.spaces);
    const spaceName = (id: string) => ws.spaces[id]?.name ?? '';
    const leaveSettings = () => ui().setSettingsOpen(false);
    const items: PaletteItem[] = [];

    const actions: Array<Omit<PaletteItem, 'section'>> = [
      {
        id: 'a:newtab',
        title: 'New tab',
        hint: `${MOD_LABEL}+T`,
        icon: <Plus size={15} />,
        run: () => nav.newTab(),
      },
      {
        id: 'a:reopen',
        title: 'Reopen closed tab',
        hint: 'Alt+Shift+T',
        icon: <RotateCcw size={15} />,
        run: () => nav.reopenClosedTab(),
      },
      {
        id: 'a:start',
        title: 'Go to start page',
        icon: <Compass size={15} />,
        run: () => {
          leaveSettings();
          ws.showStart();
        },
      },
      {
        id: 'a:history',
        title: 'Show history',
        icon: <History size={15} />,
        keywords: 'visited recent pages browsing',
        hint: `${MOD_LABEL}+H`,
        run: () => useUI.getState().setHistoryOpen(true),
      },
      {
        id: 'a:library',
        title: 'Open bookmark library',
        icon: <Library size={15} />,
        keywords: 'bookmarks folders favorites',
        run: () => {
          leaveSettings();
          ws.showBookmarks(null);
        },
      },
      {
        id: 'a:import',
        title: 'Import bookmarks from HTML file…',
        icon: <Upload size={15} />,
        keywords: 'chrome edge firefox export',
        run: () => pickBookmarksFile(null),
      },
      {
        id: 'a:group',
        title: 'New group…',
        icon: <FolderPlus size={15} />,
        run: () => void createGroupFlow(),
      },
      {
        id: 'a:dashboard',
        title: 'New dashboard…',
        icon: <LayoutDashboard size={15} />,
        run: () => void createDashboardFlow(),
      },
      {
        id: 'a:space',
        title: 'New space…',
        icon: <SquarePlus size={15} />,
        run: () => void createSpaceFlow(),
      },
      {
        id: 'a:sidebar',
        title: 'Toggle sidebar',
        hint: `${MOD_LABEL}+B`,
        icon: <PanelLeft size={15} />,
        run: () => useSettings.getState().toggleSidebar(),
      },
      {
        id: 'a:settings',
        title: 'Open settings',
        hint: `${MOD_LABEL}+,`,
        icon: <Settings size={15} />,
        run: () => ui().setSettingsOpen(true),
      },
    ];
    items.push(...actions.map((a) => ({ ...a, section: 'Actions' as const })));

    spaces.forEach((space, index) => {
      items.push({
        id: `s:${space.id}`,
        section: 'Spaces',
        title: `Switch to ${space.name}`,
        keywords: space.name,
        hint: index < 9 ? `${MOD_LABEL}+${index + 1}` : undefined,
        icon: (
          <EntityIcon name={space.icon} size={15} style={{ color: ACCENTS[space.accent].value }} />
        ),
        run: () => {
          leaveSettings();
          ws.switchSpace(space.id);
        },
      });
    });

    Object.values(ws.tabs)
      .filter((t) => t.url)
      .sort((a, b) => b.lastSelectedAt - a.lastSelectedAt)
      .forEach((tab) => {
        items.push({
          id: `t:${tab.id}`,
          section: 'Tabs',
          title: tabDisplayTitle(tab),
          subtitle: `${spaceName(tab.spaceId)} · ${displayUrl(tab.url)}`,
          keywords: tab.url,
          icon: <Favicon url={tab.url} icon={tab.favicon} />,
          run: () => {
            leaveSettings();
            ws.selectTab(tab.id);
          },
        });
      });

    Object.values(ws.groups).forEach((group) => {
      items.push({
        id: `g:${group.id}`,
        section: 'Groups',
        title: group.name,
        subtitle: spaceName(group.spaceId),
        icon: (
          <EntityIcon name={group.icon} size={15} style={{ color: ACCENTS[group.accent].value }} />
        ),
        run: () => nav.openGroup(group.id),
      });
    });

    Object.values(ws.dashboards).forEach((dashboard) => {
      items.push({
        id: `d:${dashboard.id}`,
        section: 'Dashboards',
        title: dashboard.name,
        subtitle: spaceName(dashboard.spaceId),
        icon: <LayoutDashboard size={15} />,
        run: () => {
          leaveSettings();
          ws.openDashboard(dashboard.id);
        },
      });
    });

    Object.values(ws.bookmarkFolders).forEach((folder) => {
      items.push({
        id: `f:${folder.id}`,
        section: 'Folders',
        title: folder.name,
        subtitle: `${spaceName(folder.spaceId)} · ${folderLabel(folder.id)}`,
        icon: (
          <EntityIcon
            name={folder.icon}
            size={15}
            style={{ color: ACCENTS[folder.accent].value }}
          />
        ),
        run: () => {
          leaveSettings();
          ws.showBookmarks(folder.id);
        },
      });
    });

    Object.values(ws.bookmarks).forEach((bookmark) => {
      items.push({
        id: `b:${bookmark.id}`,
        section: 'Bookmarks',
        title: bookmark.title,
        subtitle: `${bookmark.folderId ? folderLabel(bookmark.folderId) : spaceName(bookmark.spaceId)} · ${displayUrl(bookmark.url)}`,
        keywords: bookmark.url,
        icon: <Favicon url={bookmark.url} />,
        run: () => {
          leaveSettings();
          if (bookmark.spaceId !== ws.activeSpaceId) ws.switchSpace(bookmark.spaceId);
          nav.openUrl(bookmark.url, { title: bookmark.title });
        },
      });
    });

    const q = query.trim();
    let results: PaletteItem[];
    if (!q) {
      results = items.filter(
        (i) => i.section === 'Actions' || i.section === 'Spaces' || i.section === 'Tabs',
      );
    } else {
      const scored = items
        .map((item) => ({
          item,
          score: Math.max(
            matchScore(q, item.title),
            item.keywords ? matchScore(q, item.keywords) * 0.7 : 0,
            item.subtitle ? matchScore(q, item.subtitle) * 0.5 : 0,
          ),
        }))
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score);
      results = scored.map((s) => s.item);
    }

    const grouped = SECTION_ORDER.flatMap((section) =>
      results.filter((r) => r.section === section).slice(0, PER_SECTION),
    );

    if (q) {
      const target = normalizeInput(q, engine);
      if (target) {
        grouped.unshift({
          id: 'nav',
          section: 'Go to',
          title: target.kind === 'url' ? `Open ${displayUrl(target.url)}` : `Search for “${q}”`,
          subtitle: 'In a new tab',
          icon: target.kind === 'url' ? <Globe size={15} /> : <Search size={15} />,
          run: () => {
            leaveSettings();
            nav.submit(q, { newTab: true });
          },
        });
        if (target.kind !== 'url' && grouped.length > 1) {
          // Prefer real matches over a web search when the query isn't an address.
          grouped.push(grouped.shift() as PaletteItem);
        }
      }
    }
    return grouped;
  }, [query, ws, nav, engine, ui]);
}

function Palette() {
  const setOpen = useUI((s) => s.setPaletteOpen);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const items = useItems(query);
  const index = Math.min(cursor, Math.max(items.length - 1, 0));

  useEffect(() => {
    list.current
      ?.querySelector<HTMLElement>(`[data-index="${index}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  const runItem = (item: PaletteItem | undefined) => {
    if (!item) return;
    setOpen(false);
    item.run();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex animate-fade items-start justify-center bg-black/45 px-4 pt-[12vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="flex max-h-[min(560px,72vh)] w-full max-w-[600px] animate-pop flex-col overflow-hidden rounded-2xl bg-elevated shadow-pop"
      >
        <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-line px-4">
          <Search size={16} className="text-fg-3" />
          <input
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={items[index] ? `palette-${items[index].id}` : undefined}
            placeholder="Search tabs, groups, spaces, bookmarks — or type an address"
            value={query}
            spellCheck={false}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setCursor((index + 1) % Math.max(items.length, 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setCursor((index - 1 + items.length) % Math.max(items.length, 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                runItem(items[index]);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
              }
            }}
            className="h-full flex-1 bg-transparent text-[14px] outline-none placeholder:text-fg-3"
          />
          <Kbd>Esc</Kbd>
        </div>

        <div
          ref={list}
          id="palette-list"
          role="listbox"
          className="min-h-0 flex-1 overflow-y-auto p-1.5"
        >
          {items.length === 0 && (
            <p className="px-3 py-8 text-center text-[13px] text-fg-3">No results for “{query}”</p>
          )}
          {items.map((item, i) => {
            const header = i === 0 || items[i - 1]?.section !== item.section ? item.section : null;
            return (
              <div key={item.id}>
                {header && (
                  <div className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-3">
                    {header}
                  </div>
                )}
                <div
                  id={`palette-${item.id}`}
                  role="option"
                  aria-selected={i === index}
                  data-index={i}
                  onMouseMove={() => i !== index && setCursor(i)}
                  onClick={() => runItem(item)}
                  className={cn(
                    'flex h-9 items-center gap-3 rounded-lg px-2.5',
                    i === index ? 'bg-hover text-fg' : 'text-fg-2',
                  )}
                >
                  <span className="flex w-4 shrink-0 justify-center text-fg-2">{item.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px]">
                    <span className="text-fg">{item.title}</span>
                    {item.subtitle && (
                      <span className="ml-2 text-[12px] text-fg-3">{item.subtitle}</span>
                    )}
                  </span>
                  {item.hint && <Kbd>{item.hint}</Kbd>}
                  {i === index && <CornerDownLeft size={13} className="shrink-0 text-fg-3" />}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex h-8 shrink-0 items-center gap-3 border-t border-line px-3 text-[11px] text-fg-3">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <Kbd>Enter</Kbd> open
          </span>
          <span className="ml-auto">Searches every space</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
