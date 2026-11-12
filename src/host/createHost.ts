import { useUI } from '../stores/uiStore';
import { useWorkspace } from '../stores/workspaceStore';
import type { BrowserHost } from './types';
import { WebBrowserHost } from './WebBrowserHost';

/**
 * Chooses the browser host for the current runtime. A native shell
 * (e.g. WebView2) would inject its own host here, detected via a bridge
 * object such as `window.chrome.webview`.
 */
export function createBrowserHost(): BrowserHost {
  return new WebBrowserHost({
    recordNavigation: (tabId, url) => useWorkspace.getState().recordNavigation(tabId, url),
    stepHistory: (tabId, delta) => useWorkspace.getState().stepHistory(tabId, delta),
    bumpReload: (tabId) => useUI.getState().bumpReload(tabId),
    clearEmbedOverride: (tabId) => useUI.getState().setEmbedOverride(tabId, false),
    openWindow: (url) => {
      window.open(url, '_blank', 'noopener,noreferrer');
    },
  });
}
