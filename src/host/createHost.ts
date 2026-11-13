import { useUI } from '../stores/uiStore';
import { useWorkspace } from '../stores/workspaceStore';
import { getHostBridge } from './bridge';
import { NativeBrowserHost } from './NativeBrowserHost';
import type { BrowserHost } from './types';
import { WebBrowserHost } from './WebBrowserHost';

/**
 * Chooses the browser host for the current runtime: inside the Port desktop
 * shell the WebView2 message channel exists and pages get real engine views;
 * in a normal browser (development) pages are iframe previews.
 */
export function createBrowserHost(): BrowserHost {
  const bridge = getHostBridge();
  if (bridge) {
    const ws = () => useWorkspace.getState();
    return new NativeBrowserHost(bridge, {
      syncNavigation: (tabId, url, options) => ws().syncNavigation(tabId, url, options),
      setTabMeta: (tabId, meta) => ws().setTabMeta(tabId, meta),
      setEngineTab: (tabId, patch) => {
        if (ws().tabs[tabId]) useUI.getState().setEngineTab(tabId, patch);
      },
      setSnapshot: (tabId, dataUrl) => useUI.getState().setEngineTab(tabId, { snapshot: dataUrl }),
      openPopupTab: (tabId, url, openerTabId, background) => {
        const opener = ws().tabs[openerTabId];
        if (!opener) return false;
        ws().createTab({
          id: tabId,
          url,
          spaceId: opener.spaceId,
          afterTabId: opener.pinned ? undefined : opener.id,
          select: !background,
        });
        if (!background) useUI.getState().setSettingsOpen(false);
        return Boolean(ws().tabs[tabId]);
      },
      closeTab: (tabId) => {
        if (ws().tabs[tabId]) ws().closeTab(tabId);
      },
      replayKey: (init) => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true }),
        );
      },
      tabIds: () => new Set(Object.keys(ws().tabs)),
      subscribeToTabs: (listener) =>
        useWorkspace.subscribe((state, previous) => {
          if (state.tabs !== previous.tabs) listener();
        }),
    });
  }

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
