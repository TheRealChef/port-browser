import type { PersistStorage, StorageValue } from 'zustand/middleware';
import {
  ACCENT_COLORS,
  SEARCH_ENGINES,
  WIDGET_KINDS,
  type Bookmark,
  type BookmarkFolder,
  type Dashboard,
  type Group,
  type ID,
  type QuickLink,
  type Settings,
  type Space,
  type SpaceView,
  type Tab,
  type Widget,
  type WorkspaceData,
} from '../types/models';
import { toSafeHttpUrl } from '../utils/url';
import {
  asBoolean,
  asNumber,
  asOneOf,
  asString,
  clamp,
  isNonEmptyString,
  isRecord,
  recordValues,
} from '../utils/validate';
import { createId } from '../utils/misc';

export const WORKSPACE_STORAGE_KEY = 'vela:workspace';
export const SETTINGS_STORAGE_KEY = 'vela:settings';
export const WORKSPACE_SCHEMA_VERSION = 3;
export const SETTINGS_SCHEMA_VERSION = 1;

export const SIDEBAR_MIN = 200;
export const SIDEBAR_MAX = 420;
export const SIDEBAR_DEFAULT = 260;

/**
 * localStorage wrapper that never throws. Unparseable data is copied to a
 * backup key so a corrupted write never silently destroys the user's setup.
 */
export function createSafeStorage<S>(): PersistStorage<S> {
  return {
    getItem(name) {
      let raw: string | null = null;
      try {
        raw = localStorage.getItem(name);
        if (raw === null) return null;
        const parsed: unknown = JSON.parse(raw);
        if (!isRecord(parsed)) throw new Error('Stored value is not an object');
        return parsed as unknown as StorageValue<S>;
      } catch (error) {
        console.warn(`[vela] Could not read "${name}"; starting from defaults.`, error);
        try {
          if (raw !== null) localStorage.setItem(`${name}:corrupt-backup`, raw);
        } catch {
          /* storage full or unavailable */
        }
        return null;
      }
    },
    setItem(name, value) {
      try {
        localStorage.setItem(name, JSON.stringify(value));
      } catch (error) {
        console.warn(`[vela] Could not save "${name}".`, error);
      }
    },
    removeItem(name) {
      try {
        localStorage.removeItem(name);
      } catch {
        /* ignore */
      }
    },
  };
}

type Migration = (state: Record<string, unknown>) => Record<string, unknown>;

/**
 * Schema migrations keyed by the version they upgrade *from*.
 * Add an entry here whenever WORKSPACE_SCHEMA_VERSION is bumped.
 */
const WORKSPACE_MIGRATIONS: Record<number, Migration> = {
  0: (state) => state,
  // v2 introduced bookmark folders; existing bookmarks move to the top level.
  1: (state) => ({
    ...state,
    bookmarkFolders: isRecord(state.bookmarkFolders) ? state.bookmarkFolders : {},
    bookmarks: Object.fromEntries(
      Object.entries(isRecord(state.bookmarks) ? state.bookmarks : {}).map(([id, b]) => [
        id,
        isRecord(b) ? { ...b, folderId: null } : b,
      ]),
    ),
  }),
  // v3 (Mineral Slate): the seeded spaces move to their semantic colors (Work = sage,
  // Personal = clay). Only spaces still on the old default color are changed.
  2: (state) => {
    if (!isRecord(state.spaces)) return state;
    const recolor: Record<string, [string, string]> = {
      Work: ['violet', 'green'],
      Personal: ['teal', 'orange'],
    };
    const spaces = Object.fromEntries(
      Object.entries(state.spaces).map(([id, space]) => {
        if (!isRecord(space) || typeof space.name !== 'string') return [id, space];
        const rule = recolor[space.name];
        return [id, rule && space.accent === rule[0] ? { ...space, accent: rule[1] } : space];
      }),
    );
    return { ...state, spaces };
  },
};

export function migrateWorkspace(persisted: unknown, fromVersion: number): unknown {
  if (!isRecord(persisted)) return persisted;
  let state = persisted;
  for (let v = fromVersion; v < WORKSPACE_SCHEMA_VERSION; v += 1) {
    const step = WORKSPACE_MIGRATIONS[v];
    if (step) state = step(state);
  }
  return state;
}

const ids = (value: unknown): value is ID => isNonEmptyString(value);

const httpUrlOrNull = (value: unknown): string | null =>
  typeof value === 'string' ? toSafeHttpUrl(value) : null;

function parseSpace(raw: unknown, index: number): Space | null {
  if (!isRecord(raw) || !ids(raw.id) || !isNonEmptyString(raw.name)) return null;
  return {
    id: raw.id,
    name: raw.name.slice(0, 80),
    icon: asString(raw.icon, 'folder'),
    accent: asOneOf(raw.accent, ACCENT_COLORS, 'violet'),
    order: asNumber(raw.order, index),
    createdAt: asNumber(raw.createdAt, Date.now()),
  };
}

function parseGroup(raw: unknown, index: number): Group | null {
  if (!isRecord(raw) || !ids(raw.id) || !ids(raw.spaceId) || !isNonEmptyString(raw.name)) {
    return null;
  }
  return {
    id: raw.id,
    spaceId: raw.spaceId,
    name: raw.name.slice(0, 80),
    icon: asString(raw.icon, 'folder'),
    accent: asOneOf(raw.accent, ACCENT_COLORS, 'violet'),
    order: asNumber(raw.order, index),
    collapsed: asBoolean(raw.collapsed, false),
  };
}

function parseTab(raw: unknown, index: number): Tab | null {
  if (!isRecord(raw) || !ids(raw.id) || !ids(raw.spaceId)) return null;
  const rawUrl = asString(raw.url, '');
  const url = rawUrl === '' ? '' : httpUrlOrNull(rawUrl);
  if (url === null) return null;

  const history = (Array.isArray(raw.history) ? raw.history : [])
    .map(httpUrlOrNull)
    .filter((u): u is string => u !== null)
    .slice(-50);
  const historyIndex = clamp(
    asNumber(raw.historyIndex, history.length - 1),
    -1,
    history.length - 1,
  );
  const pinned = asBoolean(raw.pinned, false);

  return {
    id: raw.id,
    spaceId: raw.spaceId,
    groupId: !pinned && ids(raw.groupId) ? raw.groupId : null,
    title: asString(raw.title, 'New Tab').slice(0, 300),
    customTitle: isNonEmptyString(raw.customTitle) ? raw.customTitle.slice(0, 300) : null,
    url,
    favicon: httpUrlOrNull(raw.favicon),
    pinned,
    order: asNumber(raw.order, index),
    createdAt: asNumber(raw.createdAt, Date.now()),
    lastSelectedAt: asNumber(raw.lastSelectedAt, 0),
    history: history.length ? history : url ? [url] : [],
    historyIndex: history.length ? historyIndex : url ? 0 : -1,
  };
}

function parseBookmark(raw: unknown, index: number): Bookmark | null {
  if (!isRecord(raw) || !ids(raw.id) || !ids(raw.spaceId)) return null;
  const url = httpUrlOrNull(raw.url);
  if (!url) return null;
  return {
    id: raw.id,
    spaceId: raw.spaceId,
    folderId: ids(raw.folderId) ? raw.folderId : null,
    title: asString(raw.title, url).slice(0, 300),
    url,
    order: asNumber(raw.order, index),
    createdAt: asNumber(raw.createdAt, Date.now()),
  };
}

function parseFolder(raw: unknown, index: number): BookmarkFolder | null {
  if (!isRecord(raw) || !ids(raw.id) || !ids(raw.spaceId) || !isNonEmptyString(raw.name)) {
    return null;
  }
  return {
    id: raw.id,
    spaceId: raw.spaceId,
    parentId: ids(raw.parentId) ? raw.parentId : null,
    name: raw.name.slice(0, 120),
    icon: asString(raw.icon, 'folder'),
    accent: asOneOf(raw.accent, ACCENT_COLORS, 'slate'),
    order: asNumber(raw.order, index),
    collapsed: asBoolean(raw.collapsed, true),
    createdAt: asNumber(raw.createdAt, Date.now()),
  };
}

/** Drops parents in another space or missing, and breaks any parent cycles. */
function repairFolderTree(folders: Record<ID, BookmarkFolder>): void {
  for (const folder of Object.values(folders)) {
    const parent = folder.parentId ? folders[folder.parentId] : undefined;
    if (folder.parentId && (!parent || parent.spaceId !== folder.spaceId)) folder.parentId = null;
  }
  for (const folder of Object.values(folders)) {
    const seen = new Set<ID>([folder.id]);
    let cursor = folder.parentId ? folders[folder.parentId] : undefined;
    while (cursor) {
      if (seen.has(cursor.id)) {
        folder.parentId = null;
        break;
      }
      seen.add(cursor.id);
      cursor = cursor.parentId ? folders[cursor.parentId] : undefined;
    }
  }
}

function parseQuickLink(raw: unknown): QuickLink | null {
  if (!isRecord(raw)) return null;
  const url = httpUrlOrNull(raw.url);
  if (!url) return null;
  return {
    id: ids(raw.id) ? raw.id : createId(),
    title: asString(raw.title, url).slice(0, 300),
    url,
  };
}

function parseWidget(raw: unknown): Widget | null {
  if (!isRecord(raw) || !ids(raw.id)) return null;
  const kind = asOneOf(raw.kind, WIDGET_KINDS, 'bookmarks');
  if (raw.kind !== kind) return null;
  const layoutRaw = isRecord(raw.layout) ? raw.layout : {};
  const base = {
    id: raw.id,
    title: asString(raw.title, 'Widget').slice(0, 80),
    layout: { colSpan: layoutRaw.colSpan === 2 ? (2 as const) : (1 as const) },
  };
  switch (kind) {
    case 'bookmarks':
      return { ...base, kind, folderId: ids(raw.folderId) ? raw.folderId : null };
    case 'quickLinks':
      return {
        ...base,
        kind,
        links: recordValues(raw.links)
          .map(parseQuickLink)
          .filter((l): l is QuickLink => l !== null),
      };
    case 'recentTabs':
      return { ...base, kind, limit: clamp(Math.round(asNumber(raw.limit, 6)), 1, 20) };
    case 'groupLauncher':
      return {
        ...base,
        kind,
        groupIds: Array.isArray(raw.groupIds) ? raw.groupIds.filter(ids) : null,
      };
  }
}

function parseDashboard(raw: unknown, index: number): Dashboard | null {
  if (!isRecord(raw) || !ids(raw.id) || !ids(raw.spaceId) || !isNonEmptyString(raw.name)) {
    return null;
  }
  return {
    id: raw.id,
    spaceId: raw.spaceId,
    name: raw.name.slice(0, 80),
    icon: asString(raw.icon, 'dashboard'),
    order: asNumber(raw.order, index),
    createdAt: asNumber(raw.createdAt, Date.now()),
    widgets: recordValues(raw.widgets)
      .map(parseWidget)
      .filter((w): w is Widget => w !== null),
  };
}

function collect<T extends { id: ID }>(
  raw: unknown,
  parse: (value: unknown, index: number) => T | null,
  accept: (item: T) => boolean = () => true,
): { items: Record<ID, T>; dropped: number } {
  const items: Record<ID, T> = {};
  let dropped = 0;
  recordValues(raw).forEach((value, index) => {
    const item = parse(value, index);
    if (item && !items[item.id] && accept(item)) items[item.id] = item;
    else dropped += 1;
  });
  return { items, dropped };
}

export interface SanitizeResult {
  data: WorkspaceData;
  dropped: number;
}

/**
 * Validates persisted or imported workspace data record by record. Invalid
 * records are dropped and broken references repaired, so one bad entry never
 * costs the user their whole workspace. Returns null if no usable space remains.
 */
export function sanitizeWorkspace(raw: unknown): SanitizeResult | null {
  if (!isRecord(raw)) return null;

  const spaces = collect(raw.spaces, parseSpace);
  if (Object.keys(spaces.items).length === 0) return null;
  const hasSpace = (id: ID) => Boolean(spaces.items[id]);

  const groups = collect(raw.groups, parseGroup, (g) => hasSpace(g.spaceId));
  const tabs = collect(raw.tabs, parseTab, (t) => hasSpace(t.spaceId));
  for (const tab of Object.values(tabs.items)) {
    const group = tab.groupId ? groups.items[tab.groupId] : undefined;
    if (tab.groupId && (!group || group.spaceId !== tab.spaceId)) tab.groupId = null;
  }
  const folders = collect(raw.bookmarkFolders, parseFolder, (f) => hasSpace(f.spaceId));
  repairFolderTree(folders.items);
  const bookmarks = collect(raw.bookmarks, parseBookmark, (b) => hasSpace(b.spaceId));
  for (const bookmark of Object.values(bookmarks.items)) {
    const folder = bookmark.folderId ? folders.items[bookmark.folderId] : undefined;
    if (bookmark.folderId && (!folder || folder.spaceId !== bookmark.spaceId)) {
      bookmark.folderId = null;
    }
  }
  const dashboards = collect(raw.dashboards, parseDashboard, (d) => hasSpace(d.spaceId));
  for (const dashboard of Object.values(dashboards.items)) {
    for (const widget of dashboard.widgets) {
      if (widget.kind === 'bookmarks' && widget.folderId) {
        const folder = folders.items[widget.folderId];
        if (!folder || folder.spaceId !== dashboard.spaceId) widget.folderId = null;
      }
    }
  }

  const firstSpace = Object.values(spaces.items).sort((a, b) => a.order - b.order)[0] as Space;
  const activeSpaceId =
    ids(raw.activeSpaceId) && hasSpace(raw.activeSpaceId) ? raw.activeSpaceId : firstSpace.id;

  const rawViews = isRecord(raw.spaceViews) ? raw.spaceViews : {};
  const spaceViews: Record<ID, SpaceView> = {};
  for (const spaceId of Object.keys(spaces.items)) {
    spaceViews[spaceId] = parseView(
      rawViews[spaceId],
      spaceId,
      tabs.items,
      dashboards.items,
      folders.items,
    );
  }

  return {
    data: {
      spaces: spaces.items,
      groups: groups.items,
      tabs: tabs.items,
      bookmarks: bookmarks.items,
      bookmarkFolders: folders.items,
      dashboards: dashboards.items,
      activeSpaceId,
      spaceViews,
    },
    dropped:
      spaces.dropped +
      groups.dropped +
      tabs.dropped +
      bookmarks.dropped +
      folders.dropped +
      dashboards.dropped,
  };
}

function parseView(
  raw: unknown,
  spaceId: ID,
  tabs: Record<ID, Tab>,
  dashboards: Record<ID, Dashboard>,
  folders: Record<ID, BookmarkFolder>,
): SpaceView {
  if (isRecord(raw)) {
    if (raw.kind === 'tab' && ids(raw.tabId) && tabs[raw.tabId]?.spaceId === spaceId) {
      return { kind: 'tab', tabId: raw.tabId };
    }
    if (
      raw.kind === 'dashboard' &&
      ids(raw.dashboardId) &&
      dashboards[raw.dashboardId]?.spaceId === spaceId
    ) {
      return { kind: 'dashboard', dashboardId: raw.dashboardId };
    }
    if (raw.kind === 'bookmarks') {
      const folderId =
        ids(raw.folderId) && folders[raw.folderId]?.spaceId === spaceId ? raw.folderId : null;
      return { kind: 'bookmarks', folderId };
    }
  }
  return { kind: 'start' };
}

export const DEFAULT_SETTINGS: Settings = {
  sidebarWidth: SIDEBAR_DEFAULT,
  sidebarCollapsed: false,
  accentMode: 'space',
  fixedAccent: 'green',
  density: 'comfortable',
  reduceMotion: false,
  defaultSpaceId: null,
  restoreBehavior: 'restore',
  searchEngine: 'duckduckgo',
  bookmarkLayout: 'grid',
  bookmarkTileSize: 'md',
  bookmarkShowNested: false,
  recordHistory: true,
};

export function sanitizeSettings(raw: unknown): Settings {
  if (!isRecord(raw)) return { ...DEFAULT_SETTINGS };
  const d = DEFAULT_SETTINGS;
  return {
    sidebarWidth: clamp(
      Math.round(asNumber(raw.sidebarWidth, d.sidebarWidth)),
      SIDEBAR_MIN,
      SIDEBAR_MAX,
    ),
    sidebarCollapsed: asBoolean(raw.sidebarCollapsed, d.sidebarCollapsed),
    accentMode: asOneOf(raw.accentMode, ['space', 'fixed'] as const, d.accentMode),
    fixedAccent: asOneOf(raw.fixedAccent, ACCENT_COLORS, d.fixedAccent),
    density: asOneOf(raw.density, ['compact', 'comfortable'] as const, d.density),
    reduceMotion: asBoolean(raw.reduceMotion, d.reduceMotion),
    defaultSpaceId: ids(raw.defaultSpaceId) ? raw.defaultSpaceId : null,
    restoreBehavior: asOneOf(
      raw.restoreBehavior,
      ['restore', 'defaultSpace'] as const,
      d.restoreBehavior,
    ),
    searchEngine: asOneOf(raw.searchEngine, SEARCH_ENGINES, d.searchEngine),
    bookmarkLayout: asOneOf(raw.bookmarkLayout, ['grid', 'list'] as const, d.bookmarkLayout),
    bookmarkTileSize: asOneOf(
      raw.bookmarkTileSize,
      ['sm', 'md', 'lg'] as const,
      d.bookmarkTileSize,
    ),
    bookmarkShowNested: asBoolean(raw.bookmarkShowNested, d.bookmarkShowNested),
    recordHistory: asBoolean(raw.recordHistory, d.recordHistory),
  };
}

export interface ExportEnvelope {
  app: 'vela';
  schemaVersion: number;
  exportedAt: string;
  workspace: WorkspaceData;
  settings: Settings;
}

export function buildExport(workspace: WorkspaceData, settings: Settings): ExportEnvelope {
  return {
    app: 'vela',
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    workspace,
    settings,
  };
}

export type ImportResult =
  | { ok: true; workspace: WorkspaceData; settings: Settings; dropped: number }
  | { ok: false; error: string };

/** Parses an exported configuration. Only plain JSON data is accepted. */
export function parseImport(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'The file is not valid JSON.' };
  }
  if (!isRecord(parsed) || parsed.app !== 'vela') {
    return { ok: false, error: 'This file is not a Port configuration export.' };
  }
  const version = asNumber(parsed.schemaVersion, -1);
  if (version < 0) return { ok: false, error: 'The export is missing its schema version.' };
  if (version > WORKSPACE_SCHEMA_VERSION) {
    return { ok: false, error: 'This export was created by a newer version of Port.' };
  }
  const result = sanitizeWorkspace(migrateWorkspace(parsed.workspace, version));
  if (!result) return { ok: false, error: 'The export does not contain any valid spaces.' };
  const settings = sanitizeSettings(parsed.settings);
  if (settings.defaultSpaceId && !result.data.spaces[settings.defaultSpaceId]) {
    settings.defaultSpaceId = null;
  }
  return { ok: true, workspace: result.data, settings, dropped: result.dropped };
}
