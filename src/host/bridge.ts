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

/** Site player controls Port can trigger (the Media Session API's action names). */
export type MediaAction =
  'play' | 'pause' | 'nexttrack' | 'previoustrack' | 'seekto' | 'seekbackward' | 'seekforward';

/** What a tab is playing, as read from the page (untrusted display data). */
export interface MediaState {
  title: string;
  artist: string;
  album: string;
  artwork: Array<{ src: string; sizes: string }>;
  playing: boolean;
  /** Seconds; null for live streams or unknown. */
  position: number | null;
  duration: number | null;
  /** Controls the site registered. */
  actions: MediaAction[];
  /** A plain <video>/<audio> element is present (seeking works without a site handler). */
  element: boolean;
  /** The tab is making sound right now. */
  audible: boolean;
  muted: boolean;
}

export type SleepState = 'awake' | 'suspended' | 'discarded';

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
  | { type: 'mediaAction'; tabId: ID; action: MediaAction | 'mute' | 'unmute'; time?: number }
  /** Tab sleeping settings; `keepLoaded` tabs (pinned) are never unloaded. */
  | {
      type: 'sleepPolicy';
      enabled: boolean;
      suspendMinutes: number;
      discardMinutes: number;
      keepLoaded: ID[];
    }
  /** Signs out of every site in a space by clearing its profile's browsing data. */
  | { type: 'clearSpaceData'; spaceId: ID }
  /** Port UI theme, so the window frame and pages' color scheme match. Colors are CSS hex. */
  | { type: 'theme'; dark: boolean; background: string; caption: string; text: string };

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
  /** What a tab plays changed (null: nothing anymore). */
  | { type: 'media'; tabId: ID; state: MediaState | null }
  /** A tab was suspended, unloaded (its view released) or woke up again. */
  | { type: 'sleep'; tabId: ID; state: SleepState }
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
  'sleep',
  'media',
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
