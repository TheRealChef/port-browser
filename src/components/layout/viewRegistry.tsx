import type { ReactNode } from 'react';
import { useUI } from '../../stores/uiStore';
import { useWorkspace } from '../../stores/workspaceStore';
import type { SpaceView } from '../../types/models';
import { activeView } from '../../features/workspace/selectors';
import { SettingsView } from '../../features/settings/SettingsView';
import { BookmarksView } from '../bookmarks/BookmarksView';
import { DashboardView } from '../dashboard/DashboardView';
import { StartPage } from '../start/StartPage';
import { TabView } from '../tabs/TabView';

/**
 * Everything the content area can show. Add a kind to this union and a
 * renderer to the registry to introduce a new view without touching the shell.
 */
export type ContentView = SpaceView | { kind: 'settings' };

type Renderers = {
  [K in ContentView['kind']]: (view: Extract<ContentView, { kind: K }>) => ReactNode;
};

const registry: Renderers = {
  start: () => <StartPage />,
  tab: (view) => <TabView tabId={view.tabId} />,
  dashboard: (view) => <DashboardView dashboardId={view.dashboardId} />,
  bookmarks: (view) => <BookmarksView folderId={view.folderId} />,
  settings: () => <SettingsView />,
};

export function useContentView(): ContentView {
  const settingsOpen = useUI((s) => s.settingsOpen);
  const view = useWorkspace(activeView);
  return settingsOpen ? { kind: 'settings' } : view;
}

export function viewKey(view: ContentView): string {
  switch (view.kind) {
    case 'tab':
      return `tab:${view.tabId}`;
    case 'dashboard':
      return `dashboard:${view.dashboardId}`;
    default:
      return view.kind;
  }
}

export function renderView(view: ContentView): ReactNode {
  return (registry[view.kind] as (v: ContentView) => ReactNode)(view);
}
