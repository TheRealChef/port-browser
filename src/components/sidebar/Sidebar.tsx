import { useRef, useState } from 'react';
import { EntityIcon } from '../common/EntityIcon';
import { Compass, MoreHorizontal, Plus, Search, Settings } from 'lucide-react';
import { useBrowserHost, useNavigation } from '../../app/providers/hostContext';
import { ACCENTS } from '../../features/workspace/appearance';
import { buildSpaceMenu } from '../../features/workspace/menus';
import { activeView } from '../../features/workspace/selectors';
import { SIDEBAR_DEFAULT, SIDEBAR_MAX, SIDEBAR_MIN } from '../../stores/persistence';
import { useSettings } from '../../stores/settingsStore';
import { useUI } from '../../stores/uiStore';
import { useWorkspace } from '../../stores/workspaceStore';
import { cn, MOD_LABEL } from '../../utils/misc';
import { clamp } from '../../utils/validate';
import { IconButton } from '../common/IconButton';
import { Kbd } from '../common/Kbd';
import { showContextMenu, showMenuAt } from '../common/menu';
import { BookmarkList } from './BookmarkList';
import { DashboardList } from './DashboardList';
import { SidebarDnd } from './dnd';
import { SidebarTree } from './SidebarTree';
import { SpaceSwitcher } from './SpaceSwitcher';

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="size-[22px]" aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--surface-active)" />
      <path
        d="M9.5 10l6.5 13 6.5-13"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ResizeHandle({ onResize }: { onResize: (width: number | null) => void }) {
  const start = useRef<{ x: number; width: number } | null>(null);
  const storedWidth = useSettings((s) => s.sidebarWidth);
  const setSidebarWidth = useSettings((s) => s.setSidebarWidth);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      aria-valuemin={SIDEBAR_MIN}
      aria-valuemax={SIDEBAR_MAX}
      aria-valuenow={storedWidth}
      tabIndex={0}
      title="Drag to resize · double-click to reset"
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        start.current = { x: e.clientX, width: storedWidth };
        document.body.style.cursor = 'col-resize';
      }}
      onPointerMove={(e) => {
        if (!start.current) return;
        onResize(
          clamp(start.current.width + e.clientX - start.current.x, SIDEBAR_MIN, SIDEBAR_MAX),
        );
      }}
      onPointerUp={(e) => {
        if (!start.current) return;
        setSidebarWidth(start.current.width + e.clientX - start.current.x);
        start.current = null;
        onResize(null);
        document.body.style.cursor = '';
      }}
      onDoubleClick={() => setSidebarWidth(SIDEBAR_DEFAULT)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') setSidebarWidth(storedWidth - 16);
        if (e.key === 'ArrowRight') setSidebarWidth(storedWidth + 16);
      }}
      className="group absolute inset-y-0 -right-1.5 z-10 flex w-3 cursor-col-resize justify-center outline-none"
    >
      <span className="h-full w-[2px] rounded-full transition-ui group-hover:bg-accent/50 group-focus-visible:bg-accent/70 group-active:bg-accent" />
    </div>
  );
}

export function Sidebar() {
  const host = useBrowserHost();
  const nav = useNavigation();
  const collapsed = useSettings((s) => s.sidebarCollapsed);
  const storedWidth = useSettings((s) => s.sidebarWidth);
  const [liveWidth, setLiveWidth] = useState<number | null>(null);
  const space = useWorkspace((s) => s.spaces[s.activeSpaceId]);
  const view = useWorkspace(activeView);
  const showStart = useWorkspace((s) => s.showStart);
  const settingsOpen = useUI((s) => s.settingsOpen);
  const setSettingsOpen = useUI((s) => s.setSettingsOpen);
  const setPaletteOpen = useUI((s) => s.setPaletteOpen);

  if (collapsed || !space) return null;
  const width = liveWidth ?? storedWidth;
  const startActive = !settingsOpen && view.kind === 'start';

  return (
    <aside
      aria-label="Sidebar"
      className="relative flex h-full shrink-0 flex-col bg-sidebar"
      style={{ width }}
    >
      <SidebarDnd spaceId={space.id}>
        <div className="flex h-11 items-center gap-2 pl-3.5 pr-1.5">
          <Logo />
          <span className="flex-1 text-[14px] font-semibold tracking-tight">Vela</span>
          <IconButton
            icon={Search}
            label="Command palette"
            shortcut={`${MOD_LABEL}+K`}
            onClick={() => setPaletteOpen(true)}
          />
        </div>

        <div className="px-2.5 pb-2">
          <SpaceSwitcher />
        </div>

        <div className="flex items-center gap-2 px-3.5 pb-1 pt-1">
          <EntityIcon
            name={space.icon}
            size={14}
            style={{ color: ACCENTS[space.accent].value }}
            strokeWidth={2.2}
          />
          <h2
            className="min-w-0 flex-1 truncate text-[13px] font-semibold"
            onContextMenu={(e) => showContextMenu(e, buildSpaceMenu(space.id))}
          >
            {space.name}
          </h2>
          <IconButton
            size="sm"
            icon={MoreHorizontal}
            label="Space options"
            onClick={(e) => showMenuAt(e.currentTarget, buildSpaceMenu(space.id))}
          />
        </div>

        <div className="flex flex-col gap-px px-2.5 pb-2">
          <button
            type="button"
            onClick={() => nav.newTab()}
            className="flex h-row items-center gap-2 rounded-md px-2 text-[13px] text-fg-2 transition-ui hover:bg-hover hover:text-fg"
          >
            <Plus size={15} strokeWidth={2} className="text-fg-3" />
            <span className="flex-1 text-left">New tab</span>
            <Kbd>{MOD_LABEL}+T</Kbd>
          </button>
          <button
            type="button"
            aria-current={startActive ? 'page' : undefined}
            onClick={() => {
              setSettingsOpen(false);
              showStart();
            }}
            className={cn(
              'flex h-row items-center gap-2 rounded-md px-2 text-[13px] transition-ui',
              startActive ? 'bg-active text-fg' : 'text-fg-2 hover:bg-hover hover:text-fg',
            )}
          >
            <Compass
              size={15}
              strokeWidth={1.9}
              className={startActive ? 'text-accent' : 'text-fg-3'}
            />
            Start page
          </button>
        </div>

        <div className="mx-3 h-px bg-line" />

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2.5 pb-4 pt-3">
          <SidebarTree spaceId={space.id} />
          <div className="mt-3">
            <DashboardList spaceId={space.id} />
          </div>
          <div className="mt-3">
            <BookmarkList spaceId={space.id} />
          </div>
        </div>
      </SidebarDnd>

      <div className="flex items-center gap-1 border-t border-line px-2 py-1.5">
        <button
          type="button"
          onClick={() => setSettingsOpen(!settingsOpen)}
          aria-pressed={settingsOpen}
          className={cn(
            'flex h-8 flex-1 items-center gap-2 rounded-md px-2 text-[13px] transition-ui',
            settingsOpen ? 'bg-active text-fg' : 'text-fg-2 hover:bg-hover hover:text-fg',
          )}
        >
          <Settings size={15} strokeWidth={1.9} />
          Settings
        </button>
        <span
          title={`Browser host: ${host.label}`}
          className="rounded-md border border-line px-1.5 py-0.5 text-[10.5px] text-fg-3"
        >
          {host.kind === 'web' ? 'Web preview' : 'Native'}
        </span>
      </div>

      <ResizeHandle onResize={setLiveWidth} />
    </aside>
  );
}
