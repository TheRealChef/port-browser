import type { KeyboardEvent, MouseEvent } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ExternalLink, MoreHorizontal } from 'lucide-react';
import { useNavigation } from '../../app/providers/hostContext';
import {
  editBookmarkFlow,
  openInBackground,
  removeBookmarkWithUndo,
} from '../../features/bookmarks/bookmarkActions';
import { buildBookmarkMenu } from '../../features/bookmarks/bookmarkMenu';
import type { Bookmark } from '../../types/models';
import { cn } from '../../utils/misc';
import { displayUrl, hostnameOf } from '../../utils/url';
import { Favicon } from '../common/Favicon';
import { showContextMenu, showMenuAt } from '../common/menu';
import { hostTint, type LibraryLayout, type TileSize } from './dragTypes';

interface BookmarkTileProps {
  bookmark: Bookmark;
  size: TileSize;
  layout: LibraryLayout;
  /** Folder path shown in search results. */
  path?: string;
  sortable: boolean;
}

export function BookmarkTile({ bookmark, size, layout, path, sortable }: BookmarkTileProps) {
  const nav = useNavigation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `bm:${bookmark.id}`,
    data: { type: 'bookmark', bookmarkId: bookmark.id, folderId: bookmark.folderId },
    disabled: !sortable,
  });

  const open = (event: MouseEvent | KeyboardEvent) => {
    if (event.shiftKey) nav.openExternal(bookmark.url);
    else if (event.ctrlKey || event.metaKey) openInBackground(bookmark.url, bookmark.title);
    else nav.openUrl(bookmark.url, { title: bookmark.title });
  };

  const host = hostnameOf(bookmark.url);
  const actions = (
    <div className="absolute right-1.5 top-1.5 flex gap-0.5 opacity-0 transition-ui group-focus-within/tile:opacity-100 group-hover/tile:opacity-100">
      <TileAction
        label="Open in browser"
        onClick={() => nav.openExternal(bookmark.url)}
        icon={<ExternalLink size={12} />}
      />
      <TileAction
        label="More"
        onClick={(e) => showMenuAt(e.currentTarget, buildBookmarkMenu(bookmark.id, nav))}
        icon={<MoreHorizontal size={12} />}
      />
    </div>
  );

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-nav-item
      role="link"
      aria-label={`${bookmark.title} — ${displayUrl(bookmark.url)}`}
      title={`${bookmark.title}\n${bookmark.url}\nCtrl+click: background tab · Shift+click: browser`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      onClick={open}
      onAuxClick={(e) => {
        if (e.button === 1) {
          e.preventDefault();
          openInBackground(bookmark.url, bookmark.title);
        }
      }}
      onMouseDown={(e) => e.button === 1 && e.preventDefault()}
      onContextMenu={(e) => showContextMenu(e, buildBookmarkMenu(bookmark.id, nav))}
      onKeyDown={(e) => {
        listeners?.onKeyDown?.(e);
        if (e.defaultPrevented) return;
        if (e.key === 'Enter') open(e);
        else if (e.key === 'Delete') removeBookmarkWithUndo(bookmark.id);
        else if (e.key === 'F2') void editBookmarkFlow(bookmark.id);
        else return;
        e.preventDefault();
      }}
      className={cn(
        'group/tile relative cursor-default select-none outline-none transition-ui',
        'focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]',
        isDragging && 'z-10 opacity-40',
        layout === 'list'
          ? 'flex h-10 items-center gap-3 rounded-lg px-3 hover:bg-hover'
          : 'rounded-xl border border-line bg-raised/70 shadow-card hover:border-line-strong hover:bg-hover',
        layout === 'grid' &&
          size === 'sm' &&
          'flex h-[84px] flex-col items-center justify-center gap-2 px-2',
        layout === 'grid' && size === 'md' && 'flex h-[64px] items-center gap-3 px-3',
        layout === 'grid' && size === 'lg' && 'flex flex-col overflow-hidden',
      )}
    >
      {layout === 'list' ? (
        <>
          <Favicon url={bookmark.url} size={16} />
          <span className="min-w-0 flex-1 truncate text-[13px] text-fg">{bookmark.title}</span>
          <span className="hidden w-[32%] truncate text-[12px] text-fg-3 md:block">
            {displayUrl(bookmark.url)}
          </span>
          {path !== undefined && (
            <span className="hidden w-[22%] truncate text-[12px] text-fg-3 lg:block">{path}</span>
          )}
          <div className="flex gap-0.5 opacity-0 transition-ui group-focus-within/tile:opacity-100 group-hover/tile:opacity-100">
            <TileAction
              label="Open in browser"
              onClick={() => nav.openExternal(bookmark.url)}
              icon={<ExternalLink size={12} />}
            />
            <TileAction
              label="More"
              onClick={(e) => showMenuAt(e.currentTarget, buildBookmarkMenu(bookmark.id, nav))}
              icon={<MoreHorizontal size={12} />}
            />
          </div>
        </>
      ) : size === 'sm' ? (
        <>
          <Favicon url={bookmark.url} size={22} />
          <span className="w-full truncate text-center text-[12px] text-fg-2">
            {bookmark.title}
          </span>
          {actions}
        </>
      ) : size === 'md' ? (
        <>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface">
            <Favicon url={bookmark.url} size={18} />
          </span>
          <span className="min-w-0 flex-1 pr-6">
            <span className="block truncate text-[13px] text-fg">{bookmark.title}</span>
            <span className="block truncate text-[11.5px] text-fg-3">{path ?? host}</span>
          </span>
          {actions}
        </>
      ) : (
        <>
          <div
            className="flex h-[76px] items-center justify-center"
            style={{
              background: `radial-gradient(120% 140% at 0% 0%, color-mix(in oklab, ${hostTint(host)} 34%, transparent), color-mix(in oklab, ${hostTint(host)} 6%, transparent))`,
            }}
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-white/90 shadow-card">
              <Favicon url={bookmark.url} size={24} />
            </span>
          </div>
          <div className="px-3 pb-2.5 pt-2">
            <span className="block truncate text-[13px] font-medium text-fg">{bookmark.title}</span>
            <span className="block truncate text-[11.5px] text-fg-3">
              {path ?? displayUrl(bookmark.url)}
            </span>
          </div>
          {actions}
        </>
      )}
    </div>
  );
}

function TileAction({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      tabIndex={-1}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className="flex size-6 items-center justify-center rounded-md bg-raised/90 text-fg-2 shadow-card transition-ui hover:bg-surface hover:text-fg"
    >
      {icon}
    </button>
  );
}
