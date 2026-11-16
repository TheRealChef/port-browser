export type ID = string;

/**
 * Port UI workspace hues. Violet (AI only), amber (warning), coral (error) and
 * mineral (success) are signals and never colour a space, group or folder.
 */
export const ACCENT_COLORS = [
  'brand',
  'cobalt',
  'teal',
  'lichen',
  'clay',
  'heather',
  'graphite',
] as const;
export type AccentColor = (typeof ACCENT_COLORS)[number];

/** Colours saved before Port UI, mapped to the nearest workspace hue. */
export const LEGACY_ACCENTS: Record<string, AccentColor> = {
  violet: 'heather',
  blue: 'cobalt',
  teal: 'teal',
  green: 'brand',
  amber: 'lichen',
  orange: 'clay',
  rose: 'heather',
  slate: 'graphite',
};

export interface Space {
  id: ID;
  name: string;
  icon: string;
  accent: AccentColor;
  order: number;
  createdAt: number;
}

export interface Group {
  id: ID;
  spaceId: ID;
  name: string;
  icon: string;
  accent: AccentColor;
  order: number;
  collapsed: boolean;
}

/** A tab with an empty `url` is a "new tab" and renders the space start page. */
export interface Tab {
  id: ID;
  spaceId: ID;
  /** Always null while pinned: pinned tabs live in their own section. */
  groupId: ID | null;
  title: string;
  /** User-chosen display title; overrides `title` when set. */
  customTitle: string | null;
  url: string;
  favicon: string | null;
  pinned: boolean;
  order: number;
  createdAt: number;
  lastSelectedAt: number;
  /** Vela-managed navigation history. A native host would keep this in sync with the engine. */
  history: string[];
  historyIndex: number;
}

export interface Bookmark {
  id: ID;
  spaceId: ID;
  /** Containing folder, or null for the space's top level. */
  folderId: ID | null;
  title: string;
  url: string;
  order: number;
  createdAt: number;
}

/** Bookmark folders nest without limit; `parentId` null means top level. */
export interface BookmarkFolder {
  id: ID;
  spaceId: ID;
  parentId: ID | null;
  name: string;
  icon: string;
  accent: AccentColor;
  order: number;
  /** Collapsed in the folder tree. */
  collapsed: boolean;
  createdAt: number;
}

export const WIDGET_KINDS = ['bookmarks', 'quickLinks', 'recentTabs', 'groupLauncher'] as const;
export type WidgetKind = (typeof WIDGET_KINDS)[number];

/**
 * Layout hints for a widget. v0.1 only uses `colSpan`; the optional grid
 * coordinates are reserved for drag-resize layout editing.
 */
export interface WidgetLayout {
  colSpan: 1 | 2;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

export interface QuickLink {
  id: ID;
  title: string;
  url: string;
}

interface WidgetBase {
  id: ID;
  title: string;
  layout: WidgetLayout;
}

/** Shows a folder's bookmarks; `folderId` null means the top level. */
export type BookmarksWidget = WidgetBase & { kind: 'bookmarks'; folderId: ID | null };
export type QuickLinksWidget = WidgetBase & { kind: 'quickLinks'; links: QuickLink[] };
export type RecentTabsWidget = WidgetBase & { kind: 'recentTabs'; limit: number };
export type GroupLauncherWidget = WidgetBase & { kind: 'groupLauncher'; groupIds: ID[] | null };

export type Widget = BookmarksWidget | QuickLinksWidget | RecentTabsWidget | GroupLauncherWidget;

export interface Dashboard {
  id: ID;
  spaceId: ID;
  name: string;
  icon: string;
  order: number;
  createdAt: number;
  widgets: Widget[];
}

export type SpaceView =
  | { kind: 'start' }
  | { kind: 'tab'; tabId: ID }
  | { kind: 'dashboard'; dashboardId: ID }
  | { kind: 'bookmarks'; folderId: ID | null };

export interface WorkspaceData {
  spaces: Record<ID, Space>;
  groups: Record<ID, Group>;
  tabs: Record<ID, Tab>;
  bookmarks: Record<ID, Bookmark>;
  bookmarkFolders: Record<ID, BookmarkFolder>;
  dashboards: Record<ID, Dashboard>;
  activeSpaceId: ID;
  /** The view each space last showed; restored when switching back. */
  spaceViews: Record<ID, SpaceView>;
}

export const SEARCH_ENGINES = ['duckduckgo', 'google', 'bing'] as const;
export type SearchEngine = (typeof SEARCH_ENGINES)[number];

/** Port UI light/dark mode; `system` follows Windows. */
export const THEME_MODES = ['system', 'light', 'dark'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

/** Port UI presets. `stone` is the default (Stone & Slate). */
export const PALETTES = ['stone', 'dusk', 'signal', 'pigment', 'contrast'] as const;
export type Palette = (typeof PALETTES)[number];

export interface Settings {
  theme: ThemeMode;
  palette: Palette;
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  accentMode: 'space' | 'fixed';
  fixedAccent: AccentColor;
  density: 'compact' | 'comfortable';
  reduceMotion: boolean;
  defaultSpaceId: ID | null;
  restoreBehavior: 'restore' | 'defaultSpace';
  searchEngine: SearchEngine;
  bookmarkLayout: 'grid' | 'list';
  bookmarkTileSize: 'sm' | 'md' | 'lg';
  /** Show subfolder contents as sections instead of folder cards only. */
  bookmarkShowNested: boolean;
  /** Keep a browsing history (stored only on this device). */
  recordHistory: boolean;
  /** Desktop app: put tabs you are not looking at to sleep. */
  tabSleep: boolean;
  /** Minutes hidden before a tab is suspended (keeps its page, stops running). */
  tabSuspendMinutes: number;
  /** Minutes hidden before a tab is unloaded (reloads when shown); 0 = never. */
  tabUnloadMinutes: number;
}
