import { useSettings } from '../stores/settingsStore';
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
    const host = new NativeBrowserHost(bridge, {
      syncNavigation: (tabId, url, options) => ws().syncNavigation(tabId, url, options),
      setTabMeta: (tabId, meta) => ws().setTabMeta(tabId, meta),
      setEngineTab: (tabId, patch) => {
        if (ws().tabs[tabId]) useUI.getState().setEngineTab(tabId, patch);
      },
      setSnapshot: (tabId, dataUrl) => useUI.getState().setEngineTab(tabId, { snapshot: dataUrl }),
      setMedia: (tabId, state) => {
        if (!state || ws().tabs[tabId]) useUI.getState().setMedia(tabId, state);
      },
      setSleep: (tabId, sleep) => {
        if (ws().tabs[tabId]) useUI.getState().setEngineTab(tabId, { sleep });
      },
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
      tabSpaces: () => new Map(Object.values(ws().tabs).map((t) => [t.id, t.spaceId])),
      setDownloads: (items, started) => {
        const ui = useUI.getState();
        ui.setDownloads(items);
        const latest = items[0];
        if (started && latest && !ui.downloadsOpen) {
          ui.showToast(`Downloading ${latest.fileName}`, 'info', {
            label: 'Show',
            run: () => useUI.getState().setDownloadsOpen(true),
          });
        }
      },
      spaceDataCleared: (spaceId, ok) => {
        const name = ws().spaces[spaceId]?.name ?? 'this space';
        useUI
          .getState()
          .showToast(
            ok ? `Signed out of all sites in ${name}` : 'Could not clear site data',
            ok ? 'success' : 'error',
          );
      },
      subscribeToTabs: (listener) =>
        useWorkspace.subscribe((state, previous) => {
          if (state.tabs !== previous.tabs) listener();
        }),
    });
    syncSleepPolicy(host);
    return host;
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

/** Sends the tab sleeping settings and the pinned tabs (never unloaded) whenever they change. */
function syncSleepPolicy(host: NativeBrowserHost): void {
  let last = '';
  const send = () => {
    const s = useSettings.getState();
    const keepLoaded = Object.values(useWorkspace.getState().tabs)
      .filter((t) => t.pinned)
      .map((t) => t.id)
      .sort();
    const policy = {
      enabled: s.tabSleep,
      suspendMinutes: s.tabSuspendMinutes,
      discardMinutes: s.tabUnloadMinutes,
      keepLoaded,
    };
    const key = JSON.stringify(policy);
    if (key === last) return;
    last = key;
    host.setSleepPolicy(policy);
  };
  send();
  useSettings.subscribe(send);
  useWorkspace.subscribe((state, previous) => {
    if (state.tabs !== previous.tabs) send();
  });
}
