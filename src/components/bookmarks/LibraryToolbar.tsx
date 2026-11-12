import { forwardRef, type ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  ChevronRight,
  FolderPlus,
  LayoutGrid,
  List,
  ListTree,
  MoreHorizontal,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { useWorkspace } from '../../stores/workspaceStore';
import { useSettings } from '../../stores/settingsStore';
import type { BookmarkFolder, ID } from '../../types/models';
import { cn } from '../../utils/misc';
import { Button } from '../common/Button';
import { IconButton } from '../common/IconButton';
import { Kbd } from '../common/Kbd';

export function Breadcrumbs({ spaceId, path }: { spaceId: ID; path: BookmarkFolder[] }) {
  return (
    <nav aria-label="Folder path" className="flex min-w-0 flex-wrap items-center gap-0.5">
      <Crumb spaceId={spaceId} folderId={null} label="Bookmarks" current={path.length === 0} />
      {path.map((folder, i) => (
        <span key={folder.id} className="flex min-w-0 items-center gap-0.5">
          <ChevronRight size={14} className="shrink-0 text-fg-3" />
          <Crumb
            spaceId={spaceId}
            folderId={folder.id}
            label={folder.name}
            current={i === path.length - 1}
          />
        </span>
      ))}
    </nav>
  );
}

function Crumb({
  spaceId,
  folderId,
  label,
  current,
}: {
  spaceId: ID;
  folderId: ID | null;
  label: string;
  current: boolean;
}) {
  const showBookmarks = useWorkspace((s) => s.showBookmarks);
  const { setNodeRef, isOver } = useDroppable({
    id: `crumb:${folderId ?? 'root'}`,
    data: { type: 'target', folderId },
    disabled: current,
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      aria-current={current ? 'page' : undefined}
      onClick={() => showBookmarks(folderId, spaceId)}
      className={cn(
        'max-w-[220px] truncate rounded-md px-1.5 py-0.5 transition-ui',
        current
          ? 'text-[18px] font-semibold tracking-tight text-fg'
          : 'text-[13px] text-fg-3 hover:bg-hover hover:text-fg',
        isOver && 'bg-[var(--accent-soft)] text-fg ring-1 ring-[var(--accent-ring)]',
      )}
    >
      {label}
    </button>
  );
}

interface ControlsProps {
  query: string;
  onQuery: (value: string) => void;
  onNewFolder: () => void;
  onAddBookmark: () => void;
  onMore: (anchor: HTMLElement) => void;
  scopeLabel: string;
}

export const LibraryControls = forwardRef<HTMLInputElement, ControlsProps>(function LibraryControls(
  { query, onQuery, onNewFolder, onAddBookmark, onMore, scopeLabel },
  searchRef,
) {
  const layout = useSettings((s) => s.bookmarkLayout);
  const size = useSettings((s) => s.bookmarkTileSize);
  const nested = useSettings((s) => s.bookmarkShowNested);
  const update = useSettings((s) => s.update);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex h-8 min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 focus-within:border-[var(--accent-ring)] md:max-w-[380px]">
        <Search size={14} className="shrink-0 text-fg-3" />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && query) {
              e.stopPropagation();
              onQuery('');
            }
          }}
          placeholder={`Search ${scopeLabel}`}
          aria-label="Search bookmarks"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-fg outline-none placeholder:text-fg-3"
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onQuery('')}
            className="text-fg-3 hover:text-fg"
          >
            <X size={14} />
          </button>
        ) : (
          <Kbd>/</Kbd>
        )}
      </label>

      <Segmented>
        <IconButton
          size="sm"
          icon={LayoutGrid}
          label="Tile grid"
          active={layout === 'grid'}
          onClick={() => update({ bookmarkLayout: 'grid' })}
        />
        <IconButton
          size="sm"
          icon={List}
          label="Compact list"
          active={layout === 'list'}
          onClick={() => update({ bookmarkLayout: 'list' })}
        />
      </Segmented>

      <Segmented>
        {(['sm', 'md', 'lg'] as const).map((value) => (
          <button
            key={value}
            type="button"
            disabled={layout === 'list'}
            aria-pressed={size === value}
            title={{ sm: 'Small tiles', md: 'Medium tiles', lg: 'Large cards' }[value]}
            onClick={() => update({ bookmarkTileSize: value })}
            className={cn(
              'h-6 rounded-md px-2 text-[11.5px] font-medium uppercase transition-ui disabled:opacity-35',
              size === value ? 'bg-hover text-fg' : 'text-fg-3 hover:text-fg',
            )}
          >
            {value === 'sm' ? 'S' : value === 'md' ? 'M' : 'L'}
          </button>
        ))}
      </Segmented>

      <IconButton
        size="md"
        icon={ListTree}
        label={nested ? 'Hide subfolder contents' : 'Show subfolder contents inline'}
        active={nested}
        onClick={() => update({ bookmarkShowNested: !nested })}
      />

      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="ghost" icon={FolderPlus} onClick={onNewFolder}>
          New folder
        </Button>
        <Button variant="primary" icon={Plus} onClick={onAddBookmark}>
          Add bookmark
        </Button>
        <IconButton icon={MoreHorizontal} label="More" onClick={(e) => onMore(e.currentTarget)} />
      </div>
    </div>
  );
});

function Segmented({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5">
      {children}
    </div>
  );
}
