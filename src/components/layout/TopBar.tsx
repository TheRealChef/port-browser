import {
  ArrowLeft,
  ArrowRight,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCw,
  Search,
  Settings,
} from 'lucide-react';
import { useNavigation } from '../../app/providers/hostContext';
import { AddressBar } from '../../features/navigation/AddressBar';
import { activeTab } from '../../features/workspace/selectors';
import { useSettings } from '../../stores/settingsStore';
import { useUI } from '../../stores/uiStore';
import { useWorkspace } from '../../stores/workspaceStore';
import { MOD_LABEL } from '../../utils/misc';
import { IconButton } from '../common/IconButton';

export function TopBar() {
  const nav = useNavigation();
  const tab = useWorkspace(activeTab);
  const collapsed = useSettings((s) => s.sidebarCollapsed);
  const toggleSidebar = useSettings((s) => s.toggleSidebar);
  const settingsOpen = useUI((s) => s.settingsOpen);
  const setSettingsOpen = useUI((s) => s.setSettingsOpen);
  const setPaletteOpen = useUI((s) => s.setPaletteOpen);

  const canGoBack = Boolean(tab && tab.historyIndex > 0);
  const canGoForward = Boolean(tab && tab.historyIndex < tab.history.length - 1);

  return (
    <header className="flex h-11 shrink-0 items-center gap-1 px-1.5">
      <IconButton
        icon={collapsed ? PanelLeftOpen : PanelLeftClose}
        label={collapsed ? 'Show sidebar' : 'Hide sidebar'}
        shortcut={`${MOD_LABEL}+B`}
        onClick={toggleSidebar}
      />
      <IconButton
        icon={ArrowLeft}
        label="Back"
        shortcut="Alt+←"
        disabled={!canGoBack}
        onClick={nav.back}
      />
      <IconButton
        icon={ArrowRight}
        label="Forward"
        shortcut="Alt+→"
        disabled={!canGoForward}
        onClick={nav.forward}
      />
      <IconButton
        icon={RotateCw}
        label="Reload"
        shortcut={`${MOD_LABEL}+R`}
        disabled={!tab?.url}
        onClick={nav.reload}
      />
      <div className="mx-1.5 flex min-w-0 flex-1 justify-center">
        <div className="flex w-full max-w-[860px]">
          <AddressBar />
        </div>
      </div>
      <IconButton
        icon={Plus}
        label="New tab"
        shortcut={`${MOD_LABEL}+T`}
        onClick={() => nav.newTab()}
      />
      <IconButton
        icon={Search}
        label="Command palette"
        shortcut={`${MOD_LABEL}+K`}
        onClick={() => setPaletteOpen(true)}
      />
      <IconButton
        icon={Settings}
        label="Settings"
        shortcut={`${MOD_LABEL}+,`}
        active={settingsOpen}
        onClick={() => setSettingsOpen(!settingsOpen)}
      />
    </header>
  );
}
