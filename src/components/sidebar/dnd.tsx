import { useState, type ReactNode } from 'react';
import { EntityIcon } from '../common/EntityIcon';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type Active,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type Over,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useUI } from '../../stores/uiStore';
import { useWorkspace } from '../../stores/workspaceStore';
import type { ID } from '../../types/models';
import {
  containerTabs,
  dashboardsOfSpace,
  groupsOfSpace,
  sortedSpaces,
  tabDisplayTitle,
} from '../../features/workspace/selectors';
import { ACCENTS } from '../../features/workspace/appearance';
import { Favicon } from '../common/Favicon';
import {
  DragStateContext,
  type ContainerId,
  type DragData,
  type SidebarDragState,
} from './dragState';

function containerTarget(container: ContainerId): { pinned: boolean; groupId: ID | null } {
  if (container === 'pinned') return { pinned: true, groupId: null };
  if (container === 'ungrouped') return { pinned: false, groupId: null };
  return { pinned: false, groupId: container.slice('group:'.length) };
}

const dataOf = (node: Active | Over | null): DragData | undefined =>
  node?.data.current as DragData | undefined;

const PRIORITY: Record<DragData['type'], number> = {
  tab: 0,
  group: 1,
  space: 2,
  dashboard: 2,
  container: 3,
};

/**
 * Prefers the most specific droppable under the pointer (tab > group > space > section),
 * falling back to closest-center for keyboard dragging.
 */
const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  if (hits.length === 0) return closestCenter(args);
  const rank = (id: string | number) => {
    const data = args.droppableContainers.find((d) => d.id === id)?.data.current as
      DragData | undefined;
    return data ? PRIORITY[data.type] : 9;
  };
  return [...hits].sort((a, b) => rank(a.id) - rank(b.id));
};

function overKeyFor(active: DragData | null, over: DragData | undefined): string | null {
  if (!active || !over) return null;
  if (active.type === 'group') {
    return over.type === 'group' ? `group:${over.groupId}` : null;
  }
  if (active.type !== 'tab') return null;
  switch (over.type) {
    case 'tab':
      return over.container;
    case 'group':
      return `group:${over.groupId}`;
    case 'container':
      return over.container;
    case 'space':
      return `space:${over.spaceId}`;
    case 'dashboard':
      return null;
  }
}

export function SidebarDnd({ spaceId, children }: { spaceId: ID; children: ReactNode }) {
  const [state, setState] = useState<SidebarDragState>({ active: null, overKey: null });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] },
    }),
  );

  const onDragStart = ({ active }: DragStartEvent) => {
    useUI.getState().closeContextMenu();
    setState({ active: dataOf(active) ?? null, overKey: null });
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    const key = overKeyFor(dataOf(active) ?? null, dataOf(over));
    setState((s) => (s.overKey === key ? s : { ...s, overKey: key }));
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setState({ active: null, overKey: null });
    const source = dataOf(active);
    const target = dataOf(over);
    if (!source || !target) return;
    const ws = useWorkspace.getState();

    if (source.type === 'group') {
      const groups = groupsOfSpace(ws.groups, spaceId);
      const overGroupId =
        target.type === 'group'
          ? target.groupId
          : target.type === 'tab' && target.container.startsWith('group:')
            ? target.container.slice('group:'.length)
            : null;
      const toIndex = groups.findIndex((g) => g.id === overGroupId);
      if (toIndex >= 0) ws.reorderGroup(source.groupId, toIndex);
      return;
    }
    if (source.type === 'space') {
      if (target.type !== 'space') return;
      const toIndex = sortedSpaces(ws.spaces).findIndex((sp) => sp.id === target.spaceId);
      if (toIndex >= 0) ws.reorderSpace(source.spaceId, toIndex);
      return;
    }
    if (source.type === 'dashboard') {
      if (target.type !== 'dashboard') return;
      const list = dashboardsOfSpace(ws.dashboards, spaceId);
      const toIndex = list.findIndex((d) => d.id === target.dashboardId);
      if (toIndex >= 0) ws.reorderDashboard(source.dashboardId, toIndex);
      return;
    }
    if (source.type !== 'tab') return;

    if (target.type === 'space') {
      if (target.spaceId === spaceId) return;
      ws.moveTab(source.tabId, { spaceId: target.spaceId });
      const name = ws.spaces[target.spaceId]?.name;
      if (name) useUI.getState().showToast(`Moved to ${name}`, 'success');
      return;
    }

    if (target.type === 'dashboard') return;

    if (target.type === 'tab') {
      if (target.tabId === source.tabId) return;
      const destination = containerTarget(target.container);
      const list = containerTabs(ws.tabs, spaceId, destination.pinned, destination.groupId);
      const index = list.findIndex((t) => t.id === target.tabId);
      ws.moveTab(source.tabId, { ...destination, index: index >= 0 ? index : undefined });
      return;
    }

    const container =
      target.type === 'group' ? (`group:${target.groupId}` as const) : target.container;
    if (container === source.container) return;
    ws.moveTab(source.tabId, containerTarget(container));
    if (target.type === 'group') ws.setGroupCollapsed(target.groupId, false);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => setState({ active: null, overKey: null })}
    >
      <DragStateContext.Provider value={state}>{children}</DragStateContext.Provider>
      <DragOverlay dropAnimation={null}>
        <DragPreview data={state.active} />
      </DragOverlay>
    </DndContext>
  );
}

function DragPreview({ data }: { data: DragData | null }) {
  const tab = useWorkspace((s) => (data?.type === 'tab' ? s.tabs[data.tabId] : undefined));
  const group = useWorkspace((s) => (data?.type === 'group' ? s.groups[data.groupId] : undefined));
  const space = useWorkspace((s) => (data?.type === 'space' ? s.spaces[data.spaceId] : undefined));
  const dashboard = useWorkspace((s) =>
    data?.type === 'dashboard' ? s.dashboards[data.dashboardId] : undefined,
  );
  if (space) {
    return (
      <div
        className="flex size-8 items-center justify-center rounded-lg bg-active shadow-pop"
        style={{ color: ACCENTS[space.accent].value }}
      >
        <EntityIcon name={space.icon} size={16} strokeWidth={2} />
      </div>
    );
  }
  if (dashboard) {
    return (
      <div className="flex h-row w-[220px] items-center gap-2 rounded-md bg-active px-2 text-[13px] shadow-pop">
        <EntityIcon name={dashboard.icon} size={15} className="text-accent" />
        <span className="truncate">{dashboard.name}</span>
      </div>
    );
  }
  if (tab) {
    return (
      <div className="flex h-row w-[220px] items-center gap-2 rounded-md bg-active px-2 text-[13px] shadow-pop">
        <Favicon url={tab.url} />
        <span className="truncate">{tabDisplayTitle(tab)}</span>
      </div>
    );
  }
  if (group) {
    return (
      <div className="flex h-row w-[220px] items-center gap-2 rounded-md bg-active px-2 text-[13px] font-medium shadow-pop">
        <EntityIcon name={group.icon} size={14} style={{ color: ACCENTS[group.accent].value }} />
        <span className="truncate">{group.name}</span>
      </div>
    );
  }
  return null;
}
