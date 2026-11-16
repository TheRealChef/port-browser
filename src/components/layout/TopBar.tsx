import {
  ArrowLeft,
  ArrowRight,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCw,
  Search,
  Settings,
  Download,
} from '../icons';
import { useState } from 'react';
import { useBrowserHost, useNavigation } from '../../app/providers/hostContext';
import { AddressBar } from '../../features/navigation/AddressBar';
import { activeTab } from '../../features/workspace/selectors';
import { useSettings } from '../../stores/settingsStore';
import { useUI } from '../../stores/uiStore';
import { useWorkspace } from '../../stores/workspaceStore';
import { MOD_LABEL } from '../../utils/misc';
import { IconButton } from '../common/IconButton';
import { DownloadsPanel } from '../../features/downloads/DownloadsPanel';
import { downloadProgress } from '../../features/downloads/format';

export function TopBar() {
  const nav = useNavigation();
  const tab = useWorkspace(activeTab);
  const collapsed = useSettings((s) => s.sidebarCollapsed);
  const toggleSidebar = useSettings((s) => s.toggleSidebar);
  const settingsOpen = useUI((s) => s.settingsOpen);
  const setSettingsOpen = useUI((s) => s.setSettingsOpen);
  const setPaletteOpen = useUI((s) => s.setPaletteOpen);

  const host = useBrowserHost();
  const engine = useUI((s) => (tab ? s.engineTabs[tab.id] : undefined));
  const canGoBack = host.capabilities.engineHistory
    ? Boolean(engine?.canGoBack)
    : Boolean(tab && tab.historyIndex > 0);
  const canGoForward = host.capabilities.engineHistory
    ? Boolean(engine?.canGoForward)
    : Boolean(tab && tab.historyIndex < tab.history.length - 1);

  return (
    <header className="flex h-11 shrink-0 select-none items-center gap-1 px-1.5">
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
      {host.kind === 'native' && <DownloadsButton />}
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

/** Toolbar button with a progress ring while downloads run; opens the downloads panel. */
function DownloadsButton() {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const open = useUI((s) => s.downloadsOpen);
  const setOpen = useUI((s) => s.setDownloadsOpen);
  const downloads = useUI((s) => s.downloads);
  const active = downloads.filter((d) => d.state === 'inProgress');
  const known = active.map(downloadProgress).filter((p): p is number => p !== null);
  const progress = known.length ? known.reduce((a, b) => a + b, 0) / known.length : null;
  const r = 13;
  const circumference = 2 * Math.PI * r;

  return (
    <span className="relative inline-flex">
      <IconButton
        ref={setAnchor}
        icon={Download}
        label={active.length ? `Downloads (${active.length} in progress)` : 'Downloads'}
        shortcut={`${MOD_LABEL}+J`}
        active={open}
        className={active.length ? 'text-info' : undefined}
        onClick={() => setOpen(!open)}
      />
      {active.length > 0 && (
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 -rotate-90"
          viewBox="0 0 32 32"
        >
          <circle cx="16" cy="16" r={r} fill="none" stroke="var(--line)" strokeWidth="2" />
          <circle
            cx="16"
            cy="16"
            r={r}
            fill="none"
            stroke="var(--cobalt)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - (progress ?? 0.25))}
            className={progress === null ? 'origin-center animate-spin' : undefined}
          />
        </svg>
      )}
      <DownloadsPanel anchor={anchor} />
    </span>
  );
}
