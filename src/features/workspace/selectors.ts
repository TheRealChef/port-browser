import type {
  Bookmark,
  BookmarkFolder,
  Dashboard,
  Group,
  ID,
  Space,
  SpaceView,
  Tab,
  WorkspaceData,
} from '../../types/models';

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

export function sortedSpaces(spaces: Record<ID, Space>): Space[] {
  return Object.values(spaces).sort(byOrder);
}

export function groupsOfSpace(groups: Record<ID, Group>, spaceId: ID): Group[] {
  return Object.values(groups)
    .filter((g) => g.spaceId === spaceId)
    .sort(byOrder);
}

/** Tabs that share a sidebar container: pinned, a group, or ungrouped. */
export function containerTabs(
  tabs: Record<ID, Tab>,
  spaceId: ID,
  pinned: boolean,
  groupId: ID | null,
): Tab[] {
  return Object.values(tabs)
    .filter(
      (t) => t.spaceId === spaceId && t.pinned === pinned && (pinned || t.groupId === groupId),
    )
    .sort(byOrder);
}

export function tabsOfSpace(tabs: Record<ID, Tab>, spaceId: ID): Tab[] {
  return Object.values(tabs).filter((t) => t.spaceId === spaceId);
}

export function recentTabs(tabs: Record<ID, Tab>, spaceId: ID, limit: number): Tab[] {
  return tabsOfSpace(tabs, spaceId)
    .filter((t) => t.url)
    .sort((a, b) => b.lastSelectedAt - a.lastSelectedAt || b.createdAt - a.createdAt)
    .slice(0, limit);
}

export function bookmarksOfSpace(bookmarks: Record<ID, Bookmark>, spaceId: ID): Bookmark[] {
  return Object.values(bookmarks)
    .filter((b) => b.spaceId === spaceId)
    .sort(byOrder);
}

export function dashboardsOfSpace(dashboards: Record<ID, Dashboard>, spaceId: ID): Dashboard[] {
  return Object.values(dashboards)
    .filter((d) => d.spaceId === spaceId)
    .sort(byOrder);
}

export function tabDisplayTitle(tab: Tab): string {
  return tab.customTitle?.trim() || tab.title || 'New Tab';
}

export function nextOrder(items: Array<{ order: number }>): number {
  return items.reduce((max, item) => Math.max(max, item.order), -1) + 1;
}

const START_VIEW: SpaceView = { kind: 'start' };

/** Returns a stable reference so it can be used directly as a store selector. */
export function activeView(state: WorkspaceData): SpaceView {
  return state.spaceViews[state.activeSpaceId] ?? START_VIEW;
}

export function activeTab(state: WorkspaceData): Tab | null {
  const view = activeView(state);
  return view.kind === 'tab' ? (state.tabs[view.tabId] ?? null) : null;
}

/** Picks what a space should show after `removed` disappears from it. */
export function fallbackView(tabs: Record<ID, Tab>, removed: Tab): SpaceView {
  const siblings = containerTabs(tabs, removed.spaceId, removed.pinned, removed.groupId);
  const index = siblings.findIndex((t) => t.id === removed.id);
  const neighbour = index >= 0 ? (siblings[index + 1] ?? siblings[index - 1]) : undefined;
  if (neighbour && neighbour.id !== removed.id) return { kind: 'tab', tabId: neighbour.id };

  const recent = tabsOfSpace(tabs, removed.spaceId)
    .filter((t) => t.id !== removed.id)
    .sort((a, b) => b.lastSelectedAt - a.lastSelectedAt)[0];
  return recent ? { kind: 'tab', tabId: recent.id } : { kind: 'start' };
}

export function foldersIn(
  folders: Record<ID, BookmarkFolder>,
  spaceId: ID,
  parentId: ID | null,
): BookmarkFolder[] {
  return Object.values(folders)
    .filter((f) => f.spaceId === spaceId && f.parentId === parentId)
    .sort(byOrder);
}

export function bookmarksIn(
  bookmarks: Record<ID, Bookmark>,
  spaceId: ID,
  folderId: ID | null,
): Bookmark[] {
  return Object.values(bookmarks)
    .filter((b) => b.spaceId === spaceId && b.folderId === folderId)
    .sort(byOrder);
}

/** Folders from the top level down to `folderId` (inclusive). */
export function folderPath(
  folders: Record<ID, BookmarkFolder>,
  folderId: ID | null,
): BookmarkFolder[] {
  const path: BookmarkFolder[] = [];
  const seen = new Set<ID>();
  let cursor = folderId ? folders[folderId] : undefined;
  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    path.unshift(cursor);
    cursor = cursor.parentId ? folders[cursor.parentId] : undefined;
  }
  return path;
}

/** `folderId` and every folder nested below it. */
export function descendantFolderIds(folders: Record<ID, BookmarkFolder>, folderId: ID): Set<ID> {
  const result = new Set<ID>([folderId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of Object.values(folders)) {
      if (f.parentId && result.has(f.parentId) && !result.has(f.id)) {
        result.add(f.id);
        grew = true;
      }
    }
  }
  return result;
}

/** Number of bookmarks inside a folder, including all nested folders. */
export function deepBookmarkCount(
  folders: Record<ID, BookmarkFolder>,
  bookmarks: Record<ID, Bookmark>,
  folderId: ID,
): number {
  const ids = descendantFolderIds(folders, folderId);
  return Object.values(bookmarks).filter((b) => b.folderId && ids.has(b.folderId)).length;
}
