import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { LayoutDashboard, MoreHorizontal, Plus } from '../icons';
import { buildDashboardMenu } from '../../features/workspace/menus';
import { useWorkspace } from '../../stores/workspaceStore';
import { WIDGET_KINDS, type Dashboard } from '../../types/models';
import { Button } from '../common/Button';
import { IconButton } from '../common/IconButton';
import { menu, showMenuAt } from '../common/menu';
import { renameDashboardFlow } from '../../features/workspace/actions';
import { StartPage } from '../start/StartPage';
import { WidgetCard } from './WidgetCard';
import { WIDGET_META } from './widgetMeta';

export function DashboardView({ dashboardId }: { dashboardId: string }) {
  const dashboard = useWorkspace((s) => s.dashboards[dashboardId]);
  if (!dashboard) return <StartPage />;
  return <DashboardContent dashboard={dashboard} />;
}

function addWidgetMenu(dashboard: Dashboard) {
  const addWidget = useWorkspace.getState().addWidget;
  return WIDGET_KINDS.map((kind) =>
    menu.item(WIDGET_META[kind].label, () => addWidget(dashboard.id, kind), {
      icon: WIDGET_META[kind].icon,
    }),
  );
}

function DashboardContent({ dashboard }: { dashboard: Dashboard }) {
  const spaceName = useWorkspace((s) => s.spaces[dashboard.spaceId]?.name ?? '');
  const reorderWidget = useWorkspace((s) => s.reorderWidget);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const toIndex = dashboard.widgets.findIndex((w) => w.id === over.id);
    if (toIndex >= 0) reorderWidget(dashboard.id, String(active.id), toIndex);
  };

  return (
    <div className="relative h-full overflow-y-auto">
      <div className="relative mx-auto flex max-w-[1180px] flex-col gap-5 px-8 pb-12 pt-9">
        <header className="flex items-center gap-3.5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent-ink shadow-card">
            <LayoutDashboard size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <button
              type="button"
              title="Rename dashboard"
              onClick={() => void renameDashboardFlow(dashboard.id)}
              className="-ml-1 block max-w-full truncate rounded-md px-1 text-left text-[22px] font-semibold tracking-[-0.015em] transition-ui hover:bg-hover"
            >
              {dashboard.name}
            </button>
            <p className="text-[12px] text-fg-3">
              {spaceName} · <span className="tabular">{dashboard.widgets.length}</span>{' '}
              {dashboard.widgets.length === 1 ? 'widget' : 'widgets'}
            </p>
          </div>
          <Button
            icon={Plus}
            onClick={(e) => showMenuAt(e.currentTarget, addWidgetMenu(dashboard))}
          >
            Add widget
          </Button>
          <IconButton
            icon={MoreHorizontal}
            label="Dashboard options"
            onClick={(e) => showMenuAt(e.currentTarget, buildDashboardMenu(dashboard.id))}
          />
        </header>

        {dashboard.widgets.length === 0 ? (
          <div className="empty rounded-[14px] border-[1.5px] border-dashed border-line-strong py-14">
            <h4>This dashboard is empty</h4>
            <p>
              Widgets collect bookmarks, quick links, recent tabs and group shortcuts in one place.
            </p>
            <Button
              variant="primary"
              icon={Plus}
              onClick={(e) => showMenuAt(e.currentTarget, addWidgetMenu(dashboard))}
            >
              Add a widget
            </Button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={dashboard.widgets.map((w) => w.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {dashboard.widgets.map((widget) => (
                  <WidgetCard key={widget.id} dashboard={dashboard} widget={widget} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
