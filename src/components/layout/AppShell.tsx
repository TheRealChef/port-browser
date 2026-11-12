import { useAppearance } from '../../hooks/useAppearance';
import { useGlobalShortcuts } from '../../hooks/useGlobalShortcuts';
import { useSettings } from '../../stores/settingsStore';
import { CommandPalette } from '../../features/command-palette/CommandPalette';
import { ContextMenuHost } from '../common/ContextMenuHost';
import { DialogHost } from '../common/DialogHost';
import { ToastHost } from '../common/ToastHost';
import { Sidebar } from '../sidebar/Sidebar';
import { cn } from '../../utils/misc';
import { ContentArea } from './ContentArea';
import { TopBar } from './TopBar';

export function AppShell() {
  useAppearance();
  useGlobalShortcuts();
  const collapsed = useSettings((s) => s.sidebarCollapsed);

  return (
    <div className="flex h-full w-full overflow-hidden bg-canvas text-fg">
      <Sidebar />
      <div className={cn('flex min-w-0 flex-1 flex-col pb-2 pr-2', collapsed ? 'pl-2' : 'pl-0.5')}>
        <TopBar />
        <ContentArea />
      </div>
      <CommandPalette />
      <ContextMenuHost />
      <DialogHost />
      <ToastHost />
    </div>
  );
}
