import type { ID } from '../types/models';
import { toSafeHttpUrl } from '../utils/url';
import { getIframeEmbedSupport } from './embedPolicy';
import type { BrowserHost, EmbedSupport } from './types';

export interface WebHostDeps {
  recordNavigation: (tabId: ID, url: string) => void;
  stepHistory: (tabId: ID, delta: -1 | 1) => string | null;
  bumpReload: (tabId: ID) => void;
  clearEmbedOverride: (tabId: ID) => void;
  openWindow: (url: string) => void;
}

/**
 * Development host: Vela runs as a page inside an existing browser.
 * Pages are shown as sandboxed iframe previews where the site allows it,
 * history is tracked by Vela itself (cross-origin iframe history is not
 * observable), and anything else is opened in a real browser tab.
 */
export class WebBrowserHost implements BrowserHost {
  readonly kind = 'web' as const;
  readonly label = 'Web preview (development)';
  readonly capabilities = {
    nativeViews: false,
    persistentBackgroundTabs: false,
    engineHistory: false,
  };

  private readonly deps: WebHostDeps;

  constructor(deps: WebHostDeps) {
    this.deps = deps;
  }

  async navigate(tabId: ID, url: string): Promise<void> {
    const safe = toSafeHttpUrl(url);
    if (!safe) throw new Error(`Refusing to navigate to non-web URL: ${url}`);
    this.deps.clearEmbedOverride(tabId);
    this.deps.recordNavigation(tabId, safe);
  }

  async reload(tabId: ID): Promise<void> {
    this.deps.bumpReload(tabId);
  }

  async goBack(tabId: ID): Promise<void> {
    if (this.deps.stepHistory(tabId, -1)) this.deps.clearEmbedOverride(tabId);
  }

  async goForward(tabId: ID): Promise<void> {
    if (this.deps.stepHistory(tabId, 1)) this.deps.clearEmbedOverride(tabId);
  }

  async openExternal(url: string): Promise<void> {
    const safe = toSafeHttpUrl(url);
    if (safe) this.deps.openWindow(safe);
  }

  async disposeTab(tabId: ID): Promise<void> {
    this.deps.clearEmbedOverride(tabId);
  }

  getEmbedSupport(url: string): EmbedSupport {
    return getIframeEmbedSupport(url);
  }
}
