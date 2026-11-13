import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AccentColor,
  Bookmark,
  BookmarkFolder,
  Dashboard,
  Group,
  ID,
  QuickLink,
  Space,
  SpaceView,
  Tab,
  Widget,
  WidgetKind,
  WorkspaceData,
} from '../types/models';
import { createDefaultWorkspace, makeTab } from '../features/workspace/defaults';
import type { ImportNode } from '../features/bookmarks/importHtml';
import {
  bookmarksIn,
  descendantFolderIds,
  folderPath,
  foldersIn,
  containerTabs,
  dashboardsOfSpace,
  fallbackView,
  groupsOfSpace,
  nextOrder,
  sortedSpaces,
  tabsOfSpace,
} from '../features/workspace/selectors';
import { createId } from '../utils/misc';
import { titleFromUrl, urlKey } from '../utils/url';
import { clamp } from '../utils/validate';
import {
  WORKSPACE_SCHEMA_VERSION,
  WORKSPACE_STORAGE_KEY,
  createSafeStorage,
  migrateWorkspace,
  sanitizeWorkspace,
} from './persistence';

export interface EntityAppearance {
  name: string;
  icon: string;
  accent: AccentColor;
}

function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

export interface CreateTabInput {
  /** Use this id instead of generating one (a native host names popup tabs itself). */
  id?: ID;
  url?: string;
  title?: string;
  spaceId?: ID;
  groupId?: ID | null;
  pinned?: boolean;
  select?: boolean;
  /** Insert directly after this tab in its container. */
  afterTabId?: ID;
}

export interface MoveTabTarget {
  spaceId?: ID;
  groupId?: ID | null;
  pinned?: boolean;
  /** Final position within the target container. Defaults to the end. */
  index?: number;
}

const HISTORY_LIMIT = 50;

interface WorkspaceActions {
  switchSpace: (spaceId: ID) => void;
  createSpace: (input: EntityAppearance) => ID;
  updateSpace: (spaceId: ID, patch: Partial<EntityAppearance>) => void;
  deleteSpace: (spaceId: ID) => void;
  reorderSpace: (spaceId: ID, toIndex: number) => void;

  showStart: (spaceId?: ID) => void;
  selectTab: (tabId: ID) => void;
  createTab: (input?: CreateTabInput) => ID;
  closeTab: (tabId: ID) => void;
  /** Re-inserts a previously closed tab near its old position and selects it. */
  restoreTab: (tab: Tab) => ID | null;
  duplicateTab: (tabId: ID) => ID | null;
  setTabPinned: (tabId: ID, pinned: boolean) => void;
  renameTab: (tabId: ID, customTitle: string | null) => void;
  moveTab: (tabId: ID, target: MoveTabTarget) => void;
  /** Records a navigation in the tab's history (drops forward entries). */
  recordNavigation: (tabId: ID, url: string, title?: string) => void;
  /** Moves through the tab's history; returns the new URL, or null if not possible. */
  stepHistory: (tabId: ID, delta: -1 | 1) => string | null;
  /**
   * Mirrors a navigation the browser engine already made (native host).
   * Steps the history when the URL matches a neighbouring entry, replaces
   * the current entry when `replace` is set (redirects), and pushes otherwise.
   */
  syncNavigation: (tabId: ID, url: string, options?: { replace?: boolean }) => void;
  /** Engine-reported page metadata (native host). */
  setTabMeta: (tabId: ID, meta: { title?: string; favicon?: string | null }) => void;

  createGroup: (input: EntityAppearance & { spaceId?: ID }) => ID;
  updateGroup: (groupId: ID, patch: Partial<EntityAppearance>) => void;
  deleteGroup: (groupId: ID, options?: { closeTabs?: boolean }) => void;
  setGroupCollapsed: (groupId: ID, collapsed: boolean) => void;
  reorderGroup: (groupId: ID, toIndex: number) => void;

  /** Adds a bookmark; returns the existing one's id if the URL is already in that folder. */
  addBookmark: (input: { url: string; title: string; spaceId?: ID; folderId?: ID | null }) => ID;
  updateBookmark: (bookmarkId: ID, patch: Partial<Pick<Bookmark, 'title' | 'url'>>) => void;
  removeBookmark: (bookmarkId: ID) => void;
  restoreBookmark: (bookmark: Bookmark) => void;
  moveBookmark: (bookmarkId: ID, target: { folderId: ID | null; index?: number }) => void;

  showBookmarks: (folderId: ID | null, spaceId?: ID) => void;
  createFolder: (input: EntityAppearance & { parentId: ID | null; spaceId?: ID }) => ID;
  updateFolder: (folderId: ID, patch: Partial<EntityAppearance> & { collapsed?: boolean }) => void;
  /** Returns false if the move would put a folder inside itself. */
  moveFolder: (folderId: ID, parentId: ID | null, index?: number) => boolean;
  deleteFolder: (folderId: ID, options?: { deleteContents?: boolean }) => void;
  importBookmarks: (
    nodes: ImportNode[],
    target: { spaceId?: ID; parentId: ID | null },
  ) => { folders: number; bookmarks: number };

  createDashboard: (name: string, spaceId?: ID) => ID;
  renameDashboard: (dashboardId: ID, name: string) => void;
  deleteDashboard: (dashboardId: ID) => void;
  reorderDashboard: (dashboardId: ID, toIndex: number) => void;
  openDashboard: (dashboardId: ID) => void;
  addWidget: (dashboardId: ID, kind: WidgetKind) => void;
  updateWidget: (dashboardId: ID, widgetId: ID, patch: WidgetPatch) => void;
  removeWidget: (dashboardId: ID, widgetId: ID) => void;
  reorderWidget: (dashboardId: ID, widgetId: ID, toIndex: number) => void;
  addQuickLink: (dashboardId: ID, widgetId: ID, link: Omit<QuickLink, 'id'>) => void;
  removeQuickLink: (dashboardId: ID, widgetId: ID, linkId: ID) => void;

  replaceAll: (data: WorkspaceData) => void;
  reset: () => void;
}

export type WidgetPatch = Partial<{
  title: string;
  colSpan: 1 | 2;
  limit: number;
  groupIds: ID[] | null;
  folderId: ID | null;
}>;

export type WorkspaceState = WorkspaceData & WorkspaceActions;

const WIDGET_TITLES: Record<WidgetKind, string> = {
  bookmarks: 'Bookmarks',
  quickLinks: 'Quick links',
  recentTabs: 'Recently opened',
  groupLauncher: 'Groups',
};

function newWidget(kind: WidgetKind): Widget {
  const base = { id: createId(), title: WIDGET_TITLES[kind], layout: { colSpan: 1 as const } };
  switch (kind) {
    case 'bookmarks':
      return { ...base, kind, folderId: null };
    case 'quickLinks':
      return { ...base, kind, links: [] };
    case 'recentTabs':
      return { ...base, kind, limit: 6 };
    case 'groupLauncher':
      return { ...base, kind, groupIds: null };
  }
}

/** Writes sequential `order` values for an already-sorted container. */
function withOrder(tabs: Record<ID, Tab>, ordered: Tab[]): Record<ID, Tab> {
  const next = { ...tabs };
  ordered.forEach((tab, index) => {
    next[tab.id] = tab.order === index && next[tab.id] === tab ? tab : { ...tab, order: index };
  });
  return next;
}

function renumber<T extends { order: number }>(list: T[]): T[] {
  return list.map((item, index) => (item.order === index ? item : { ...item, order: index }));
}

function reorderList<T extends { id: ID; order: number }>(
  list: T[],
  id: ID,
  toIndex: number,
): T[] | null {
  const from = list.findIndex((item) => item.id === id);
  if (from < 0) return null;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(clamp(toIndex, 0, copy.length), 0, item as T);
  return copy.map((entry, index) => (entry.order === index ? entry : { ...entry, order: index }));
}

function toRecord<T extends { id: ID }>(base: Record<ID, T>, items: T[]): Record<ID, T> {
  const next = { ...base };
  for (const item of items) next[item.id] = item;
  return next;
}

function omitWhere<T>(record: Record<ID, T>, predicate: (item: T) => boolean): Record<ID, T> {
  const next: Record<ID, T> = {};
  for (const [id, item] of Object.entries(record)) if (!predicate(item)) next[id] = item;
  return next;
}

function mapDashboard(
  state: WorkspaceData,
  dashboardId: ID,
  update: (dashboard: Dashboard) => Dashboard,
): Partial<WorkspaceData> {
  const dashboard = state.dashboards[dashboardId];
  if (!dashboard) return {};
  return { dashboards: { ...state.dashboards, [dashboardId]: update(dashboard) } };
}

function mapWidget(
  state: WorkspaceData,
  dashboardId: ID,
  widgetId: ID,
  update: (widget: Widget) => Widget,
): Partial<WorkspaceData> {
  return mapDashboard(state, dashboardId, (d) => ({
    ...d,
    widgets: d.widgets.map((w) => (w.id === widgetId ? update(w) : w)),
  }));
}

export function pickWorkspaceData(state: WorkspaceData): WorkspaceData {
  return {
    spaces: state.spaces,
    groups: state.groups,
    tabs: state.tabs,
    bookmarks: state.bookmarks,
    bookmarkFolders: state.bookmarkFolders,
    dashboards: state.dashboards,
    activeSpaceId: state.activeSpaceId,
    spaceViews: state.spaceViews,
  };
}

export const useWorkspace = create<WorkspaceState>()(
  persist<WorkspaceState, [], [], WorkspaceData>(
    (set, get) => {
      const setView = (spaceId: ID, view: SpaceView) =>
        set((s) => ({ spaceViews: { ...s.spaceViews, [spaceId]: view } }));

      return {
        ...createDefaultWorkspace(),

        switchSpace: (spaceId) => {
          if (!get().spaces[spaceId] || get().activeSpaceId === spaceId) return;
          set({ activeSpaceId: spaceId });
        },

        createSpace: ({ name, icon, accent }) => {
          const id = createId();
          set((s) => ({
            spaces: {
              ...s.spaces,
              [id]: {
                id,
                name: name.trim() || 'Untitled space',
                icon,
                accent,
                order: nextOrder(Object.values(s.spaces)),
                createdAt: Date.now(),
              },
            },
            spaceViews: { ...s.spaceViews, [id]: { kind: 'start' } },
            activeSpaceId: id,
          }));
          return id;
        },

        updateSpace: (spaceId, patch) =>
          set((s) => {
            const space = s.spaces[spaceId];
            if (!space) return s;
            const name = patch.name?.trim();
            return {
              spaces: {
                ...s.spaces,
                [spaceId]: { ...space, ...patch, name: name || space.name },
              },
            };
          }),

        deleteSpace: (spaceId) =>
          set((s) => {
            const remaining = sortedSpaces(s.spaces).filter((sp) => sp.id !== spaceId);
            if (!s.spaces[spaceId] || remaining.length === 0) return s;
            const inSpace = <T extends { spaceId: ID }>(item: T) => item.spaceId === spaceId;
            const spaces = { ...s.spaces };
            delete spaces[spaceId];
            const spaceViews = { ...s.spaceViews };
            delete spaceViews[spaceId];
            return {
              spaces,
              spaceViews,
              groups: omitWhere(s.groups, inSpace),
              tabs: omitWhere(s.tabs, inSpace),
              bookmarks: omitWhere(s.bookmarks, inSpace),
              bookmarkFolders: omitWhere(s.bookmarkFolders, inSpace),
              dashboards: omitWhere(s.dashboards, inSpace),
              activeSpaceId:
                s.activeSpaceId === spaceId ? (remaining[0] as Space).id : s.activeSpaceId,
            };
          }),

        reorderSpace: (spaceId, toIndex) =>
          set((s) => {
            const list = reorderList(sortedSpaces(s.spaces), spaceId, toIndex);
            return list ? { spaces: toRecord(s.spaces, list) } : s;
          }),

        showStart: (spaceId) => setView(spaceId ?? get().activeSpaceId, { kind: 'start' }),

        selectTab: (tabId) =>
          set((s) => {
            const tab = s.tabs[tabId];
            if (!tab) return s;
            return {
              activeSpaceId: tab.spaceId,
              tabs: { ...s.tabs, [tabId]: { ...tab, lastSelectedAt: Date.now() } },
              spaceViews: { ...s.spaceViews, [tab.spaceId]: { kind: 'tab', tabId } },
            };
          }),

        createTab: (input = {}) => {
          const state = get();
          const spaceId = input.spaceId ?? state.activeSpaceId;
          const pinned = input.pinned ?? false;
          const after = input.afterTabId ? state.tabs[input.afterTabId] : undefined;
          let groupId = pinned
            ? null
            : (input.groupId ?? (after && !after.pinned ? after.groupId : null));
          if (groupId && state.groups[groupId]?.spaceId !== spaceId) groupId = null;

          const url = input.url ?? '';
          const base = makeTab({
            spaceId,
            groupId,
            pinned,
            url,
            title: input.title ?? (url ? titleFromUrl(url) : 'New Tab'),
          });
          const tab = input.id && !state.tabs[input.id] ? { ...base, id: input.id } : base;
          const siblings = containerTabs(state.tabs, spaceId, pinned, groupId);
          const afterIndex = after ? siblings.findIndex((t) => t.id === after.id) : -1;
          siblings.splice(afterIndex >= 0 ? afterIndex + 1 : siblings.length, 0, tab);

          set((s) => ({
            tabs: withOrder({ ...s.tabs, [tab.id]: tab }, siblings),
          }));
          if (input.select !== false) get().selectTab(tab.id);
          return tab.id;
        },

        closeTab: (tabId) =>
          set((s) => {
            const tab = s.tabs[tabId];
            if (!tab) return s;
            const view = s.spaceViews[tab.spaceId];
            const spaceViews =
              view?.kind === 'tab' && view.tabId === tabId
                ? { ...s.spaceViews, [tab.spaceId]: fallbackView(s.tabs, tab) }
                : s.spaceViews;
            const tabs = { ...s.tabs };
            delete tabs[tabId];
            return { tabs, spaceViews };
          }),

        restoreTab: (closed) => {
          const state = get();
          if (!state.spaces[closed.spaceId]) return null;
          const id = state.tabs[closed.id] ? createId() : closed.id;
          const groupId =
            closed.groupId && state.groups[closed.groupId]?.spaceId === closed.spaceId
              ? closed.groupId
              : null;
          const tab: Tab = { ...closed, id, groupId: closed.pinned ? null : groupId };
          const siblings = containerTabs(state.tabs, tab.spaceId, tab.pinned, tab.groupId);
          siblings.splice(clamp(closed.order, 0, siblings.length), 0, tab);
          set((s) => ({ tabs: withOrder({ ...s.tabs, [id]: tab }, siblings) }));
          get().selectTab(id);
          return id;
        },

        duplicateTab: (tabId) => {
          const tab = get().tabs[tabId];
          if (!tab) return null;
          const id = get().createTab({
            spaceId: tab.spaceId,
            url: tab.url,
            title: tab.title,
            pinned: tab.pinned,
            groupId: tab.groupId,
            afterTabId: tab.id,
          });
          get().renameTab(id, tab.customTitle);
          return id;
        },

        setTabPinned: (tabId, pinned) => get().moveTab(tabId, { pinned, groupId: null }),

        renameTab: (tabId, customTitle) =>
          set((s) => {
            const tab = s.tabs[tabId];
            if (!tab) return s;
            const value = customTitle?.trim() || null;
            return { tabs: { ...s.tabs, [tabId]: { ...tab, customTitle: value } } };
          }),

        moveTab: (tabId, target) =>
          set((s) => {
            const tab = s.tabs[tabId];
            if (!tab) return s;
            const spaceId = target.spaceId ?? tab.spaceId;
            if (!s.spaces[spaceId]) return s;
            const sameSpace = spaceId === tab.spaceId;
            const pinned = target.pinned ?? (sameSpace ? tab.pinned : false);
            let groupId: ID | null = pinned
              ? null
              : target.groupId !== undefined
                ? target.groupId
                : sameSpace
                  ? tab.groupId
                  : null;
            if (groupId && s.groups[groupId]?.spaceId !== spaceId) groupId = null;

            const moved: Tab = { ...tab, spaceId, pinned, groupId };
            const destination = containerTabs(s.tabs, spaceId, pinned, groupId).filter(
              (t) => t.id !== tabId,
            );
            const index = clamp(target.index ?? destination.length, 0, destination.length);
            destination.splice(index, 0, moved);

            let tabs = withOrder({ ...s.tabs, [tabId]: moved }, destination);
            const sameContainer =
              sameSpace && tab.pinned === pinned && (pinned || tab.groupId === groupId);
            if (!sameContainer) {
              tabs = withOrder(tabs, containerTabs(tabs, tab.spaceId, tab.pinned, tab.groupId));
            }

            let spaceViews = s.spaceViews;
            const oldView = s.spaceViews[tab.spaceId];
            if (!sameSpace && oldView?.kind === 'tab' && oldView.tabId === tabId) {
              spaceViews = { ...spaceViews, [tab.spaceId]: fallbackView(s.tabs, tab) };
            }
            return { tabs, spaceViews };
          }),

        recordNavigation: (tabId, url, title) =>
          set((s) => {
            const tab = s.tabs[tabId];
            if (!tab) return s;
            const history = [...tab.history.slice(0, tab.historyIndex + 1), url].slice(
              -HISTORY_LIMIT,
            );
            return {
              tabs: {
                ...s.tabs,
                [tabId]: {
                  ...tab,
                  url,
                  title: title ?? titleFromUrl(url),
                  favicon: null,
                  history,
                  historyIndex: history.length - 1,
                },
              },
            };
          }),

        stepHistory: (tabId, delta) => {
          const tab = get().tabs[tabId];
          if (!tab) return null;
          const index = tab.historyIndex + delta;
          const url = tab.history[index];
          if (!url) return null;
          set((s) => ({
            tabs: {
              ...s.tabs,
              [tabId]: { ...tab, url, title: titleFromUrl(url), historyIndex: index },
            },
          }));
          return url;
        },

        syncNavigation: (tabId, url, options = {}) =>
          set((s) => {
            const tab = s.tabs[tabId];
            if (!tab || tab.url === url) return s;
            let history = tab.history;
            let historyIndex = tab.historyIndex;
            if (options.replace && historyIndex >= 0) {
              history = [...history];
              history[historyIndex] = url;
            } else if (history[historyIndex - 1] === url) {
              historyIndex -= 1;
            } else if (history[historyIndex + 1] === url) {
              historyIndex += 1;
            } else {
              history = [...history.slice(0, historyIndex + 1), url].slice(-HISTORY_LIMIT);
              historyIndex = history.length - 1;
            }
            const sameOrigin = tab.url !== '' && originOf(tab.url) === originOf(url);
            return {
              tabs: {
                ...s.tabs,
                [tabId]: {
                  ...tab,
                  url,
                  // Keep the old title until the engine reports the new one.
                  title: tab.title && tab.url ? tab.title : titleFromUrl(url),
                  favicon: sameOrigin ? tab.favicon : null,
                  history,
                  historyIndex,
                },
              },
            };
          }),

        setTabMeta: (tabId, meta) =>
          set((s) => {
            const tab = s.tabs[tabId];
            if (!tab) return s;
            const title = meta.title?.trim() ? meta.title.trim().slice(0, 300) : tab.title;
            const favicon =
              meta.favicon === undefined
                ? tab.favicon
                : meta.favicon && /^https?:/i.test(meta.favicon)
                  ? meta.favicon.slice(0, 2048)
                  : null;
            if (title === tab.title && favicon === tab.favicon) return s;
            return { tabs: { ...s.tabs, [tabId]: { ...tab, title, favicon } } };
          }),

        createGroup: ({ spaceId, name, icon, accent }) => {
          const id = createId();
          set((s) => {
            const targetSpace = spaceId ?? s.activeSpaceId;
            const group: Group = {
              id,
              spaceId: targetSpace,
              name: name.trim() || 'New group',
              icon,
              accent,
              order: nextOrder(groupsOfSpace(s.groups, targetSpace)),
              collapsed: false,
            };
            return { groups: { ...s.groups, [id]: group } };
          });
          return id;
        },

        updateGroup: (groupId, patch) =>
          set((s) => {
            const group = s.groups[groupId];
            if (!group) return s;
            const name = patch.name?.trim();
            return {
              groups: { ...s.groups, [groupId]: { ...group, ...patch, name: name || group.name } },
            };
          }),

        deleteGroup: (groupId, options = {}) =>
          set((s) => {
            const group = s.groups[groupId];
            if (!group) return s;
            const groups = { ...s.groups };
            delete groups[groupId];
            const members = containerTabs(s.tabs, group.spaceId, false, groupId);
            let tabs = { ...s.tabs };
            let spaceViews = s.spaceViews;

            if (options.closeTabs) {
              for (const tab of members) delete tabs[tab.id];
              const view = s.spaceViews[group.spaceId];
              if (view?.kind === 'tab' && members.some((t) => t.id === view.tabId)) {
                const survivor = tabsOfSpace(tabs, group.spaceId).sort(
                  (a, b) => b.lastSelectedAt - a.lastSelectedAt,
                )[0];
                spaceViews = {
                  ...spaceViews,
                  [group.spaceId]: survivor
                    ? { kind: 'tab', tabId: survivor.id }
                    : { kind: 'start' },
                };
              }
            } else {
              const ungrouped = containerTabs(s.tabs, group.spaceId, false, null);
              tabs = withOrder(
                tabs,
                [...ungrouped, ...members].map((t) => ({ ...t, groupId: null })),
              );
            }

            const dashboards = { ...s.dashboards };
            for (const d of Object.values(dashboards)) {
              if (d.spaceId !== group.spaceId) continue;
              dashboards[d.id] = {
                ...d,
                widgets: d.widgets.map((w) =>
                  w.kind === 'groupLauncher' && w.groupIds
                    ? { ...w, groupIds: w.groupIds.filter((id) => id !== groupId) }
                    : w,
                ),
              };
            }
            return { groups, tabs, spaceViews, dashboards };
          }),

        setGroupCollapsed: (groupId, collapsed) =>
          set((s) => {
            const group = s.groups[groupId];
            if (!group || group.collapsed === collapsed) return s;
            return { groups: { ...s.groups, [groupId]: { ...group, collapsed } } };
          }),

        reorderGroup: (groupId, toIndex) =>
          set((s) => {
            const group = s.groups[groupId];
            if (!group) return s;
            const list = reorderList(groupsOfSpace(s.groups, group.spaceId), groupId, toIndex);
            return list ? { groups: toRecord(s.groups, list) } : s;
          }),

        addBookmark: ({ url, title, spaceId, folderId = null }) => {
          const state = get();
          const target = spaceId ?? state.activeSpaceId;
          const folder = folderId ? state.bookmarkFolders[folderId] : undefined;
          const parent = folder && folder.spaceId === target ? folder.id : null;
          const siblings = bookmarksIn(state.bookmarks, target, parent);
          const existing = siblings.find((b) => urlKey(b.url) === urlKey(url));
          if (existing) return existing.id;
          const id = createId();
          const bookmark: Bookmark = {
            id,
            spaceId: target,
            folderId: parent,
            url,
            title: title.trim() || titleFromUrl(url),
            order: nextOrder(siblings),
            createdAt: Date.now(),
          };
          set((s) => ({ bookmarks: { ...s.bookmarks, [id]: bookmark } }));
          return id;
        },

        updateBookmark: (bookmarkId, patch) =>
          set((s) => {
            const bookmark = s.bookmarks[bookmarkId];
            if (!bookmark) return s;
            return { bookmarks: { ...s.bookmarks, [bookmarkId]: { ...bookmark, ...patch } } };
          }),

        removeBookmark: (bookmarkId) =>
          set((s) => {
            if (!s.bookmarks[bookmarkId]) return s;
            const bookmarks = { ...s.bookmarks };
            delete bookmarks[bookmarkId];
            return { bookmarks };
          }),

        restoreBookmark: (bookmark) =>
          set((s) => {
            if (!s.spaces[bookmark.spaceId]) return s;
            const folderOk =
              !bookmark.folderId ||
              s.bookmarkFolders[bookmark.folderId]?.spaceId === bookmark.spaceId;
            const restored = { ...bookmark, folderId: folderOk ? bookmark.folderId : null };
            const siblings = bookmarksIn(s.bookmarks, restored.spaceId, restored.folderId).filter(
              (b) => b.id !== restored.id,
            );
            siblings.splice(clamp(bookmark.order, 0, siblings.length), 0, restored);
            return { bookmarks: toRecord(s.bookmarks, renumber(siblings)) };
          }),

        moveBookmark: (bookmarkId, { folderId, index }) =>
          set((s) => {
            const bookmark = s.bookmarks[bookmarkId];
            if (!bookmark) return s;
            if (folderId && s.bookmarkFolders[folderId]?.spaceId !== bookmark.spaceId) return s;
            const moved = { ...bookmark, folderId };
            const destination = bookmarksIn(s.bookmarks, bookmark.spaceId, folderId).filter(
              (b) => b.id !== bookmarkId,
            );
            destination.splice(clamp(index ?? destination.length, 0, destination.length), 0, moved);
            let bookmarks = toRecord(
              { ...s.bookmarks, [bookmarkId]: moved },
              renumber(destination),
            );
            if (bookmark.folderId !== folderId) {
              bookmarks = toRecord(
                bookmarks,
                renumber(bookmarksIn(bookmarks, bookmark.spaceId, bookmark.folderId)),
              );
            }
            return { bookmarks };
          }),

        showBookmarks: (folderId, spaceId) => {
          const state = get();
          const folder = folderId ? state.bookmarkFolders[folderId] : undefined;
          const target = folder?.spaceId ?? spaceId ?? state.activeSpaceId;
          set((s) => {
            // Reveal the folder in the tree by expanding its ancestors.
            const bookmarkFolders = { ...s.bookmarkFolders };
            for (const ancestor of folderPath(s.bookmarkFolders, folder?.parentId ?? null)) {
              if (ancestor.collapsed)
                bookmarkFolders[ancestor.id] = { ...ancestor, collapsed: false };
            }
            return {
              activeSpaceId: target,
              bookmarkFolders,
              spaceViews: {
                ...s.spaceViews,
                [target]: { kind: 'bookmarks', folderId: folder ? folder.id : null },
              },
            };
          });
        },

        createFolder: ({ spaceId, parentId, name, icon, accent }) => {
          const id = createId();
          set((s) => {
            const parent = parentId ? s.bookmarkFolders[parentId] : undefined;
            const target = parent?.spaceId ?? spaceId ?? s.activeSpaceId;
            const parentKey = parent ? parent.id : null;
            const folder: BookmarkFolder = {
              id,
              spaceId: target,
              parentId: parentKey,
              name: name.trim() || 'New folder',
              icon,
              accent,
              order: nextOrder(foldersIn(s.bookmarkFolders, target, parentKey)),
              collapsed: true,
              createdAt: Date.now(),
            };
            return { bookmarkFolders: { ...s.bookmarkFolders, [id]: folder } };
          });
          return id;
        },

        updateFolder: (folderId, patch) =>
          set((s) => {
            const folder = s.bookmarkFolders[folderId];
            if (!folder) return s;
            const name = patch.name?.trim();
            return {
              bookmarkFolders: {
                ...s.bookmarkFolders,
                [folderId]: { ...folder, ...patch, name: name || folder.name },
              },
            };
          }),

        moveFolder: (folderId, parentId, index) => {
          const state = get();
          const folder = state.bookmarkFolders[folderId];
          if (!folder) return false;
          if (parentId) {
            const parent = state.bookmarkFolders[parentId];
            if (!parent || parent.spaceId !== folder.spaceId) return false;
            if (descendantFolderIds(state.bookmarkFolders, folderId).has(parentId)) return false;
          }
          set((s) => {
            const moved = { ...folder, parentId };
            const siblings = foldersIn(s.bookmarkFolders, folder.spaceId, parentId).filter(
              (f) => f.id !== folderId,
            );
            siblings.splice(clamp(index ?? siblings.length, 0, siblings.length), 0, moved);
            let bookmarkFolders = toRecord(
              { ...s.bookmarkFolders, [folderId]: moved },
              renumber(siblings),
            );
            if (folder.parentId !== parentId) {
              bookmarkFolders = toRecord(
                bookmarkFolders,
                renumber(foldersIn(bookmarkFolders, folder.spaceId, folder.parentId)),
              );
            }
            return { bookmarkFolders };
          });
          return true;
        },

        deleteFolder: (folderId, options = {}) =>
          set((s) => {
            const folder = s.bookmarkFolders[folderId];
            if (!folder) return s;
            const parentId = folder.parentId;
            let bookmarkFolders = { ...s.bookmarkFolders };
            let bookmarks = { ...s.bookmarks };
            let removed: Set<ID>;

            if (options.deleteContents) {
              removed = descendantFolderIds(s.bookmarkFolders, folderId);
              for (const id of removed) delete bookmarkFolders[id];
              bookmarks = omitWhere(
                bookmarks,
                (b) => b.folderId !== null && removed.has(b.folderId),
              );
            } else {
              removed = new Set([folderId]);
              delete bookmarkFolders[folderId];
              const childFolders = foldersIn(s.bookmarkFolders, folder.spaceId, folderId);
              const parentFolders = foldersIn(bookmarkFolders, folder.spaceId, parentId);
              bookmarkFolders = toRecord(
                bookmarkFolders,
                renumber([...parentFolders, ...childFolders.map((f) => ({ ...f, parentId }))]),
              );
              const childMarks = bookmarksIn(s.bookmarks, folder.spaceId, folderId);
              const parentMarks = bookmarksIn(s.bookmarks, folder.spaceId, parentId);
              bookmarks = toRecord(
                bookmarks,
                renumber([
                  ...parentMarks,
                  ...childMarks.map((b) => ({ ...b, folderId: parentId })),
                ]),
              );
            }

            const view = s.spaceViews[folder.spaceId];
            const spaceViews =
              view?.kind === 'bookmarks' && view.folderId && removed.has(view.folderId)
                ? {
                    ...s.spaceViews,
                    [folder.spaceId]: { kind: 'bookmarks' as const, folderId: parentId },
                  }
                : s.spaceViews;

            const affected = (w: Widget) =>
              w.kind === 'bookmarks' && w.folderId !== null && removed.has(w.folderId);
            const dashboards = { ...s.dashboards };
            for (const d of Object.values(dashboards)) {
              if (!d.widgets.some(affected)) continue;
              dashboards[d.id] = {
                ...d,
                widgets: d.widgets.map((w) =>
                  affected(w) && w.kind === 'bookmarks' ? { ...w, folderId: parentId } : w,
                ),
              };
            }
            return { bookmarkFolders, bookmarks, spaceViews, dashboards };
          }),

        importBookmarks: (nodes, { spaceId, parentId }) => {
          const state = get();
          const parent = parentId ? state.bookmarkFolders[parentId] : undefined;
          const target = parent?.spaceId ?? spaceId ?? state.activeSpaceId;
          const rootId = parent ? parent.id : null;
          const now = Date.now();
          const newFolders: Record<ID, BookmarkFolder> = {};
          const newBookmarks: Record<ID, Bookmark> = {};
          let folderCount = 0;
          let bookmarkCount = 0;

          const add = (
            list: ImportNode[],
            into: ID | null,
            folderStart: number,
            markStart: number,
          ) => {
            let folderOrder = folderStart;
            let markOrder = markStart;
            for (const node of list) {
              const id = createId();
              if (node.type === 'folder') {
                newFolders[id] = {
                  id,
                  spaceId: target,
                  parentId: into,
                  name: node.name,
                  icon: 'folder',
                  accent: 'slate',
                  order: folderOrder++,
                  collapsed: true,
                  createdAt: now,
                };
                folderCount += 1;
                add(node.children, id, 0, 0);
              } else {
                newBookmarks[id] = {
                  id,
                  spaceId: target,
                  folderId: into,
                  title: node.title,
                  url: node.url,
                  order: markOrder++,
                  createdAt: now,
                };
                bookmarkCount += 1;
              }
            }
          };
          add(
            nodes,
            rootId,
            nextOrder(foldersIn(state.bookmarkFolders, target, rootId)),
            nextOrder(bookmarksIn(state.bookmarks, target, rootId)),
          );

          set((s) => ({
            bookmarkFolders: { ...s.bookmarkFolders, ...newFolders },
            bookmarks: { ...s.bookmarks, ...newBookmarks },
          }));
          return { folders: folderCount, bookmarks: bookmarkCount };
        },

        createDashboard: (name, spaceId) => {
          const id = createId();
          set((s) => {
            const target = spaceId ?? s.activeSpaceId;
            const dashboard: Dashboard = {
              id,
              spaceId: target,
              name: name.trim() || 'New dashboard',
              icon: 'dashboard',
              order: nextOrder(dashboardsOfSpace(s.dashboards, target)),
              createdAt: Date.now(),
              widgets: [newWidget('bookmarks'), newWidget('recentTabs')],
            };
            return {
              dashboards: { ...s.dashboards, [id]: dashboard },
              activeSpaceId: target,
              spaceViews: { ...s.spaceViews, [target]: { kind: 'dashboard', dashboardId: id } },
            };
          });
          return id;
        },

        renameDashboard: (dashboardId, name) =>
          set((s) =>
            name.trim() ? mapDashboard(s, dashboardId, (d) => ({ ...d, name: name.trim() })) : s,
          ),

        deleteDashboard: (dashboardId) =>
          set((s) => {
            const dashboard = s.dashboards[dashboardId];
            if (!dashboard) return s;
            const dashboards = { ...s.dashboards };
            delete dashboards[dashboardId];
            const view = s.spaceViews[dashboard.spaceId];
            const spaceViews =
              view?.kind === 'dashboard' && view.dashboardId === dashboardId
                ? { ...s.spaceViews, [dashboard.spaceId]: { kind: 'start' } as const }
                : s.spaceViews;
            return { dashboards, spaceViews };
          }),

        reorderDashboard: (dashboardId, toIndex) =>
          set((s) => {
            const dashboard = s.dashboards[dashboardId];
            if (!dashboard) return s;
            const list = reorderList(
              dashboardsOfSpace(s.dashboards, dashboard.spaceId),
              dashboardId,
              toIndex,
            );
            return list ? { dashboards: toRecord(s.dashboards, list) } : s;
          }),

        openDashboard: (dashboardId) => {
          const dashboard = get().dashboards[dashboardId];
          if (!dashboard) return;
          set((s) => ({
            activeSpaceId: dashboard.spaceId,
            spaceViews: {
              ...s.spaceViews,
              [dashboard.spaceId]: { kind: 'dashboard', dashboardId },
            },
          }));
        },

        addWidget: (dashboardId, kind) =>
          set((s) =>
            mapDashboard(s, dashboardId, (d) => ({
              ...d,
              widgets: [...d.widgets, newWidget(kind)],
            })),
          ),

        updateWidget: (dashboardId, widgetId, patch) =>
          set((s) =>
            mapWidget(s, dashboardId, widgetId, (w) => {
              const next: Widget = {
                ...w,
                title: patch.title?.trim() || w.title,
                layout: patch.colSpan ? { ...w.layout, colSpan: patch.colSpan } : w.layout,
              };
              if (next.kind === 'recentTabs' && patch.limit !== undefined) {
                return { ...next, limit: clamp(patch.limit, 1, 20) };
              }
              if (next.kind === 'bookmarks' && patch.folderId !== undefined) {
                const folder = patch.folderId ? s.bookmarkFolders[patch.folderId] : undefined;
                return { ...next, folderId: folder ? folder.id : null };
              }
              if (next.kind === 'groupLauncher' && patch.groupIds !== undefined) {
                return { ...next, groupIds: patch.groupIds };
              }
              return next;
            }),
          ),

        removeWidget: (dashboardId, widgetId) =>
          set((s) =>
            mapDashboard(s, dashboardId, (d) => ({
              ...d,
              widgets: d.widgets.filter((w) => w.id !== widgetId),
            })),
          ),

        reorderWidget: (dashboardId, widgetId, toIndex) =>
          set((s) =>
            mapDashboard(s, dashboardId, (d) => {
              const from = d.widgets.findIndex((w) => w.id === widgetId);
              if (from < 0) return d;
              const widgets = [...d.widgets];
              const [widget] = widgets.splice(from, 1);
              widgets.splice(clamp(toIndex, 0, widgets.length), 0, widget as Widget);
              return { ...d, widgets };
            }),
          ),

        addQuickLink: (dashboardId, widgetId, link) =>
          set((s) =>
            mapWidget(s, dashboardId, widgetId, (w) =>
              w.kind === 'quickLinks'
                ? { ...w, links: [...w.links, { ...link, id: createId() }] }
                : w,
            ),
          ),

        removeQuickLink: (dashboardId, widgetId, linkId) =>
          set((s) =>
            mapWidget(s, dashboardId, widgetId, (w) =>
              w.kind === 'quickLinks' ? { ...w, links: w.links.filter((l) => l.id !== linkId) } : w,
            ),
          ),

        replaceAll: (data) => set(pickWorkspaceData(data)),

        reset: () => set(createDefaultWorkspace()),
      };
    },
    {
      name: WORKSPACE_STORAGE_KEY,
      version: WORKSPACE_SCHEMA_VERSION,
      storage: createSafeStorage<WorkspaceData>(),
      partialize: pickWorkspaceData,
      migrate: (persisted, version) => migrateWorkspace(persisted, version) as WorkspaceData,
      merge: (persisted, current) => {
        const result = sanitizeWorkspace(persisted);
        if (!result) return current;
        if (result.dropped > 0) {
          console.warn(`[vela] Ignored ${result.dropped} invalid stored record(s).`);
        }
        return { ...current, ...result.data };
      },
    },
  ),
);

export function findTabByUrl(state: WorkspaceData, spaceId: ID, url: string): Tab | undefined {
  const key = urlKey(url);
  return tabsOfSpace(state.tabs, spaceId).find((t) => t.url && urlKey(t.url) === key);
}
