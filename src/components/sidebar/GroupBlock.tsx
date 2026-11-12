import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { EntityIcon } from '../common/EntityIcon';
import { CSS } from '@dnd-kit/utilities';
import { ChevronRight, MoreHorizontal, Plus } from 'lucide-react';
import { useNavigation } from '../../app/providers/hostContext';
import { ACCENTS } from '../../features/workspace/appearance';
import { buildGroupMenu } from '../../features/workspace/menus';
import { useWorkspace } from '../../stores/workspaceStore';
import type { Group, Tab } from '../../types/models';
import { cn } from '../../utils/misc';
import { IconButton } from '../common/IconButton';
import { showContextMenu, showMenuAt } from '../common/menu';
import { useSidebarDrag } from './dragState';
import { TabRow } from './TabRow';

interface GroupBlockProps {
  group: Group;
  tabs: Tab[];
  activeTabId: string | null;
}

export function GroupBlock({ group, tabs, activeTabId }: GroupBlockProps) {
  const nav = useNavigation();
  const setGroupCollapsed = useWorkspace((s) => s.setGroupCollapsed);
  const drag = useSidebarDrag();
  const container = `group:${group.id}` as const;
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `group:${group.id}`, data: { type: 'group', groupId: group.id } });
  const color = ACCENTS[group.accent].value;
  const isDropTarget =
    drag.overKey === container &&
    drag.active?.type === 'tab' &&
    drag.active.container !== container;
  const visibleTabs = group.collapsed ? tabs.filter((t) => t.id === activeTabId) : tabs;
  const toggle = () => setGroupCollapsed(group.id, !group.collapsed);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'rounded-lg transition-ui',
        isDropTarget && 'bg-accent-soft ring-1 ring-[var(--accent-ring)]',
        isDragging && 'opacity-40',
      )}
    >
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-expanded={!group.collapsed}
        aria-label={`${group.name} group, ${tabs.length} tabs`}
        onClick={toggle}
        onKeyDown={(e) => {
          listeners?.onKeyDown?.(e);
          if (e.defaultPrevented) return;
          if (e.key === 'Enter') toggle();
          if (e.key === 'ArrowRight' && group.collapsed) toggle();
          if (e.key === 'ArrowLeft' && !group.collapsed) toggle();
        }}
        onContextMenu={(e) => showContextMenu(e, buildGroupMenu(group.id, nav))}
        className="group/header flex h-row items-center gap-1.5 rounded-md pl-1 pr-1 text-[13px] text-fg-2 outline-none transition-ui hover:bg-hover hover:text-fg focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
      >
        <ChevronRight
          size={13}
          className={cn(
            'shrink-0 text-fg-3 transition-transform duration-150',
            !group.collapsed && 'rotate-90',
          )}
        />
        <EntityIcon
          name={group.icon}
          size={14}
          style={{ color }}
          strokeWidth={2.1}
          className="shrink-0"
        />
        <span className="min-w-0 flex-1 truncate font-medium">{group.name}</span>
        <span className="pr-1 text-[11px] tabular-nums text-fg-3 group-hover/header:hidden">
          {tabs.length}
        </span>
        <div
          className="hidden items-center group-focus-within/header:flex group-hover/header:flex"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <IconButton
            size="sm"
            icon={Plus}
            label="New tab in group"
            tabIndex={-1}
            onClick={() => nav.newTab({ groupId: group.id })}
          />
          <IconButton
            size="sm"
            icon={MoreHorizontal}
            label="Group options"
            tabIndex={-1}
            onClick={(e) => showMenuAt(e.currentTarget, buildGroupMenu(group.id, nav))}
          />
        </div>
      </div>

      <SortableContext
        items={visibleTabs.map((t) => `tab:${t.id}`)}
        strategy={verticalListSortingStrategy}
      >
        {visibleTabs.length > 0 && (
          <div
            className="relative ml-[13px] flex flex-col gap-px border-l pl-1.5"
            style={{ borderColor: `color-mix(in oklab, ${color} 30%, transparent)` }}
          >
            {visibleTabs.map((tab) => (
              <TabRow
                key={tab.id}
                tab={tab}
                active={tab.id === activeTabId}
                container={container}
              />
            ))}
          </div>
        )}
        {!group.collapsed && tabs.length === 0 && (
          <p className="ml-[13px] border-l border-line py-1 pl-3 text-[12px] text-fg-3">
            Drop tabs here
          </p>
        )}
      </SortableContext>
    </div>
  );
}
