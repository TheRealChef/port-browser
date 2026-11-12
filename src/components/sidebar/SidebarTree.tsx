import { useMemo, type ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { useNavigation } from '../../app/providers/hostContext';
import { createGroupFlow } from '../../features/workspace/actions';
import { activeView, containerTabs, groupsOfSpace } from '../../features/workspace/selectors';
import { useWorkspace } from '../../stores/workspaceStore';
import type { ID } from '../../types/models';
import { cn } from '../../utils/misc';
import { IconButton } from '../common/IconButton';
import { useSidebarDrag, type ContainerId } from './dragState';
import { GroupBlock } from './GroupBlock';
import { PinnedTile, TabRow } from './TabRow';

export function SectionHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex h-7 items-center pl-2 pr-0.5">
      <h3 className="flex-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

function DropZone({
  container,
  className,
  children,
}: {
  container: ContainerId;
  className?: string;
  children: ReactNode;
}) {
  const { setNodeRef } = useDroppable({
    id: `container:${container}`,
    data: { type: 'container', container },
  });
  const drag = useSidebarDrag();
  const highlighted =
    drag.overKey === container &&
    drag.active?.type === 'tab' &&
    drag.active.container !== container;
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-lg transition-ui',
        highlighted && 'bg-drop-soft ring-1 ring-[var(--focus-ring)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SidebarTree({ spaceId }: { spaceId: ID }) {
  const nav = useNavigation();
  const tabs = useWorkspace((s) => s.tabs);
  const groups = useWorkspace((s) => s.groups);
  const view = useWorkspace(activeView);
  const drag = useSidebarDrag();
  const activeTabId = view.kind === 'tab' ? view.tabId : null;

  const pinned = useMemo(() => containerTabs(tabs, spaceId, true, null), [tabs, spaceId]);
  const ungrouped = useMemo(() => containerTabs(tabs, spaceId, false, null), [tabs, spaceId]);
  const spaceGroups = useMemo(() => groupsOfSpace(groups, spaceId), [groups, spaceId]);
  const groupTabs = useMemo(
    () => new Map(spaceGroups.map((g) => [g.id, containerTabs(tabs, spaceId, false, g.id)])),
    [spaceGroups, tabs, spaceId],
  );
  const draggingTab = drag.active?.type === 'tab';

  return (
    <div className="flex flex-col gap-3">
      {(pinned.length > 0 || draggingTab) && (
        <DropZone container="pinned" className="p-0.5">
          <SortableContext items={pinned.map((t) => `tab:${t.id}`)} strategy={rectSortingStrategy}>
            {pinned.length > 0 ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(48px,1fr))] gap-1.5">
                {pinned.map((tab) => (
                  <PinnedTile key={tab.id} tab={tab} active={tab.id === activeTabId} />
                ))}
              </div>
            ) : (
              <div className="flex h-10 items-center justify-center rounded-lg border border-dashed border-line-strong text-[12px] text-fg-3">
                Drop here to pin
              </div>
            )}
          </SortableContext>
        </DropZone>
      )}

      <section>
        <SectionHeader title="Groups">
          <IconButton
            size="sm"
            icon={Plus}
            label="New group"
            tooltipSide="right"
            onClick={() => void createGroupFlow(spaceId)}
          />
        </SectionHeader>
        <SortableContext
          items={spaceGroups.map((g) => `group:${g.id}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-0.5">
            {spaceGroups.map((group) => (
              <GroupBlock
                key={group.id}
                group={group}
                tabs={groupTabs.get(group.id) ?? []}
                activeTabId={activeTabId}
              />
            ))}
          </div>
        </SortableContext>
        {spaceGroups.length === 0 && (
          <button
            type="button"
            onClick={() => void createGroupFlow(spaceId)}
            className="w-full rounded-md px-2 py-1.5 text-left text-[12px] text-fg-3 transition-ui hover:bg-hover hover:text-fg-2"
          >
            Create a group to organise tabs
          </button>
        )}
      </section>

      <section>
        <SectionHeader title="Tabs">
          <IconButton
            size="sm"
            icon={Plus}
            label="New tab"
            tooltipSide="right"
            onClick={() => nav.newTab()}
          />
        </SectionHeader>
        <DropZone container="ungrouped" className="min-h-8">
          <SortableContext
            items={ungrouped.map((t) => `tab:${t.id}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-px">
              {ungrouped.map((tab) => (
                <TabRow
                  key={tab.id}
                  tab={tab}
                  active={tab.id === activeTabId}
                  container="ungrouped"
                />
              ))}
            </div>
          </SortableContext>
          {ungrouped.length === 0 && (
            <p className="px-2 py-1.5 text-[12px] text-fg-3">
              {draggingTab ? 'Drop here to ungroup' : 'No ungrouped tabs'}
            </p>
          )}
        </DropZone>
      </section>
    </div>
  );
}
