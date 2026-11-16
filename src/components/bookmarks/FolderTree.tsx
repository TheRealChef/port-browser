import { useContext, useMemo } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { ChevronRight, Library } from '../icons';
import { buildFolderMenu } from '../../features/bookmarks/bookmarkMenu';
import { ACCENTS } from '../../features/workspace/appearance';
import { foldersIn } from '../../features/workspace/selectors';
import { useWorkspace } from '../../stores/workspaceStore';
import type { Bookmark, BookmarkFolder, ID } from '../../types/models';
import { cn } from '../../utils/misc';
import { EntityIcon } from '../common/EntityIcon';
import { showContextMenu } from '../common/menu';
import { DropHintContext } from './library';

interface FolderTreeProps {
  spaceId: ID;
  currentId: ID | null;
}

/** Collapsible folder hierarchy; every row is a drop target and folders are draggable. */
export function FolderTree({ spaceId, currentId }: FolderTreeProps) {
  const folders = useWorkspace((s) => s.bookmarkFolders);
  const bookmarks = useWorkspace((s) => s.bookmarks);
  const showBookmarks = useWorkspace((s) => s.showBookmarks);

  const counts = useMemo(() => directCounts(bookmarks, spaceId), [bookmarks, spaceId]);
  const { setNodeRef: setRootRef, isOver: rootOver } = useDroppable({
    id: 'tree:root',
    data: { type: 'target', folderId: null },
  });

  return (
    <nav aria-label="Bookmark folders" className="flex flex-col gap-px" role="tree">
      <button
        ref={setRootRef}
        type="button"
        role="treeitem"
        aria-selected={currentId === null}
        onClick={() => showBookmarks(null, spaceId)}
        className={cn(
          'flex h-8 items-center gap-2 rounded-md px-2 text-left text-[13px] transition-ui',
          currentId === null ? 'bg-selected text-fg' : 'text-fg-2 hover:bg-hover hover:text-fg',
          rootOver && 'drop-target',
        )}
      >
        <Library size={15} className="shrink-0 text-accent" />
        <span className="flex-1 truncate font-medium">All bookmarks</span>
        <span className="text-[11px] tabular-nums text-fg-3">{countSpace(bookmarks, spaceId)}</span>
      </button>
      <TreeLevel
        folders={folders}
        spaceId={spaceId}
        parentId={null}
        depth={0}
        currentId={currentId}
        counts={counts}
      />
    </nav>
  );
}

interface LevelProps {
  folders: Record<ID, BookmarkFolder>;
  spaceId: ID;
  parentId: ID | null;
  depth: number;
  currentId: ID | null;
  counts: Map<ID | null, number>;
}

function TreeLevel(props: LevelProps) {
  const { folders, spaceId, parentId } = props;
  const children = useMemo(
    () => foldersIn(folders, spaceId, parentId),
    [folders, spaceId, parentId],
  );
  return (
    <>
      {children.map((folder) => (
        <TreeRow key={folder.id} folder={folder} {...props} />
      ))}
    </>
  );
}

function TreeRow({ folder, ...props }: LevelProps & { folder: BookmarkFolder }) {
  const { folders, depth, currentId, counts } = props;
  const showBookmarks = useWorkspace((s) => s.showBookmarks);
  const updateFolder = useWorkspace((s) => s.updateFolder);
  const hint = useContext(DropHintContext);
  const hasChildren = useMemo(
    () => Object.values(folders).some((f) => f.parentId === folder.id),
    [folders, folder.id],
  );
  const expanded = hasChildren && !folder.collapsed;
  const drag = useDraggable({
    id: `tree:${folder.id}`,
    data: { type: 'folder', folderId: folder.id },
  });
  const drop = useDroppable({
    id: `tdrop:${folder.id}`,
    data: { type: 'target', folderId: folder.id, axis: 'y' },
  });
  const zone = hint?.id === `tdrop:${folder.id}` ? hint.zone : null;
  const active = currentId === folder.id;
  const accent = ACCENTS[folder.accent].value;

  return (
    <>
      <div
        ref={(node) => {
          drag.setNodeRef(node);
          drop.setNodeRef(node);
        }}
        {...drag.attributes}
        {...drag.listeners}
        role="treeitem"
        aria-selected={active}
        aria-expanded={hasChildren ? expanded : undefined}
        onClick={() => showBookmarks(folder.id)}
        onContextMenu={(e) => showContextMenu(e, buildFolderMenu(folder.id))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') showBookmarks(folder.id);
          else if (e.key === 'ArrowRight' && hasChildren)
            updateFolder(folder.id, { collapsed: false });
          else if (e.key === 'ArrowLeft' && hasChildren)
            updateFolder(folder.id, { collapsed: true });
          else return;
          e.preventDefault();
        }}
        style={{ paddingLeft: 4 + depth * 14 }}
        className={cn(
          'group/row relative flex h-8 cursor-default select-none items-center gap-1.5 rounded-md pr-2 text-[13px] outline-none transition-ui',
          'focus-inset',
          active ? 'bg-selected text-fg' : 'text-fg-2 hover:bg-hover hover:text-fg',
          drag.isDragging && 'opacity-40',
          zone === 'into' && 'drop-target',
        )}
      >
        {zone && zone !== 'into' && (
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute right-1 h-0.5 rounded-full bg-drop',
              zone === 'before' ? '-top-px' : '-bottom-px',
            )}
            style={{ left: 8 + depth * 14 }}
          />
        )}
        <button
          type="button"
          tabIndex={-1}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            updateFolder(folder.id, { collapsed: expanded });
          }}
          className={cn(
            'flex size-4 shrink-0 items-center justify-center rounded text-fg-3 hover:text-fg',
            !hasChildren && 'invisible',
          )}
        >
          <ChevronRight size={12} className={cn('transition-transform', expanded && 'rotate-90')} />
        </button>
        <span className="shrink-0" style={{ color: accent }}>
          <EntityIcon name={folder.icon} size={14} />
        </span>
        <span className="min-w-0 flex-1 truncate">{folder.name}</span>
        <span className="text-[11px] tabular-nums text-fg-3">{counts.get(folder.id) || ''}</span>
      </div>
      {expanded && <TreeLevel {...props} parentId={folder.id} depth={depth + 1} />}
    </>
  );
}

function directCounts(bookmarks: Record<ID, Bookmark>, spaceId: ID): Map<ID | null, number> {
  const counts = new Map<ID | null, number>();
  for (const b of Object.values(bookmarks)) {
    if (b.spaceId !== spaceId) continue;
    counts.set(b.folderId, (counts.get(b.folderId) ?? 0) + 1);
  }
  return counts;
}

function countSpace(bookmarks: Record<ID, Bookmark>, spaceId: ID): number {
  return Object.values(bookmarks).filter((b) => b.spaceId === spaceId).length;
}
