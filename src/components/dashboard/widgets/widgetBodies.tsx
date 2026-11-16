import { useMemo } from 'react';
import { EntityIcon } from '../../common/EntityIcon';
import { ChevronRight, Library, Plus, X } from '../../icons';
import { useNavigation } from '../../../app/providers/hostContext';
import { askLink } from '../../../features/workspace/actions';
import {
  addBookmarkFlow,
  removeBookmarkWithUndo,
} from '../../../features/bookmarks/bookmarkActions';
import { buildFolderMenu } from '../../../features/bookmarks/bookmarkMenu';
import { buildBookmarkMenu } from '../../../features/bookmarks/bookmarkMenu';
import { buildTabMenu } from '../../../features/workspace/menus';
import { ACCENTS } from '../../../features/workspace/appearance';
import {
  bookmarksIn,
  deepBookmarkCount,
  foldersIn,
  containerTabs,
  groupsOfSpace,
  recentTabs,
  tabDisplayTitle,
} from '../../../features/workspace/selectors';
import { useWorkspace } from '../../../stores/workspaceStore';
import type {
  BookmarksWidget,
  Dashboard,
  GroupLauncherWidget,
  QuickLinksWidget,
  RecentTabsWidget,
} from '../../../types/models';
import { relativeTime } from '../../../utils/misc';
import { EmptyHint } from '../../common/Card';
import { IconButton } from '../../common/IconButton';
import { LinkRow } from '../../common/LinkRow';
import { showContextMenu } from '../../common/menu';

function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12.5px] text-fg-3 transition-ui hover:bg-hover hover:text-fg"
    >
      <Plus size={15} />
      {label}
    </button>
  );
}

export function BookmarksBody({
  dashboard,
  widget,
}: {
  dashboard: Dashboard;
  widget: BookmarksWidget;
}) {
  const nav = useNavigation();
  const all = useWorkspace((s) => s.bookmarks);
  const folders = useWorkspace((s) => s.bookmarkFolders);
  const showBookmarks = useWorkspace((s) => s.showBookmarks);
  const folderId = widget.folderId && folders[widget.folderId] ? widget.folderId : null;
  const bookmarks = useMemo(
    () => bookmarksIn(all, dashboard.spaceId, folderId),
    [all, dashboard.spaceId, folderId],
  );
  const subfolders = useMemo(
    () => foldersIn(folders, dashboard.spaceId, folderId),
    [folders, dashboard.spaceId, folderId],
  );
  return (
    <>
      {bookmarks.length === 0 && subfolders.length === 0 && (
        <EmptyHint>No bookmarks here yet.</EmptyHint>
      )}
      {subfolders.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => showBookmarks(f.id)}
          onContextMenu={(e) => showContextMenu(e, buildFolderMenu(f.id))}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-ui hover:bg-hover"
        >
          <span
            style={{ color: ACCENTS[f.accent].value }}
            className="flex size-4 items-center justify-center"
          >
            <EntityIcon name={f.icon} size={15} />
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px]">{f.name}</span>
          <span className="text-[11.5px] tabular-nums text-fg-3">
            {deepBookmarkCount(folders, all, f.id)}
          </span>
          <ChevronRight size={13} className="text-fg-3" />
        </button>
      ))}
      {bookmarks.map((b) => (
        <LinkRow
          key={b.id}
          url={b.url}
          title={b.title}
          onOpen={() => nav.openUrl(b.url, { title: b.title })}
          onContextMenu={(e) => showContextMenu(e, buildBookmarkMenu(b.id, nav))}
          trailing={
            <IconButton
              size="sm"
              icon={X}
              label="Remove bookmark"
              onClick={() => removeBookmarkWithUndo(b.id)}
            />
          }
        />
      ))}
      <div className="flex items-center">
        <div className="flex-1">
          <AddRow
            label="Add bookmark"
            onClick={() => void addBookmarkFlow(dashboard.spaceId, folderId)}
          />
        </div>
        <button
          type="button"
          onClick={() => showBookmarks(folderId, dashboard.spaceId)}
          className="mt-0.5 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12.5px] text-fg-3 transition-ui hover:bg-hover hover:text-fg"
        >
          <Library size={14} />
          Open library
        </button>
      </div>
    </>
  );
}

export function QuickLinksBody({
  dashboard,
  widget,
}: {
  dashboard: Dashboard;
  widget: QuickLinksWidget;
}) {
  const nav = useNavigation();
  const addQuickLink = useWorkspace((s) => s.addQuickLink);
  const removeQuickLink = useWorkspace((s) => s.removeQuickLink);
  return (
    <>
      {widget.links.length === 0 && <EmptyHint>Add links you want one click away.</EmptyHint>}
      <div className="grid gap-x-1 sm:grid-cols-2">
        {widget.links.map((link) => (
          <LinkRow
            key={link.id}
            url={link.url}
            title={link.title}
            onOpen={() => nav.openUrl(link.url, { title: link.title })}
            trailing={
              <IconButton
                size="sm"
                icon={X}
                label="Remove link"
                onClick={() => removeQuickLink(dashboard.id, widget.id, link.id)}
              />
            }
          />
        ))}
      </div>
      <AddRow
        label="Add link"
        onClick={async () => {
          const link = await askLink('Add quick link');
          if (link) addQuickLink(dashboard.id, widget.id, link);
        }}
      />
    </>
  );
}

export function RecentTabsBody({
  dashboard,
  widget,
}: {
  dashboard: Dashboard;
  widget: RecentTabsWidget;
}) {
  const nav = useNavigation();
  const tabs = useWorkspace((s) => s.tabs);
  const selectTab = useWorkspace((s) => s.selectTab);
  const recent = useMemo(
    () => recentTabs(tabs, dashboard.spaceId, widget.limit),
    [tabs, dashboard.spaceId, widget.limit],
  );
  if (recent.length === 0) return <EmptyHint>No tabs in this space yet.</EmptyHint>;
  return (
    <>
      {recent.map((t) => (
        <LinkRow
          key={t.id}
          url={t.url}
          title={tabDisplayTitle(t)}
          meta={t.lastSelectedAt ? relativeTime(t.lastSelectedAt) : 'Not opened yet'}
          onOpen={() => selectTab(t.id)}
          onContextMenu={(e) => showContextMenu(e, buildTabMenu(t.id, nav))}
        />
      ))}
    </>
  );
}

export function GroupLauncherBody({
  dashboard,
  widget,
}: {
  dashboard: Dashboard;
  widget: GroupLauncherWidget;
}) {
  const nav = useNavigation();
  const groups = useWorkspace((s) => s.groups);
  const tabs = useWorkspace((s) => s.tabs);
  const visible = useMemo(() => {
    const all = groupsOfSpace(groups, dashboard.spaceId);
    return widget.groupIds ? all.filter((g) => widget.groupIds?.includes(g.id)) : all;
  }, [groups, dashboard.spaceId, widget.groupIds]);

  if (visible.length === 0) {
    return <EmptyHint>No groups to show. Choose groups from the widget menu.</EmptyHint>;
  }
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {visible.map((g) => {
        const color = ACCENTS[g.accent].value;
        const count = containerTabs(tabs, g.spaceId, false, g.id).length;
        return (
          <button
            key={g.id}
            type="button"
            onClick={() => nav.openGroup(g.id)}
            className="flex items-center gap-2.5 rounded-[9px] bg-sunk px-2.5 py-2 text-left shadow-sunk transition-ui hover:bg-hover"
          >
            <EntityIcon name={g.icon} size={16} style={{ color }} className="shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px]">{g.name}</span>
              <span className="block text-[11px] text-fg-3">{count} tabs</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
