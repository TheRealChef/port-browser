import type { ID } from '../types/models';

/**
 * How a URL can be displayed in the content area.
 * - `native`: a real browser view owned by the host (future WebView2 host).
 * - `iframe`: best-effort preview inside the page; the site may still refuse.
 * - `blocked`: the site is known to forbid embedding; show the fallback.
 */
export type EmbedSupport =
  { mode: 'native' } | { mode: 'iframe'; local: boolean } | { mode: 'blocked'; reason: string };

export interface BrowserHostCapabilities {
  /** Whether pages render in a real engine view rather than an iframe preview. */
  nativeViews: boolean;
  /** Whether tabs keep running while not visible (background audio, timers, sessions). */
  persistentBackgroundTabs: boolean;
  /** Whether back/forward reflect the engine's own history (including in-page navigation). */
  engineHistory: boolean;
}

/**
 * The seam between Vela's UI and whatever actually renders web pages.
 * The UI calls these methods; it never touches iframes or WebViews directly
 * except through the view component the host chooses to render.
 */
export interface BrowserHost {
  readonly kind: 'web' | 'native';
  readonly label: string;
  readonly capabilities: BrowserHostCapabilities;

  navigate(tabId: ID, url: string): Promise<void>;
  reload(tabId: ID): Promise<void>;
  goBack(tabId: ID): Promise<void>;
  goForward(tabId: ID): Promise<void>;
  openExternal(url: string): Promise<void>;
  /** Called when a tab is closed so the host can release its view. */
  disposeTab(tabId: ID): Promise<void>;
  getEmbedSupport(url: string): EmbedSupport;
}
