import { useMemo } from 'react';
import { EntityIcon } from '../common/EntityIcon';
import {
  Clock,
  Command,
  FolderPlus,
  LayoutDashboard,
  Layers,
  Lightbulb,
  Plus,
  Star,
  Zap,
  type Icon,
} from '../icons';
import { useNavigation } from '../../app/providers/hostContext';
import { createDashboardFlow, createGroupFlow } from '../../features/workspace/actions';
import { addBookmarkFlow } from '../../features/bookmarks/bookmarkActions';
import { buildBookmarkMenu, buildFolderMenu } from '../../features/bookmarks/bookmarkMenu';
import { buildTabMenu } from '../../features/workspace/menus';
import {
  activeTab,
  bookmarksIn,
  foldersIn,
  containerTabs,
  dashboardsOfSpace,
  groupsOfSpace,
  recentTabs,
  tabDisplayTitle,
  tabsOfSpace,
} from '../../features/workspace/selectors';
import { useUI } from '../../stores/uiStore';
import { useWorkspace } from '../../stores/workspaceStore';
import { cn, MOD_LABEL, relativeTime } from '../../utils/misc';
import { Card, EmptyHint } from '../common/Card';
import { Favicon } from '../common/Favicon';
import { Kbd } from '../common/Kbd';
import { LinkRow } from '../common/LinkRow';
import { showContextMenu } from '../common/menu';
import { QuickSearch } from './QuickSearch';

export function StartPage() {
  const nav = useNavigation();
  const spaceId = useWorkspace((s) => s.activeSpaceId);
  const space = useWorkspace((s) => s.spaces[s.activeSpaceId]);
  const tabs = useWorkspace((s) => s.tabs);
  const groups = useWorkspace((s) => s.groups);
  const bookmarks = useWorkspace((s) => s.bookmarks);
  const dashboards = useWorkspace((s) => s.dashboards);
  const isBlankTab = useWorkspace((s) => activeTab(s) !== null);
  const selectTab = useWorkspace((s) => s.selectTab);
  const setPaletteOpen = useUI((s) => s.setPaletteOpen);

  const folders = useWorkspace((s) => s.bookmarkFolders);
  const showBookmarks = useWorkspace((s) => s.showBookmarks);
  const spaceBookmarks = useMemo(() => bookmarksIn(bookmarks, spaceId, null), [bookmarks, spaceId]);
  const topFolders = useMemo(() => foldersIn(folders, spaceId, null), [folders, spaceId]);
  const recent = useMemo(() => recentTabs(tabs, spaceId, 6), [tabs, spaceId]);
  const spaceGroups = useMemo(() => groupsOfSpace(groups, spaceId), [groups, spaceId]);
  const tabCount = useMemo(() => tabsOfSpace(tabs, spaceId).length, [tabs, spaceId]);
  const dashboardCount = useMemo(
    () => dashboardsOfSpace(dashboards, spaceId).length,
    [dashboards, spaceId],
  );

  if (!space) return null;

  const quickActions: Array<{ label: string; icon: Icon; hint?: string; run: () => void }> = [
    { label: 'New tab', icon: Plus, hint: `${MOD_LABEL}+T`, run: () => nav.newTab() },
    { label: 'New group', icon: FolderPlus, run: () => void createGroupFlow(spaceId) },
    { label: 'New dashboard', icon: LayoutDashboard, run: () => void createDashboardFlow() },
    { label: 'Add bookmark', icon: Star, run: () => void addBookmarkFlow(spaceId) },
    {
      label: 'Command palette',
      icon: Command,
      hint: `${MOD_LABEL}+K`,
      run: () => setPaletteOpen(true),
    },
  ];

  return (
    <div className="relative h-full overflow-y-auto">
      <div className="relative mx-auto flex max-w-[1080px] flex-col gap-6 px-8 pb-12 pt-12">
        <header className="flex items-center gap-4">
          <span
            className={cn(
              'flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-accent-soft text-accent-ink shadow-card',
              `h-${space.accent}`,
            )}
          >
            <EntityIcon name={space.icon} size={22} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-[28px] font-semibold leading-[34px] tracking-[-0.02em]">
              {space.name}
            </h1>
            <p className="meta">
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
              {' · '}
              {tabCount} tabs · {spaceGroups.length} groups · {dashboardCount} dashboards
            </p>
          </div>
        </header>

        <QuickSearch spaceId={spaceId} autoFocus={!isBlankTab} />
        <p className="-mt-3 flex items-center gap-1.5 px-1 text-[12px] text-fg-3">
          <Lightbulb size={13} />
          Press <Kbd>{MOD_LABEL}+K</Kbd> to jump to any tab, group, folder or bookmark across
          spaces.
        </p>

        <Card
          title="Pinned sites"
          icon={Star}
          hue={space.accent}
          variant="accent"
          actions={
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => void addBookmarkFlow(spaceId)}
                className="btn quiet sm"
              >
                Add site
              </button>
              <button
                type="button"
                onClick={() => showBookmarks(null, spaceId)}
                className="btn quiet sm"
              >
                Open library
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-1.5 p-1">
            {topFolders.map((f) => (
              <button
                key={f.id}
                type="button"
                title={f.name}
                onClick={() => showBookmarks(f.id)}
                onContextMenu={(e) => showContextMenu(e, buildFolderMenu(f.id))}
                className="flex flex-col items-center gap-2 rounded-lg px-2 py-3 transition-ui hover:bg-hover"
              >
                <span
                  className={cn(
                    'flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent-ink',
                    `h-${f.accent}`,
                  )}
                >
                  <EntityIcon name={f.icon} size={18} />
                </span>
                <span className="w-full truncate text-center text-[12px] text-fg-2">{f.name}</span>
              </button>
            ))}
            {spaceBookmarks.map((b) => (
              <button
                key={b.id}
                type="button"
                title={b.url}
                onClick={() => nav.openUrl(b.url, { title: b.title })}
                onContextMenu={(e) => showContextMenu(e, buildBookmarkMenu(b.id, nav))}
                className="flex flex-col items-center gap-2 rounded-lg px-2 py-3 transition-ui hover:bg-hover"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-canvas shadow-[inset_0_0_0_1px_var(--line)]">
                  <Favicon url={b.url} size={20} />
                </span>
                <span className="w-full truncate text-center text-[12px] text-fg-2">{b.title}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => void addBookmarkFlow(spaceId)}
              className="flex flex-col items-center gap-2 rounded-lg px-2 py-3 text-fg-3 transition-ui hover:bg-hover hover:text-fg"
            >
              <span className="flex size-10 items-center justify-center rounded-xl border border-dashed border-line-strong">
                <Plus size={18} />
              </span>
              <span className="text-[12px]">Add site</span>
            </button>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Recent tabs" icon={Clock}>
            {recent.length === 0 ? (
              <EmptyHint>Tabs you open in this space will show up here.</EmptyHint>
            ) : (
              recent.map((t) => (
                <LinkRow
                  key={t.id}
                  url={t.url}
                  title={tabDisplayTitle(t)}
                  meta={t.lastSelectedAt ? relativeTime(t.lastSelectedAt) : 'Not opened yet'}
                  onOpen={() => selectTab(t.id)}
                  onContextMenu={(e) => showContextMenu(e, buildTabMenu(t.id, nav))}
                />
              ))
            )}
          </Card>

          <Card
            title="Groups"
            icon={Layers}
            actions={
              <button
                type="button"
                onClick={() => void createGroupFlow(spaceId)}
                className="btn quiet sm"
              >
                New group
              </button>
            }
          >
            {spaceGroups.length === 0 ? (
              <EmptyHint>Groups keep related tabs together. Create one to get started.</EmptyHint>
            ) : (
              spaceGroups.map((g) => {
                const members = containerTabs(tabs, spaceId, false, g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => nav.openGroup(g.id)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-ui hover:bg-hover"
                  >
                    <span className={cn('icbox size-7 rounded-lg', `h-${g.accent}`)}>
                      <EntityIcon name={g.icon} size={14} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px]">{g.name}</span>
                      <span className="block text-[11.5px] text-fg-3">
                        {members.length} {members.length === 1 ? 'tab' : 'tabs'}
                      </span>
                    </span>
                    <span className="flex -space-x-1">
                      {members.slice(0, 4).map((m) => (
                        <span
                          key={m.id}
                          className="rounded-[5px] bg-raised p-[2px] ring-1 ring-line"
                        >
                          <Favicon url={m.url} size={14} />
                        </span>
                      ))}
                    </span>
                  </button>
                );
              })
            )}
          </Card>
        </div>

        <Card title="Quick actions" icon={Zap}>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-5">
            {quickActions.map(({ label, icon: Icon, hint, run }) => (
              <button
                key={label}
                type="button"
                onClick={run}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-fg-2 transition-ui hover:bg-hover hover:text-fg"
              >
                <Icon size={15} className="shrink-0 text-fg-3" />
                <span className="flex-1 truncate">{label}</span>
                {hint && <Kbd>{hint}</Kbd>}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
