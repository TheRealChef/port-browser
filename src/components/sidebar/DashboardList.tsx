import { useMemo } from 'react';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LayoutDashboard, Plus } from 'lucide-react';
import { createDashboardFlow } from '../../features/workspace/actions';
import { buildDashboardMenu } from '../../features/workspace/menus';
import { activeView, dashboardsOfSpace } from '../../features/workspace/selectors';
import { selectPanelOpen, useUI } from '../../stores/uiStore';
import { useWorkspace } from '../../stores/workspaceStore';
import type { Dashboard, ID } from '../../types/models';
import { cn } from '../../utils/misc';
import { IconButton } from '../common/IconButton';
import { showContextMenu } from '../common/menu';
import { SectionHeader } from './SidebarTree';

export function DashboardList({ spaceId }: { spaceId: ID }) {
  const dashboards = useWorkspace((s) => s.dashboards);
  const view = useWorkspace(activeView);
  const settingsOpen = useUI(selectPanelOpen);
  const list = useMemo(() => dashboardsOfSpace(dashboards, spaceId), [dashboards, spaceId]);

  return (
    <section>
      <SectionHeader title="Dashboards">
        <IconButton
          size="sm"
          icon={Plus}
          label="New dashboard"
          tooltipSide="right"
          onClick={() => void createDashboardFlow()}
        />
      </SectionHeader>
      <div className="flex flex-col gap-px">
        <SortableContext
          items={list.map((d) => `dashboard:${d.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {list.map((d) => (
            <DashboardRow
              key={d.id}
              dashboard={d}
              active={!settingsOpen && view.kind === 'dashboard' && view.dashboardId === d.id}
            />
          ))}
        </SortableContext>
        {list.length === 0 && (
          <button
            type="button"
            onClick={() => void createDashboardFlow()}
            className="rounded-md px-2 py-1.5 text-left text-[12px] text-fg-3 transition-ui hover:bg-hover hover:text-fg-2"
          >
            Create a dashboard
          </button>
        )}
      </div>
    </section>
  );
}

function DashboardRow({ dashboard, active }: { dashboard: Dashboard; active: boolean }) {
  const openDashboard = useWorkspace((s) => s.openDashboard);
  const setSettingsOpen = useUI((s) => s.setSettingsOpen);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `dashboard:${dashboard.id}`,
    data: { type: 'dashboard', dashboardId: dashboard.id },
  });
  const open = () => {
    setSettingsOpen(false);
    openDashboard(dashboard.id);
  };
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-current={active ? 'page' : undefined}
      aria-label={dashboard.name}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      onClick={open}
      onKeyDown={(e) => {
        listeners?.onKeyDown?.(e);
        if (!e.defaultPrevented && e.key === 'Enter') open();
      }}
      onContextMenu={(e) => showContextMenu(e, buildDashboardMenu(dashboard.id))}
      className={cn(
        'flex h-row items-center gap-2 rounded-lg px-2 text-left text-[13px] outline-none transition-ui',
        'focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]',
        active ? 'bg-selected text-fg' : 'text-fg-2 hover:bg-hover hover:text-fg',
        isDragging && 'opacity-40',
      )}
    >
      <LayoutDashboard
        size={15}
        className={active ? 'text-accent' : 'text-fg-3'}
        strokeWidth={1.9}
      />
      <span className="truncate">{dashboard.name}</span>
    </div>
  );
}
