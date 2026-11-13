import type { ID } from '../types/models';

/** A rectangle in CSS pixels relative to the UI's viewport. */
export interface ViewBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DownloadItem {
  id: string;
  url: string;
  fileName: string;
  /** Bytes; null when the server did not say. */
  totalBytes: number | null;
  receivedBytes: number;
  state: 'inProgress' | 'paused' | 'interrupted' | 'completed';
  /** Engine reason when interrupted, e.g. NetworkFailed. */
  reason: string | null;
  canResume: boolean;
  startedAt: number;
  /** File no longer at its saved path (moved or deleted). */
  missing: boolean;
}

export type DownloadAction = 'pause' | 'resume' | 'cancel' | 'open' | 'showInFolder' | 'remove';

/** Messages the UI sends to the native shell. */
export type UIToHostMessage =
  | { type: 'ready' }
  /**
   * Which tab's page view is visible and where. `tabId: null` hides every page
   * view (start page, dashboards, settings). `url` is only used to create the
   * view the first time a tab is shown. `covered` means UI overlays (menus,
   * dialogs, palette, toasts) overlap the content area, so the shell swaps the
   * live view for a snapshot until they close.
   */
  | {
      type: 'view';
      tabId: ID | null;
      url?: string;
      bounds?: ViewBounds;
      covered?: boolean;
      /** Each space browses in its own profile (cookies, sign-ins, storage). */
      spaceId?: ID;
    }
  /** The UI has painted the snapshot; the shell can hide the live view without a flash. */
  | { type: 'snapshotShown'; tabId: ID }
  | { type: 'navigate'; tabId: ID; url: string; spaceId?: ID }
  | { type: 'reload'; tabId: ID }
  | { type: 'back'; tabId: ID }
  | { type: 'forward'; tabId: ID }
  | { type: 'dispose'; tabId: ID }
  | { type: 'openExternal'; url: string }
  | { type: 'download'; id: string; action: DownloadAction }
  | { type: 'clearDownloads' }
  | { type: 'openDownloadsFolder' }
  /** Signs out of every site in a space by clearing its profile's browsing data. */
  | { type: 'clearSpaceData'; spaceId: ID };

/** Messages the native shell sends to the UI. */
export type HostToUIMessage =
  | { type: 'navigated'; tabId: ID; url: string; canGoBack: boolean; canGoForward: boolean }
  | { type: 'history'; tabId: ID; canGoBack: boolean; canGoForward: boolean }
  | { type: 'loading'; tabId: ID; loading: boolean }
  | { type: 'title'; tabId: ID; title: string }
  | { type: 'favicon'; tabId: ID; url: string | null }
  /** A page opened a new window; the shell already created its view under `tabId`. */
  | { type: 'newTab'; tabId: ID; url: string; openerTabId: ID; background: boolean }
  /** A page called `window.close()`. */
  | { type: 'closeTab'; tabId: ID }
  | { type: 'snapshot'; tabId: ID; dataUrl: string | null }
  /** The tab's live view is visible and painted again; any snapshot can go. */
  | { type: 'viewShown'; tabId: ID }
  | { type: 'downloads'; items: DownloadItem[]; started?: boolean }
  | { type: 'spaceDataCleared'; spaceId: ID; ok: boolean }
  /** A browser shortcut pressed while a page had focus, forwarded to the UI. */
  | {
      type: 'key';
      key: string;
      code: string;
      ctrlKey: boolean;
      shiftKey: boolean;
      altKey: boolean;
      metaKey: boolean;
    };

/** The subset of WebView2's `window.chrome.webview` the UI uses. */
export interface HostBridge {
  postMessage(message: unknown): void;
  addEventListener(type: 'message', listener: (event: { data: unknown }) => void): void;
  removeEventListener(type: 'message', listener: (event: { data: unknown }) => void): void;
}

declare global {
  interface Window {
    chrome?: { webview?: HostBridge };
  }
}

/** The native shell's message channel, or null when running in a normal browser. */
export function getHostBridge(): HostBridge | null {
  if (typeof window === 'undefined') return null;
  return window.chrome?.webview ?? null;
}

const MESSAGE_TYPES = new Set([
  'navigated',
  'history',
  'loading',
  'title',
  'favicon',
  'newTab',
  'closeTab',
  'snapshot',
  'viewShown',
  'downloads',
  'spaceDataCleared',
  'key',
]);

/** Shape check for incoming messages; the shell is trusted but the UI stays defensive. */
export function isHostMessage(data: unknown): data is HostToUIMessage {
  if (typeof data !== 'object' || data === null) return false;
  const type = (data as { type?: unknown }).type;
  return typeof type === 'string' && MESSAGE_TYPES.has(type);
}
