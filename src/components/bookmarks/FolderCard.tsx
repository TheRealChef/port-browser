import { useContext, useMemo } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { buildFolderMenu } from '../../features/bookmarks/bookmarkMenu';
import { deleteFolderFlow, editFolderFlow } from '../../features/bookmarks/bookmarkActions';
import { ACCENTS } from '../../features/workspace/appearance';
import { descendantFolderIds } from '../../features/workspace/selectors';
import { useWorkspace } from '../../stores/workspaceStore';
import type { BookmarkFolder } from '../../types/models';
import { cn } from '../../utils/misc';
import { EntityIcon } from '../common/EntityIcon';
import { Favicon } from '../common/Favicon';
import { showContextMenu, showMenuAt } from '../common/menu';
import type { LibraryLayout, TileSize } from './dragTypes';
import { DropHintContext } from './library';

interface FolderCardProps {
  folder: BookmarkFolder;
  size: TileSize;
  layout: LibraryLayout;
  path?: string;
}

export function FolderCard({ folder, size, layout, path }: FolderCardProps) {
  const folders = useWorkspace((s) => s.bookmarkFolders);
  const bookmarks = useWorkspace((s) => s.bookmarks);
  const showBookmarks = useWorkspace((s) => s.showBookmarks);
  const hint = useContext(DropHintContext);

  const stats = useMemo(() => {
    const ids = descendantFolderIds(folders, folder.id);
    const inside = Object.values(bookmarks)
      .filter((b) => b.folderId !== null && ids.has(b.folderId))
      .sort(
        (a, b) =>
          (a.folderId === folder.id ? 0 : 1) - (b.folderId === folder.id ? 0 : 1) ||
          a.order - b.order,
      );
    return {
      bookmarks: inside.length,
      folders: ids.size - 1,
      preview: inside.slice(0, 4),
    };
  }, [folders, bookmarks, folder.id]);

  const dragId = `fd:${folder.id}`;
  const drag = useDraggable({ id: dragId, data: { type: 'folder', folderId: folder.id } });
  const drop = useDroppable({
    id: `fdrop:${folder.id}`,
    data: { type: 'target', folderId: folder.id, axis: layout === 'list' ? 'y' : 'x' },
  });
  const zone = hint?.id === `fdrop:${folder.id}` ? hint.zone : null;
  const accent = ACCENTS[folder.accent].value;
  const open = () => showBookmarks(folder.id);
  const summary = [
    `${stats.bookmarks} ${stats.bookmarks === 1 ? 'bookmark' : 'bookmarks'}`,
    stats.folders > 0 && `${stats.folders} ${stats.folders === 1 ? 'folder' : 'folders'}`,
  ]
    .filter(Boolean)
    .join(' · ');

  const icon = (px: number, box: string) => (
    <span
      className={cn('flex shrink-0 items-center justify-center rounded-lg', box)}
      style={{ color: accent, background: `color-mix(in oklab, ${accent} 16%, transparent)` }}
    >
      <EntityIcon name={folder.icon} size={px} strokeWidth={2} />
    </span>
  );

  return (
    <div
      ref={(node) => {
        drag.setNodeRef(node);
        drop.setNodeRef(node);
      }}
      {...drag.attributes}
      {...drag.listeners}
      data-nav-item
      role="link"
      aria-label={`Folder ${folder.name}, ${summary}`}
      title={`${folder.name}\n${summary}`}
      onClick={open}
      onContextMenu={(e) => showContextMenu(e, buildFolderMenu(folder.id))}
      onKeyDown={(e) => {
        if (e.key === 'Enter') open();
        else if (e.key === 'F2') void editFolderFlow(folder.id);
        else if (e.key === 'Delete') void deleteFolderFlow(folder.id);
        else return;
        e.preventDefault();
      }}
      className={cn(
        'group/tile relative cursor-default select-none outline-none transition-ui',
        'focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]',
        drag.isDragging && 'opacity-40',
        layout === 'list'
          ? 'flex h-10 items-center gap-3 rounded-lg px-3 hover:bg-hover'
          : 'rounded-xl border bg-raised/70 shadow-card hover:bg-hover',
        layout === 'grid' &&
          (zone === 'into' ? 'border-accent' : 'border-line hover:border-line-strong'),
        zone === 'into' && 'bg-[var(--accent-soft)] ring-2 ring-[var(--accent-ring)]',
        layout === 'grid' &&
          size === 'sm' &&
          'flex h-[84px] flex-col items-center justify-center gap-2 px-2',
        layout === 'grid' && size === 'md' && 'flex h-[64px] items-center gap-3 px-3',
        layout === 'grid' && size === 'lg' && 'flex flex-col overflow-hidden',
      )}
    >
      {zone && zone !== 'into' && (
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute rounded-full bg-accent',
            layout === 'list'
              ? cn('inset-x-2 h-0.5', zone === 'before' ? '-top-px' : '-bottom-px')
              : cn('inset-y-2 w-0.5', zone === 'before' ? '-left-1.5' : '-right-1.5'),
          )}
        />
      )}
      {layout === 'list' ? (
        <>
          {icon(13, 'size-6')}
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-fg">
            {folder.name}
          </span>
          <span className="hidden w-[32%] truncate text-[12px] text-fg-3 md:block">{summary}</span>
          {path !== undefined && (
            <span className="hidden w-[22%] truncate text-[12px] text-fg-3 lg:block">{path}</span>
          )}
          <ChevronRight size={14} className="text-fg-3" />
        </>
      ) : size === 'sm' ? (
        <>
          {icon(17, 'size-9')}
          <span className="w-full truncate text-center text-[12px] font-medium text-fg">
            {folder.name}
          </span>
          <MoreButton folderId={folder.id} />
        </>
      ) : size === 'md' ? (
        <>
          {icon(17, 'size-9')}
          <span className="min-w-0 flex-1 pr-6">
            <span className="block truncate text-[13px] font-medium text-fg">{folder.name}</span>
            <span className="block truncate text-[11.5px] text-fg-3">{path ?? summary}</span>
          </span>
          <MoreButton folderId={folder.id} />
        </>
      ) : (
        <>
          <div
            className="grid h-[76px] grid-cols-4 place-items-center gap-1 px-3 py-2"
            style={{
              background: `radial-gradient(120% 140% at 0% 0%, color-mix(in oklab, ${accent} 26%, transparent), color-mix(in oklab, ${accent} 5%, transparent))`,
            }}
          >
            {stats.preview.length === 0 ? (
              <span className="col-span-4 text-[11.5px] text-fg-3">Empty folder</span>
            ) : (
              stats.preview.map((b) => (
                <span
                  key={b.id}
                  className="flex size-7 items-center justify-center rounded-lg bg-white/85 shadow-card"
                >
                  <Favicon url={b.url} size={15} />
                </span>
              ))
            )}
          </div>
          <div className="flex items-center gap-2.5 px-3 pb-2.5 pt-2">
            {icon(13, 'size-6')}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-fg">{folder.name}</span>
              <span className="block truncate text-[11.5px] text-fg-3">{path ?? summary}</span>
            </span>
          </div>
          <MoreButton folderId={folder.id} />
        </>
      )}
    </div>
  );
}

function MoreButton({ folderId }: { folderId: string }) {
  return (
    <button
      type="button"
      aria-label="Folder options"
      title="Folder options"
      tabIndex={-1}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        showMenuAt(e.currentTarget, buildFolderMenu(folderId));
      }}
      className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-md bg-raised/90 text-fg-2 opacity-0 shadow-card transition-ui hover:bg-surface hover:text-fg group-focus-within/tile:opacity-100 group-hover/tile:opacity-100"
    >
      <MoreHorizontal size={12} />
    </button>
  );
}
