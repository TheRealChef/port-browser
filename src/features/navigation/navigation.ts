import type { BrowserHost } from '../../host/types';
import { useSettings } from '../../stores/settingsStore';
import { useUI } from '../../stores/uiStore';
import { findTabByUrl, useWorkspace } from '../../stores/workspaceStore';
import type { ID } from '../../types/models';
import { normalizeInput, titleFromUrl } from '../../utils/url';
import { activeTab, containerTabs, tabDisplayTitle } from '../workspace/selectors';

export interface Navigation {
  /** Handles omnibox/quick-search input. Returns false if the input was empty. */
  submit: (input: string, options?: { newTab?: boolean }) => boolean;
  openUrl: (url: string, options?: { title?: string; reuseExisting?: boolean }) => void;
  newTab: (options?: { groupId?: ID | null }) => void;
  closeTab: (tabId: ID) => void;
  closeActiveTab: () => void;
  reopenClosedTab: () => void;
  back: () => void;
  forward: () => void;
  reload: () => void;
  openExternal: (url: string) => void;
  openGroup: (groupId: ID) => void;
}

const ws = () => useWorkspace.getState();

export function createNavigation(host: BrowserHost): Navigation {
  const report = (error: unknown) => {
    console.error('[vela] Navigation failed', error);
    useUI.getState().showToast('That address could not be opened.', 'error');
  };

  const nav: Navigation = {
    submit(input, options = {}) {
      const result = normalizeInput(input, useSettings.getState().searchEngine);
      if (!result) return false;
      const title =
        result.kind === 'search' ? `${result.query ?? input} – Search` : titleFromUrl(result.url);
      const current = activeTab(ws());
      if (current && !options.newTab) {
        host
          .navigate(current.id, result.url)
          .then(() => {
            // A native engine reports the real page title itself.
            if (result.kind === 'search' && !host.capabilities.engineHistory) {
              ws().recordNavigation(current.id, result.url, title);
            }
          })
          .catch(report);
      } else {
        ws().createTab({ url: result.url, title });
      }
      return true;
    },

    openUrl(url, options = {}) {
      const state = ws();
      if (options.reuseExisting !== false) {
        const existing = findTabByUrl(state, state.activeSpaceId, url);
        if (existing) {
          state.selectTab(existing.id);
          return;
        }
      }
      state.createTab({ url, title: options.title ?? titleFromUrl(url) });
    },

    newTab(options = {}) {
      ws().createTab({ groupId: options.groupId ?? null });
      useUI.getState().setSettingsOpen(false);
      useUI.getState().focusAddressBar();
    },

    closeTab(tabId) {
      const tab = ws().tabs[tabId];
      if (!tab) return;
      const ui = useUI.getState();
      ui.pushClosedTab(tab);
      if (ui.renamingTabId === tabId) ui.setRenamingTab(null);
      ws().closeTab(tabId);
      ui.showToast(`Closed “${tabDisplayTitle(tab)}”`, 'info', {
        label: 'Undo',
        run: () => nav.reopenClosedTab(),
      });
      host.disposeTab(tabId).catch(report);
    },

    closeActiveTab() {
      const current = activeTab(ws());
      if (current) nav.closeTab(current.id);
    },

    reopenClosedTab() {
      const ui = useUI.getState();
      let tab = ui.popClosedTab();
      // Skip tabs whose space has since been deleted.
      while (tab && !ws().spaces[tab.spaceId]) tab = ui.popClosedTab();
      if (!tab) {
        ui.showToast('No recently closed tabs');
        return;
      }
      ui.dismissToast();
      ui.setSettingsOpen(false);
      ws().restoreTab(tab);
    },

    back() {
      const current = activeTab(ws());
      if (current) host.goBack(current.id).catch(report);
    },

    forward() {
      const current = activeTab(ws());
      if (current) host.goForward(current.id).catch(report);
    },

    reload() {
      const current = activeTab(ws());
      if (current?.url) host.reload(current.id).catch(report);
    },

    openExternal(url) {
      host.openExternal(url).catch(report);
    },

    openGroup(groupId) {
      const state = ws();
      const group = state.groups[groupId];
      if (!group) return;
      state.switchSpace(group.spaceId);
      state.setGroupCollapsed(groupId, false);
      const members = containerTabs(state.tabs, group.spaceId, false, groupId);
      const target = [...members].sort((a, b) => b.lastSelectedAt - a.lastSelectedAt)[0];
      if (target) state.selectTab(target.id);
      else state.createTab({ spaceId: group.spaceId, groupId });
      useUI.getState().setSettingsOpen(false);
    },
  };
  return nav;
}
