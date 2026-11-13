import type { LucideIcon } from 'lucide-react';
import { create } from 'zustand';
import type { AccentColor, ID, Tab } from '../types/models';
import type { DownloadItem, MediaState, SleepState } from '../host/bridge';

/** Transient UI state. Nothing here is persisted. */

export type MenuEntry =
  | {
      type: 'item';
      id: string;
      label: string;
      icon?: LucideIcon;
      shortcut?: string;
      danger?: boolean;
      disabled?: boolean;
      checked?: boolean;
      onSelect: () => void;
    }
  | {
      type: 'submenu';
      id: string;
      label: string;
      icon?: LucideIcon;
      disabled?: boolean;
      items: MenuEntry[];
    }
  | { type: 'separator'; id: string }
  | { type: 'label'; id: string; label: string };

export interface ContextMenuState {
  x: number;
  y: number;
  items: MenuEntry[];
  /** Element to restore focus to when the menu closes. */
  returnFocus: HTMLElement | null;
}

export interface FormField {
  name: string;
  label: string;
  placeholder?: string;
  initial?: string;
  required?: boolean;
  type?: 'text' | 'url' | 'select';
  /** Choices for `select` fields. */
  options?: Array<{ value: string; label: string }>;
}

export type DialogRequest =
  | {
      kind: 'confirm';
      title: string;
      message: string;
      confirmLabel: string;
      danger: boolean;
      option?: string;
      resolve: (result: { ok: boolean; option: boolean }) => void;
    }
  | {
      kind: 'form';
      title: string;
      submitLabel: string;
      fields: FormField[];
      validate?: (values: Record<string, string>) => string | null;
      resolve: (values: Record<string, string> | null) => void;
    }
  | {
      kind: 'entity';
      title: string;
      submitLabel: string;
      initial: { name: string; icon: string; accent: AccentColor };
      resolve: (values: { name: string; icon: string; accent: AccentColor } | null) => void;
    };

export interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'success' | 'error';
  action?: { label: string; run: () => void };
}

/** Navigation state reported by a native engine (unused by the web host). */
export interface EngineTabState {
  canGoBack: boolean;
  canGoForward: boolean;
  loading: boolean;
  /** Desktop app: whether the tab is asleep (suspended or unloaded). */
  sleep?: SleepState;
  /** Still image of the page shown while UI overlays cover the live view. */
  snapshot?: string | null;
}

export interface MediaEntry extends MediaState {
  /** When this state arrived; positions advance from here while playing. */
  receivedAt: number;
  lastPlayedAt: number;
  dismissed: boolean;
}

const CLOSED_TAB_LIMIT = 25;

interface UIState {
  settingsOpen: boolean;
  /** History page in the content area (like settings, not part of the saved workspace). */
  historyOpen: boolean;
  downloadsOpen: boolean;
  /** Downloads reported by the desktop shell, newest first. */
  downloads: DownloadItem[];
  /** What each tab plays (desktop app), for the built-in player. */
  media: Record<ID, MediaEntry>;
  /** A tooltip currently overlaps a native page view. */
  tooltipOverPage: boolean;
  paletteOpen: boolean;
  contextMenu: ContextMenuState | null;
  dialog: DialogRequest | null;
  toast: Toast | null;
  renamingTabId: ID | null;
  /** Bumped to remount a tab's iframe (web host reload). */
  reloadKeys: Record<ID, number>;
  /** Tabs where the user chose to attempt embedding a known-blocking site. */
  embedOverrides: Record<ID, true>;
  addressFocusToken: number;
  /** Address-bar suggestion popup is visible (it overlaps the content area). */
  suggestionsOpen: boolean;
  /** Recently closed tabs for this session, newest last. */
  closedTabs: Tab[];
  engineTabs: Record<ID, EngineTabState>;

  /** Opening settings closes history; closing it leaves both panels (back to content). */
  setSettingsOpen: (open: boolean) => void;
  setHistoryOpen: (open: boolean) => void;
  setDownloadsOpen: (open: boolean) => void;
  setDownloads: (downloads: DownloadItem[]) => void;
  setTooltipOverPage: (over: boolean) => void;
  setMedia: (tabId: ID, state: MediaState | null) => void;
  /** Hides a source from the player until it starts playing again. */
  dismissMedia: (tabId: ID) => void;
  setPaletteOpen: (open: boolean) => void;
  openContextMenu: (menu: ContextMenuState) => void;
  closeContextMenu: () => void;
  setDialog: (dialog: DialogRequest | null) => void;
  showToast: (message: string, tone?: Toast['tone'], action?: Toast['action']) => void;
  dismissToast: () => void;
  setRenamingTab: (tabId: ID | null) => void;
  bumpReload: (tabId: ID) => void;
  setEmbedOverride: (tabId: ID, enabled: boolean) => void;
  focusAddressBar: () => void;
  setSuggestionsOpen: (open: boolean) => void;
  pushClosedTab: (tab: Tab) => void;
  popClosedTab: () => Tab | null;
  setEngineTab: (tabId: ID, patch: Partial<EngineTabState>) => void;
}

let toastSeq = 0;

export const useUI = create<UIState>()((set, get) => ({
  settingsOpen: false,
  historyOpen: false,
  downloadsOpen: false,
  downloads: [],
  tooltipOverPage: false,
  media: {},
  paletteOpen: false,
  contextMenu: null,
  dialog: null,
  toast: null,
  renamingTabId: null,
  reloadKeys: {},
  embedOverrides: {},
  addressFocusToken: 0,
  suggestionsOpen: false,
  closedTabs: [],
  engineTabs: {},

  setSettingsOpen: (settingsOpen) => set({ settingsOpen, historyOpen: false }),
  setHistoryOpen: (historyOpen) => set({ historyOpen, settingsOpen: false }),
  setDownloadsOpen: (downloadsOpen) => set({ downloadsOpen }),
  setDownloads: (downloads) => set({ downloads }),
  setMedia: (tabId, state) =>
    set((s) => {
      const media = { ...s.media };
      const previous = media[tabId];
      if (!state) {
        if (!previous) return s;
        delete media[tabId];
        return { media };
      }
      const now = Date.now();
      media[tabId] = {
        ...state,
        receivedAt: now,
        lastPlayedAt: state.playing ? now : (previous?.lastPlayedAt ?? 0),
        // Starting to play again brings a dismissed source back.
        dismissed: state.playing && !previous?.playing ? false : (previous?.dismissed ?? false),
      };
      return { media };
    }),
  dismissMedia: (tabId) =>
    set((s) =>
      s.media[tabId]
        ? { media: { ...s.media, [tabId]: { ...s.media[tabId]!, dismissed: true } } }
        : s,
    ),
  setTooltipOverPage: (tooltipOverPage) => {
    if (get().tooltipOverPage !== tooltipOverPage) set({ tooltipOverPage });
  },
  setPaletteOpen: (paletteOpen) => set({ paletteOpen, contextMenu: null }),
  openContextMenu: (contextMenu) => set({ contextMenu }),
  closeContextMenu: () => set({ contextMenu: null }),
  setDialog: (dialog) => set({ dialog }),
  showToast: (message, tone = 'info', action) =>
    set({ toast: { id: ++toastSeq, message, tone, action } }),
  dismissToast: () => set({ toast: null }),
  setRenamingTab: (renamingTabId) => set({ renamingTabId }),
  bumpReload: (tabId) =>
    set((s) => ({ reloadKeys: { ...s.reloadKeys, [tabId]: (s.reloadKeys[tabId] ?? 0) + 1 } })),
  setEmbedOverride: (tabId, enabled) =>
    set((s) => {
      const embedOverrides = { ...s.embedOverrides };
      if (enabled) embedOverrides[tabId] = true;
      else delete embedOverrides[tabId];
      return { embedOverrides };
    }),
  focusAddressBar: () => set((s) => ({ addressFocusToken: s.addressFocusToken + 1 })),
  setSuggestionsOpen: (suggestionsOpen) => {
    if (get().suggestionsOpen !== suggestionsOpen) set({ suggestionsOpen });
  },
  pushClosedTab: (tab) =>
    set((s) => ({ closedTabs: [...s.closedTabs, tab].slice(-CLOSED_TAB_LIMIT) })),
  popClosedTab: () => {
    const tab = get().closedTabs.at(-1) ?? null;
    if (tab) set((s) => ({ closedTabs: s.closedTabs.slice(0, -1) }));
    return tab;
  },
  setEngineTab: (tabId, patch) =>
    set((s) => {
      const current = s.engineTabs[tabId] ?? {
        canGoBack: false,
        canGoForward: false,
        loading: false,
      };
      return { engineTabs: { ...s.engineTabs, [tabId]: { ...current, ...patch } } };
    }),
}));

/** UI that draws over the content area, where native page views would hide it. */
export function selectContentCovered(s: UIState): boolean {
  return Boolean(
    s.paletteOpen ||
    s.contextMenu ||
    s.dialog ||
    s.suggestionsOpen ||
    s.toast ||
    s.downloadsOpen ||
    s.tooltipOverPage,
  );
}

/** Settings or history is showing instead of the space's own view. */
export function selectPanelOpen(s: UIState): boolean {
  return s.settingsOpen || s.historyOpen;
}
