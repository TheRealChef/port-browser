import { useHistory } from '../../stores/historyStore';
import { useSettings } from '../../stores/settingsStore';
import { useWorkspace } from '../../stores/workspaceStore';
import type { ID } from '../../types/models';

/**
 * A tab must stay on an address this long to count as a visit. Redirect
 * chains, and links that turn out to be downloads (the address bar shows them
 * briefly before the engine reports the page never changed), are skipped.
 */
export const VISIT_SETTLE_MS = 1200;

/**
 * Records a visit whenever a tab settles on a new address, and late titles
 * for the page a tab is on. Works the same for the web and native hosts
 * because it only watches the workspace store. Returns an unsubscribe function.
 */
export function startHistoryRecorder(): () => void {
  const timers = new Map<ID, number>();

  const settle = (tabId: ID, url: string) => {
    window.clearTimeout(timers.get(tabId));
    timers.set(
      tabId,
      window.setTimeout(() => {
        timers.delete(tabId);
        const tab = useWorkspace.getState().tabs[tabId];
        if (!tab || tab.url !== url || !useSettings.getState().recordHistory) return;
        useHistory.getState().recordVisit({ url, title: tab.title, spaceId: tab.spaceId });
      }, VISIT_SETTLE_MS),
    );
  };

  const unsubscribe = useWorkspace.subscribe((state, previous) => {
    if (state.tabs === previous.tabs || !useSettings.getState().recordHistory) return;
    const changed = [];
    for (const tab of Object.values(state.tabs)) {
      if (!tab.url) continue;
      const before = previous.tabs[tab.id];
      if (!before || before.url !== tab.url) changed.push(tab);
      else if (before.title !== tab.title) useHistory.getState().updateTitle(tab.url, tab.title);
    }
    // Navigation changes one tab at a time; many at once is an import or reset, not browsing.
    if (changed.length > 2) return;
    for (const tab of changed) settle(tab.id, tab.url);
  });

  return () => {
    unsubscribe();
    timers.forEach((t) => window.clearTimeout(t));
    timers.clear();
  };
}
