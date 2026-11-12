import { useMemo } from 'react';
import { EntityIcon } from '../common/EntityIcon';
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus } from 'lucide-react';
import { createSpaceFlow } from '../../features/workspace/actions';
import { ACCENTS } from '../../features/workspace/appearance';
import { buildSpaceMenu } from '../../features/workspace/menus';
import { sortedSpaces } from '../../features/workspace/selectors';
import { useUI } from '../../stores/uiStore';
import { useWorkspace } from '../../stores/workspaceStore';
import type { Space } from '../../types/models';
import { cn, MOD_LABEL } from '../../utils/misc';
import { IconButton } from '../common/IconButton';
import { showContextMenu } from '../common/menu';
import { Tooltip } from '../common/Tooltip';
import { useSidebarDrag } from './dragState';

function SpaceButton({ space, index, active }: { space: Space; index: number; active: boolean }) {
  const switchSpace = useWorkspace((s) => s.switchSpace);
  const setSettingsOpen = useUI((s) => s.setSettingsOpen);
  const drag = useSidebarDrag();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `space:${space.id}`,
    data: { type: 'space', spaceId: space.id },
  });
  const color = ACCENTS[space.accent].value;
  const isDropTarget = drag.overKey === `space:${space.id}` && !active;

  return (
    <Tooltip label={space.name} shortcut={index < 9 ? `${MOD_LABEL}+${index + 1}` : undefined}>
      <button
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        type="button"
        aria-label={`Switch to ${space.name}`}
        aria-pressed={active}
        onClick={() => {
          setSettingsOpen(false);
          switchSpace(space.id);
        }}
        onContextMenu={(e) => showContextMenu(e, buildSpaceMenu(space.id))}
        className={cn(
          'relative flex h-8 min-w-8 flex-1 items-center justify-center rounded-lg transition-ui',
          active ? 'shadow-lift' : 'text-fg-3 hover:bg-hover hover:text-fg-2',
          isDropTarget && 'ring-2 ring-[var(--focus-ring)]',
          isDragging && 'opacity-40',
        )}
        style={{
          transform: CSS.Translate.toString(transform),
          transition,
          color: active || isDropTarget ? color : undefined,
          background: active ? `color-mix(in oklab, ${color} 17%, var(--surface))` : undefined,
        }}
      >
        <EntityIcon name={space.icon} size={16} strokeWidth={2} />
        {active && (
          <span
            className="absolute bottom-0.5 h-[2px] w-3 rounded-full"
            style={{ background: color }}
          />
        )}
      </button>
    </Tooltip>
  );
}

export function SpaceSwitcher() {
  const spaces = useWorkspace((s) => s.spaces);
  const activeSpaceId = useWorkspace((s) => s.activeSpaceId);
  const list = useMemo(() => sortedSpaces(spaces), [spaces]);

  return (
    <nav
      aria-label="Spaces"
      className="flex items-center gap-1 rounded-xl border border-line bg-canvas/55 p-1"
    >
      <SortableContext
        items={list.map((sp) => `space:${sp.id}`)}
        strategy={horizontalListSortingStrategy}
      >
        {list.map((space, index) => (
          <SpaceButton
            key={space.id}
            space={space}
            index={index}
            active={space.id === activeSpaceId}
          />
        ))}
      </SortableContext>
      <IconButton
        icon={Plus}
        label="New space"
        onClick={() => void createSpaceFlow()}
        className="text-fg-3"
      />
    </nav>
  );
}
