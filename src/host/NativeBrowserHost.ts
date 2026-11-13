import type { ID } from '../types/models';
import { toSafeHttpUrl } from '../utils/url';
import type {
  DownloadAction,
  DownloadItem,
  HostBridge,
  SleepState,
  HostToUIMessage,
  UIToHostMessage,
  ViewBounds,
} from './bridge';
import { isHostMessage } from './bridge';
import type { BrowserHost, EmbedSupport } from './types';

export interface NativeHostDeps {
  /** Mirrors an engine navigation into the tab's stored URL and history. */
  syncNavigation: (tabId: ID, url: string, options?: { replace?: boolean }) => void;
  setTabMeta: (tabId: ID, meta: { title?: string; favicon?: string | null }) => void;
  setEngineTab: (
    tabId: ID,
    patch: { canGoBack?: boolean; canGoForward?: boolean; loading?: boolean },
  ) => void;
  setSnapshot: (tabId: ID, dataUrl: string | null) => void;
  setSleep: (tabId: ID, state: SleepState) => void;
  /** Creates a tab for a window a page opened. Returns false if it could not. */
  openPopupTab: (tabId: ID, url: string, openerTabId: ID, background: boolean) => boolean;
  closeTab: (tabId: ID) => void;
  /** Replays a shortcut pressed inside a page as if it was pressed in the UI. */
  replayKey: (init: KeyboardEventInit) => void;
  /** Every existing tab and its space, to release views of removed or moved tabs. */
  tabSpaces: () => Map<ID, ID>;
  setDownloads: (items: DownloadItem[], started: boolean) => void;
  spaceDataCleared: (spaceId: ID, ok: boolean) => void;
  subscribeToTabs: (listener: () => void) => () => void;
}

/**
 * Host used inside the Port desktop shell. Every tab is a real WebView2 view
 * owned by the shell and laid over the content area; this class only sends
 * commands over the WebView2 message channel and feeds engine events back
 * into the stores.
 */
export class NativeBrowserHost implements BrowserHost {
  readonly kind = 'native' as const;
  readonly label = 'Port desktop (WebView2)';
  readonly capabilities = {
    nativeViews: true,
    persistentBackgroundTabs: true,
    engineHistory: true,
  };

  private readonly bridge: HostBridge;
  private readonly deps: NativeHostDeps;
  /** Tabs with a navigation we started that the engine has not reported yet. */
  private readonly pending = new Set<ID>();
  private known = new Map<ID, ID>();
  /** Tabs the shell has a view for (as far as the UI knows). */
  private readonly created = new Set<ID>();

  constructor(bridge: HostBridge, deps: NativeHostDeps) {
    this.bridge = bridge;
    this.deps = deps;
    this.known = deps.tabSpaces();
    bridge.addEventListener('message', (event) => {
      if (isHostMessage(event.data)) this.receive(event.data);
    });
    // Tabs can disappear without closeTab (space or group deletion, imports):
    // release their views so hidden pages stop running. A tab moved to another
    // space is released too and recreated in that space's profile when shown.
    deps.subscribeToTabs(() => {
      const current = deps.tabSpaces();
      for (const [id, spaceId] of this.known) {
        if (current.get(id) !== spaceId) void this.disposeTab(id);
      }
      this.known = current;
    });
    this.post({ type: 'ready' });
  }

  /**
   * Shows a tab's view over `bounds` (or hides all views with `tabId: null`).
   * The first time a tab is shown the shell creates its view and loads `url`.
   */
  showView(view: {
    tabId: ID | null;
    url?: string;
    bounds?: ViewBounds;
    covered?: boolean;
    spaceId?: ID;
  }): void {
    if (view.tabId && !this.created.has(view.tabId)) {
      this.created.add(view.tabId);
      // The engine may land on a redirected URL; replace instead of adding history.
      if (view.url) this.pending.add(view.tabId);
    }
    this.post({ type: 'view', ...view });
  }

  post(message: UIToHostMessage): void {
    this.bridge.postMessage(message);
  }

  async navigate(tabId: ID, url: string): Promise<void> {
    const safe = toSafeHttpUrl(url);
    if (!safe) throw new Error(`Refusing to navigate to non-web URL: ${url}`);
    // Show the new address right away; the engine's report replaces it after redirects.
    this.deps.syncNavigation(tabId, safe);
    this.pending.add(tabId);
    this.created.add(tabId);
    this.post({ type: 'navigate', tabId, url: safe, spaceId: this.deps.tabSpaces().get(tabId) });
  }

  async reload(tabId: ID): Promise<void> {
    this.post({ type: 'reload', tabId });
  }

  async goBack(tabId: ID): Promise<void> {
    this.post({ type: 'back', tabId });
  }

  async goForward(tabId: ID): Promise<void> {
    this.post({ type: 'forward', tabId });
  }

  async openExternal(url: string): Promise<void> {
    const safe = toSafeHttpUrl(url);
    if (safe) this.post({ type: 'openExternal', url: safe });
  }

  async disposeTab(tabId: ID): Promise<void> {
    this.pending.delete(tabId);
    this.created.delete(tabId);
    this.post({ type: 'dispose', tabId });
  }

  setSleepPolicy(policy: {
    enabled: boolean;
    suspendMinutes: number;
    discardMinutes: number;
    keepLoaded: ID[];
  }): void {
    this.post({ type: 'sleepPolicy', ...policy });
  }

  snapshotShown(tabId: ID): void {
    this.post({ type: 'snapshotShown', tabId });
  }

  downloadAction(id: string, action: DownloadAction): void {
    this.post({ type: 'download', id, action });
  }

  clearDownloads(): void {
    this.post({ type: 'clearDownloads' });
  }

  openDownloadsFolder(): void {
    this.post({ type: 'openDownloadsFolder' });
  }

  /** Signs out of all sites in a space (clears its cookies and site data). */
  clearSpaceData(spaceId: ID): void {
    this.post({ type: 'clearSpaceData', spaceId });
  }

  getEmbedSupport(): EmbedSupport {
    return { mode: 'native' };
  }

  private receive(message: HostToUIMessage): void {
    const { deps } = this;
    switch (message.type) {
      case 'navigated': {
        const safe = toSafeHttpUrl(message.url);
        if (safe) {
          deps.syncNavigation(message.tabId, safe, { replace: this.pending.has(message.tabId) });
        }
        this.pending.delete(message.tabId);
        deps.setEngineTab(message.tabId, {
          canGoBack: message.canGoBack,
          canGoForward: message.canGoForward,
        });
        break;
      }
      case 'history':
        deps.setEngineTab(message.tabId, {
          canGoBack: message.canGoBack,
          canGoForward: message.canGoForward,
        });
        break;
      case 'loading':
        deps.setEngineTab(message.tabId, { loading: message.loading });
        break;
      case 'title':
        deps.setTabMeta(message.tabId, { title: message.title });
        break;
      case 'favicon':
        deps.setTabMeta(message.tabId, { favicon: message.url });
        break;
      case 'newTab': {
        const safe = toSafeHttpUrl(message.url) ?? '';
        this.created.add(message.tabId);
        if (!deps.openPopupTab(message.tabId, safe, message.openerTabId, message.background)) {
          void this.disposeTab(message.tabId);
        }
        break;
      }
      case 'closeTab':
        deps.closeTab(message.tabId);
        break;
      case 'snapshot':
        deps.setSnapshot(message.tabId, message.dataUrl);
        break;
      case 'sleep':
        if (message.state === 'discarded') {
          // The shell released the view; showing the tab again recreates it from its URL.
          this.created.delete(message.tabId);
          this.pending.delete(message.tabId);
          deps.setEngineTab(message.tabId, {
            loading: false,
            canGoBack: false,
            canGoForward: false,
          });
        }
        deps.setSleep(message.tabId, message.state);
        break;
      case 'viewShown':
        deps.setSnapshot(message.tabId, null);
        break;
      case 'downloads':
        deps.setDownloads(
          Array.isArray(message.items) ? message.items : [],
          Boolean(message.started),
        );
        break;
      case 'spaceDataCleared':
        deps.spaceDataCleared(message.spaceId, message.ok);
        break;
      case 'key':
        deps.replayKey({
          key: message.key,
          code: message.code,
          ctrlKey: message.ctrlKey,
          shiftKey: message.shiftKey,
          altKey: message.altKey,
          metaKey: message.metaKey,
        });
        break;
    }
  }
}
