import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  Copy,
  ExternalLink,
  History,
  Plus,
  Search,
  Star,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useNavigation } from '../../app/providers/hostContext';
import { Button } from '../../components/common/Button';
import { askConfirm } from '../../components/common/dialogs';
import { Favicon } from '../../components/common/Favicon';
import { menu, showContextMenu, showMenuAt } from '../../components/common/menu';
import { useHistory, type HistoryEntry } from '../../stores/historyStore';
import { useSettings } from '../../stores/settingsStore';
import { useUI } from '../../stores/uiStore';
import { useWorkspace } from '../../stores/workspaceStore';
import { cn } from '../../utils/misc';
import { displayUrl, hostnameOf } from '../../utils/url';
import { ACCENTS } from '../workspace/appearance';

const PAGE = 300;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

type Scope = 'all' | 'space';

function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dayLabel(day: number, today: number): string {
  const date = new Date(day).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: new Date(day).getFullYear() === new Date(today).getFullYear() ? undefined : 'numeric',
  });
  if (day === today) return `Today · ${date}`;
  if (day === today - DAY) return `Yesterday · ${date}`;
  return date;
}

function matches(entry: HistoryEntry, q: string): boolean {
  return entry.title.toLowerCase().includes(q) || entry.url.toLowerCase().includes(q);
}

export function HistoryView() {
  const nav = useNavigation();
  const entries = useHistory((s) => s.entries);
  const recording = useSettings((s) => s.recordHistory);
  const spaces = useWorkspace((s) => s.spaces);
  const activeSpaceId = useWorkspace((s) => s.activeSpaceId);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [limit, setLimit] = useState(PAGE);
  const search = useRef<HTMLInputElement>(null);
  const deferred = useDeferredValue(query.trim().toLowerCase());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing =
        e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f')) {
        e.preventDefault();
        search.current?.focus();
        search.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filtered = useMemo(
    () =>
      entries.filter(
        (e) =>
          (scope === 'all' || e.spaceId === activeSpaceId) && (!deferred || matches(e, deferred)),
      ),
    [entries, scope, activeSpaceId, deferred],
  );

  const days = useMemo(() => {
    const groups: Array<{ day: number; items: HistoryEntry[] }> = [];
    for (const entry of filtered.slice(0, limit)) {
      const day = startOfDay(entry.visitedAt);
      const last = groups.at(-1);
      if (last?.day === day) last.items.push(entry);
      else groups.push({ day, items: [entry] });
    }
    return groups;
  }, [filtered, limit]);

  const [today] = useState(() => startOfDay(Date.now()));
  const spaceName = spaces[activeSpaceId]?.name ?? 'this space';

  const open = (entry: HistoryEntry, newTab = false) => {
    useUI.getState().setHistoryOpen(false);
    nav.openUrl(entry.url, { title: entry.title || undefined, reuseExisting: !newTab });
  };

  const clearMenu = (anchor: HTMLElement) => {
    const clear = (label: string, since: number) =>
      menu.item(label, () => {
        void askConfirm({
          title: 'Clear history?',
          message:
            since === 0
              ? 'All browsing history on this device will be deleted. Sign-ins and bookmarks are not affected.'
              : `Visits from the ${label.toLowerCase()} will be deleted.`,
          confirmLabel: 'Clear',
          danger: true,
        }).then(({ ok }) => {
          if (!ok) return;
          useHistory.getState().clear(since);
          useUI.getState().showToast('History cleared', 'success');
        });
      });
    const now = Date.now();
    showMenuAt(anchor, [
      menu.label('Delete visits from'),
      clear('Last hour', now - HOUR),
      clear('Last 24 hours', now - DAY),
      clear('Last 7 days', now - 7 * DAY),
      menu.separator(),
      clear('All time', 0),
    ]);
  };

  const rowMenu = (entry: HistoryEntry) => {
    const host = hostnameOf(entry.url);
    return [
      menu.item('Open', () => open(entry), { icon: ExternalLink }),
      menu.item('Open in new tab', () => open(entry, true), { icon: Plus }),
      menu.item(
        'Bookmark',
        () => {
          useWorkspace.getState().addBookmark({
            url: entry.url,
            title: entry.title || displayUrl(entry.url),
            spaceId: spaces[entry.spaceId] ? entry.spaceId : activeSpaceId,
          });
          useUI.getState().showToast('Bookmarked', 'success');
        },
        { icon: Star },
      ),
      menu.item(
        'Copy link',
        () => {
          navigator.clipboard
            .writeText(entry.url)
            .then(() => useUI.getState().showToast('Link copied', 'success'))
            .catch(() => useUI.getState().showToast('Clipboard is not available', 'error'));
        },
        { icon: Copy },
      ),
      menu.separator(),
      menu.item('Delete', () => useHistory.getState().remove([entry.id]), {
        icon: Trash2,
        danger: true,
      }),
      menu.item(
        `Delete all from ${host}`,
        () => {
          useHistory.getState().removeSite(host);
          useUI.getState().showToast(`Deleted history for ${host}`, 'success');
        },
        { icon: Trash2, danger: true },
      ),
    ];
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-col gap-3 border-b border-line px-6 pb-3 pt-4">
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--info)_16%,transparent)] text-info">
            <History size={16} strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-[17px] font-semibold tracking-[-0.01em]">History</h1>
            <p className="tabular text-[12px] text-fg-3">
              {entries.length.toLocaleString()} visits · kept only on this device
            </p>
          </div>
          <IconTextButton
            icon={X}
            label="Close"
            onClick={() => useUI.getState().setHistoryOpen(false)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-8 min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 focus-within:border-focus/70 md:max-w-[420px]">
            <Search size={14} className="shrink-0 text-fg-3" />
            <input
              ref={search}
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(PAGE);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && query) {
                  e.stopPropagation();
                  setQuery('');
                }
              }}
              placeholder="Search history"
              aria-label="Search history"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-fg outline-none placeholder:text-fg-3"
            />
          </label>
          <div className="flex h-8 items-center rounded-lg border border-line bg-surface p-0.5 text-[12px]">
            {(['all', 'space'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={scope === value}
                onClick={() => setScope(value)}
                className={cn(
                  'h-full rounded-md px-2.5 transition-ui',
                  scope === value ? 'bg-selected text-fg' : 'text-fg-3 hover:text-fg',
                )}
              >
                {value === 'all' ? 'All spaces' : spaceName}
              </button>
            ))}
          </div>
          <span className="flex-1" />
          <Button
            icon={Trash2}
            variant="ghost"
            onClick={(e) => clearMenu(e.currentTarget)}
            disabled={entries.length === 0}
          >
            Clear history…
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-12 pt-4">
        {!recording && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2 text-[12.5px] text-fg-2">
            History recording is off. New visits are not saved.
            <span className="flex-1" />
            <Button onClick={() => useSettings.getState().update({ recordHistory: true })}>
              Turn on
            </Button>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="mx-auto mt-16 max-w-sm text-center text-fg-3">
            <History size={28} className="mx-auto mb-3 text-fg-3" strokeWidth={1.6} />
            <p className="text-[13px]">
              {deferred
                ? `Nothing in history matches “${query.trim()}”.`
                : 'Pages you visit will show up here.'}
            </p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-[960px] flex-col gap-5">
            {days.map(({ day, items }) => (
              <section key={day}>
                <h2 className="mb-1.5 px-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-fg-3">
                  {dayLabel(day, today)}
                </h2>
                <ul className="rounded-xl border border-line bg-surface p-1 shadow-card">
                  {items.map((entry) => (
                    <HistoryRow
                      key={entry.id}
                      entry={entry}
                      showSpace={scope === 'all'}
                      spaceName={spaces[entry.spaceId]?.name}
                      spaceColor={
                        spaces[entry.spaceId]
                          ? ACCENTS[spaces[entry.spaceId]!.accent].value
                          : undefined
                      }
                      onOpen={(newTab) => open(entry, newTab)}
                      onMenu={(e) => showContextMenu(e, rowMenu(entry))}
                    />
                  ))}
                </ul>
              </section>
            ))}
            {filtered.length > limit && (
              <div className="flex justify-center">
                <Button onClick={() => setLimit((l) => l + PAGE)}>
                  Show more ({(filtered.length - limit).toLocaleString()} left)
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryRow({
  entry,
  showSpace,
  spaceName,
  spaceColor,
  onOpen,
  onMenu,
}: {
  entry: HistoryEntry;
  showSpace: boolean;
  spaceName?: string;
  spaceColor?: string;
  onOpen: (newTab: boolean) => void;
  onMenu: (e: React.MouseEvent) => void;
}) {
  const time = new Date(entry.visitedAt).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <li className="group flex h-9 items-center gap-3 rounded-lg px-2 transition-ui hover:bg-hover">
      <span className="tabular w-11 shrink-0 text-[11.5px] text-fg-3">{time}</span>
      <button
        type="button"
        title={entry.url}
        onClick={(e) => onOpen(e.ctrlKey || e.metaKey)}
        onAuxClick={(e) => {
          if (e.button === 1) onOpen(true);
        }}
        onContextMenu={onMenu}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left outline-none focus-visible:underline"
      >
        <Favicon url={entry.url} />
        <span className="truncate text-[13px] text-fg">{entry.title || displayUrl(entry.url)}</span>
        <span className="shrink truncate text-[12px] text-fg-3">{hostnameOf(entry.url)}</span>
      </button>
      {showSpace && spaceName && (
        <span className="flex shrink-0 items-center gap-1.5 text-[11.5px] text-fg-3">
          <span className="size-1.5 rounded-full" style={{ background: spaceColor }} />
          {spaceName}
        </span>
      )}
      <button
        type="button"
        aria-label="Delete from history"
        title="Delete from history"
        onClick={() => useHistory.getState().remove([entry.id])}
        className="flex size-6 shrink-0 items-center justify-center rounded-md text-fg-3 opacity-0 transition-ui hover:bg-hover hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
      >
        <X size={13} />
      </button>
    </li>
  );
}

function IconTextButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-fg-3 transition-ui hover:bg-hover hover:text-fg"
    >
      <Icon size={13} />
      {label}
    </button>
  );
}
