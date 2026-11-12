import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Columns2, GripVertical, MoreHorizontal, Pencil, Square, Trash2 } from 'lucide-react';
import { askText } from '../common/dialogs';
import { menu, showMenuAt } from '../common/menu';
import { groupsOfSpace } from '../../features/workspace/selectors';
import { folderOptions } from '../../features/bookmarks/bookmarkActions';
import type { MenuEntry } from '../../stores/uiStore';
import { useWorkspace } from '../../stores/workspaceStore';
import type { Dashboard, Widget } from '../../types/models';
import { WIDGET_META } from './widgetMeta';
import { cn } from '../../utils/misc';
import { Card } from '../common/Card';
import { IconButton } from '../common/IconButton';
import {
  BookmarksBody,
  GroupLauncherBody,
  QuickLinksBody,
  RecentTabsBody,
} from './widgets/widgetBodies';

function widgetMenu(dashboard: Dashboard, widget: Widget): MenuEntry[] {
  const ws = () => useWorkspace.getState();
  const items: MenuEntry[] = [
    menu.item(
      'Rename…',
      async () => {
        const title = await askText({
          title: 'Rename widget',
          label: 'Title',
          initial: widget.title,
        });
        if (title) ws().updateWidget(dashboard.id, widget.id, { title });
      },
      { icon: Pencil },
    ),
    menu.item(
      widget.layout.colSpan === 2 ? 'Normal width' : 'Wide',
      () =>
        ws().updateWidget(dashboard.id, widget.id, {
          colSpan: widget.layout.colSpan === 2 ? 1 : 2,
        }),
      { icon: widget.layout.colSpan === 2 ? Square : Columns2 },
    ),
  ];

  if (widget.kind === 'recentTabs') {
    items.push(
      menu.submenu(
        'Show',
        [4, 6, 10].map((n) =>
          menu.item(`${n} tabs`, () => ws().updateWidget(dashboard.id, widget.id, { limit: n }), {
            checked: widget.limit === n,
          }),
        ),
      ),
    );
  }

  if (widget.kind === 'bookmarks') {
    items.push(
      menu.submenu(
        'Folder',
        folderOptions(dashboard.spaceId).map((option) =>
          menu.item(
            option.label,
            () => ws().updateWidget(dashboard.id, widget.id, { folderId: option.value || null }),
            { checked: (widget.folderId ?? '') === option.value },
          ),
        ),
      ),
    );
  }

  if (widget.kind === 'groupLauncher') {
    const groups = groupsOfSpace(ws().groups, dashboard.spaceId);
    const selected = widget.groupIds;
    items.push(
      menu.submenu('Groups', [
        menu.item(
          'All groups',
          () => ws().updateWidget(dashboard.id, widget.id, { groupIds: null }),
          {
            checked: selected === null,
          },
        ),
        menu.separator(),
        ...groups.map((g) =>
          menu.item(
            g.name,
            () => {
              const current = selected ?? groups.map((x) => x.id);
              const next = current.includes(g.id)
                ? current.filter((id) => id !== g.id)
                : [...current, g.id];
              ws().updateWidget(dashboard.id, widget.id, { groupIds: next });
            },
            { checked: selected === null || selected.includes(g.id) },
          ),
        ),
      ]),
    );
  }

  items.push(
    menu.separator(),
    menu.item('Remove widget', () => ws().removeWidget(dashboard.id, widget.id), {
      icon: Trash2,
      danger: true,
    }),
  );
  return items;
}

export function WidgetCard({ dashboard, widget }: { dashboard: Dashboard; widget: Widget }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });
  const meta = WIDGET_META[widget.kind];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        widget.layout.colSpan === 2 && 'md:col-span-2',
        isDragging && 'relative z-10 opacity-80 [&>section]:shadow-pop',
      )}
    >
      <Card
        title={widget.title}
        icon={meta.icon}
        tone={meta.tone}
        variant={meta.variant}
        className="h-full"
        actions={
          <div className="flex items-center">
            <button
              ref={setActivatorNodeRef}
              type="button"
              aria-label={`Reorder ${widget.title}`}
              className="flex size-6 cursor-grab items-center justify-center rounded-md text-fg-3 transition-ui hover:bg-hover hover:text-fg active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical size={14} />
            </button>
            <IconButton
              size="sm"
              icon={MoreHorizontal}
              label="Widget options"
              onClick={(e) => showMenuAt(e.currentTarget, widgetMenu(dashboard, widget))}
            />
          </div>
        }
      >
        <WidgetBody dashboard={dashboard} widget={widget} />
      </Card>
    </div>
  );
}

function WidgetBody({ dashboard, widget }: { dashboard: Dashboard; widget: Widget }) {
  switch (widget.kind) {
    case 'bookmarks':
      return <BookmarksBody dashboard={dashboard} widget={widget} />;
    case 'quickLinks':
      return <QuickLinksBody dashboard={dashboard} widget={widget} />;
    case 'recentTabs':
      return <RecentTabsBody dashboard={dashboard} widget={widget} />;
    case 'groupLauncher':
      return <GroupLauncherBody dashboard={dashboard} widget={widget} />;
  }
}
