import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { rectSortingStrategy, SortableContext } from '@dnd-kit/sortable';
import {
  ChevronDown,
  FolderInput,
  FolderPlus,
  Layers,
  Palette,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  addBookmarkFlow,
  createFolderFlow,
  deleteFolderFlow,
  editFolderFlow,
  folderLabel,
  moveFolderFlow,
  openFolderAsGroup,
  pickBookmarksFile,
} from '../../features/bookmarks/bookmarkActions';
import { ACCENTS } from '../../features/workspace/appearance';
import {
  bookmarksIn,
  descendantFolderIds,
  folderPath,
  foldersIn,
} from '../../features/workspace/selectors';
import { useSettings } from '../../stores/settingsStore';
import { useUI, type MenuEntry } from '../../stores/uiStore';
import { useWorkspace } from '../../stores/workspaceStore';
import type { Bookmark, BookmarkFolder, ID } from '../../types/models';
import { cn } from '../../utils/misc';
import { Button } from '../common/Button';
import { EntityIcon } from '../common/EntityIcon';
import { Favicon } from '../common/Favicon';
import { menu, showMenuAt } from '../common/menu';
import { BookmarkTile } from './BookmarkTile';
import { FolderCard } from './FolderCard';
import { FolderTree } from './FolderTree';
import { Breadcrumbs, LibraryControls } from './LibraryToolbar';
import {
  GRID_COLUMNS,
  type BookmarkDragData,
  type LibraryLayout,
  type TileSize,
} from './dragTypes';
import {
  DropHintContext,
  dropZoneFor,
  navigateGrid,
  searchLibrary,
  type DropHint,
  type DropZone,
} from './library';

/** Only bookmarks take part in the "nearest item" fallback; folders need the pointer on them. */
const collision: CollisionDetection = (args) => {
  const within = pointerWithin(args);
  if (within.length) return within;
  return closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter(
      (c) => (c.data.current as BookmarkDragData | undefined)?.type === 'bookmark',
    ),
  });
};

function pointerOf(event: { activatorEvent: Event | null; delta: { x: number; y: number } }) {
  const start = event.activatorEvent as PointerEvent | null;
  return { x: (start?.clientX ?? 0) + event.delta.x, y: (start?.clientY ?? 0) + event.delta.y };
}

export function BookmarksView({ folderId }: { folderId: ID | null }) {
  const spaceId = useWorkspace((s) => s.activeSpaceId);
  const folders = useWorkspace((s) => s.bookmarkFolders);
  const bookmarks = useWorkspace((s) => s.bookmarks);
  const showBookmarks = useWorkspace((s) => s.showBookmarks);
  const layout = useSettings((s) => s.bookmarkLayout);
  const size = useSettings((s) => s.bookmarkTileSize);
  const nested = useSettings((s) => s.bookmarkShowNested);

  const folder = folderId ? folders[folderId] : undefined;
  const currentId = folder && folder.spaceId === spaceId ? folder.id : null;
  const current = currentId ? folder : undefined;

  // Searching is scoped to the open folder; leaving it clears the query.
  const [query, setQuery] = useState('');
  const [queryScope, setQueryScope] = useState(currentId);
  if (queryScope !== currentId) {
    setQueryScope(currentId);
    setQuery('');
  }

  const path = useMemo(() => folderPath(folders, currentId), [folders, currentId]);
  const subfolders = useMemo(
    () => foldersIn(folders, spaceId, currentId),
    [folders, spaceId, currentId],
  );
  const direct = useMemo(
    () => bookmarksIn(bookmarks, spaceId, currentId),
    [bookmarks, spaceId, currentId],
  );
  const sections = useMemo(
    () => (nested ? nestedSections(folders, bookmarks, spaceId, currentId) : []),
    [nested, folders, bookmarks, spaceId, currentId],
  );
  const hits = useMemo(() => {
    if (!query.trim()) return null;
    const scope = currentId ? descendantFolderIds(folders, currentId) : null;
    return searchLibrary(folders, bookmarks, spaceId, currentId, query, scope);
  }, [query, folders, bookmarks, spaceId, currentId]);

  const searchRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target?.closest('input, textarea, select, [contenteditable="true"]');
      if (useUI.getState().dialog || useUI.getState().paletteOpen) return;
      if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f')) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const goUp = () => {
    if (current) showBookmarks(current.parentId, spaceId);
  };

  // ---- drag and drop -------------------------------------------------------
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [dragging, setDragging] = useState<BookmarkDragData | null>(null);
  const [hint, setHint] = useState<DropHint | null>(null);

  const zoneFor = (event: DragMoveEvent | DragEndEvent): DropZone | null => {
    const active = event.active.data.current as BookmarkDragData | undefined;
    const over = event.over;
    const target = over?.data.current as BookmarkDragData | undefined;
    if (!over || !active || target?.type !== 'target') return null;
    if (active.type === 'folder') {
      if (target.folderId === active.folderId) return null;
      if (target.axis && target.folderId) {
        const p = pointerOf(event);
        return dropZoneFor(over.rect, p.x, p.y, target.axis);
      }
      return 'into';
    }
    if (active.type === 'bookmark' && target.folderId === active.folderId) return null;
    return 'into';
  };

  const onDragStart = (event: DragStartEvent) => {
    setDragging((event.active.data.current as BookmarkDragData | undefined) ?? null);
  };

  const onDragMove = (event: DragMoveEvent) => {
    const zone = zoneFor(event);
    const id = event.over ? String(event.over.id) : '';
    setHint((prev) =>
      zone === null ? null : prev?.id === id && prev.zone === zone ? prev : { id, zone },
    );
  };

  const onDragEnd = (event: DragEndEvent) => {
    const zone = zoneFor(event);
    setDragging(null);
    setHint(null);
    const active = event.active.data.current as BookmarkDragData | undefined;
    const target = event.over?.data.current as BookmarkDragData | undefined;
    if (!active || !target) return;
    const store = useWorkspace.getState();
    const toast = useUI.getState().showToast;

    if (active.type === 'bookmark') {
      if (target.type === 'bookmark') {
        if (target.bookmarkId === active.bookmarkId) return;
        const siblings = bookmarksIn(store.bookmarks, spaceId, target.folderId);
        const index = siblings.findIndex((b) => b.id === target.bookmarkId);
        store.moveBookmark(active.bookmarkId, { folderId: target.folderId, index });
      } else if (target.type === 'target' && zone) {
        store.moveBookmark(active.bookmarkId, { folderId: target.folderId });
        toast(`Moved to ${folderLabel(target.folderId)}`, 'success');
      }
      return;
    }

    if (active.type === 'folder' && target.type === 'target' && zone) {
      let parentId = target.folderId;
      let index: number | undefined;
      if (zone !== 'into' && target.folderId) {
        const reference = store.bookmarkFolders[target.folderId];
        if (!reference) return;
        parentId = reference.parentId;
        const siblings = foldersIn(store.bookmarkFolders, spaceId, parentId).filter(
          (f) => f.id !== active.folderId,
        );
        index = siblings.findIndex((f) => f.id === reference.id) + (zone === 'after' ? 1 : 0);
      }
      if (!store.moveFolder(active.folderId, parentId, index)) {
        toast('A folder can’t be moved into itself.', 'error');
      }
    }
  };

  // ---- menus ---------------------------------------------------------------
  const moreMenu = (): MenuEntry[] => {
    const items: MenuEntry[] = [
      menu.item('Import bookmarks here…', () => pickBookmarksFile(currentId, spaceId), {
        icon: Upload,
      }),
    ];
    if (direct.length > 0) {
      items.push(
        menu.item('Open all as tab group', () => void openFolderAsGroup(currentId, spaceId), {
          icon: Layers,
        }),
      );
    }
    if (currentId) {
      items.push(
        menu.separator(),
        menu.item('Edit folder…', () => void editFolderFlow(currentId), { icon: Palette }),
        menu.item('Move folder…', () => void moveFolderFlow(currentId), { icon: FolderInput }),
        menu.item('Delete folder…', () => void deleteFolderFlow(currentId), {
          icon: Trash2,
          danger: true,
        }),
      );
    }
    items.push(
      menu.separator(),
      menu.item('Collapse all folders', () => {
        const store = useWorkspace.getState();
        for (const f of Object.values(store.bookmarkFolders)) {
          if (f.spaceId === spaceId && !f.collapsed) store.updateFolder(f.id, { collapsed: true });
        }
      }),
    );
    return items;
  };

  const tile = (bookmark: Bookmark, sortable = true, tilePath?: string) => (
    <BookmarkTile
      key={bookmark.id}
      bookmark={bookmark}
      size={size}
      layout={layout}
      sortable={sortable}
      path={tilePath}
    />
  );

  const isEmpty = subfolders.length === 0 && direct.length === 0;
  const scopeLabel = current ? `in ${current.name}` : 'all bookmarks';

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setDragging(null);
        setHint(null);
      }}
    >
      <DropHintContext.Provider value={hint}>
        <div className="flex h-full min-h-0">
          <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-sidebar/40 md:flex">
            <div className="flex h-11 items-center justify-between px-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-3">
                Folders
              </span>
              <button
                type="button"
                title="New top-level folder"
                aria-label="New top-level folder"
                onClick={() => void createFolderFlow(null, spaceId)}
                className="flex size-6 items-center justify-center rounded-md text-fg-3 transition-ui hover:bg-hover hover:text-fg"
              >
                <FolderPlus size={14} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
              <FolderTree spaceId={spaceId} currentId={currentId} />
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex flex-col gap-3 border-b border-line px-6 pb-3 pt-4">
              <div className="flex items-center gap-3">
                {current && (
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      color: ACCENTS[current.accent].value,
                      background: `color-mix(in oklab, ${ACCENTS[current.accent].value} 16%, transparent)`,
                    }}
                  >
                    <EntityIcon name={current.icon} size={16} strokeWidth={2} />
                  </span>
                )}
                <Breadcrumbs spaceId={spaceId} path={path} />
              </div>
              <LibraryControls
                ref={searchRef}
                query={query}
                onQuery={setQuery}
                scopeLabel={scopeLabel}
                onNewFolder={() => void createFolderFlow(currentId, spaceId)}
                onAddBookmark={() => void addBookmarkFlow(spaceId, currentId)}
                onMore={(anchor) => showMenuAt(anchor, moreMenu())}
              />
            </header>

            <div
              ref={contentRef}
              className="min-h-0 flex-1 overflow-y-auto px-6 pb-12 pt-5"
              onKeyDown={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('input, textarea, select')) return;
                if (
                  ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(
                    e.key,
                  ) &&
                  !e.altKey
                ) {
                  if (contentRef.current && navigateGrid(contentRef.current, e.key))
                    e.preventDefault();
                } else if (e.key === 'Backspace' || (e.altKey && e.key === 'ArrowUp')) {
                  e.preventDefault();
                  goUp();
                }
              }}
            >
              {hits ? (
                <SearchResults hits={hits} size={size} layout={layout} query={query} />
              ) : isEmpty ? (
                <EmptyFolder
                  isRoot={currentId === null}
                  onAdd={() => void addBookmarkFlow(spaceId, currentId)}
                  onFolder={() => void createFolderFlow(currentId, spaceId)}
                  onImport={() => pickBookmarksFile(currentId, spaceId)}
                />
              ) : (
                <div className="flex flex-col gap-7">
                  {subfolders.length > 0 && (
                    <Section title="Folders" count={subfolders.length}>
                      <Grid layout={layout} size={size}>
                        {subfolders.map((f) => (
                          <FolderCard key={f.id} folder={f} size={size} layout={layout} />
                        ))}
                      </Grid>
                    </Section>
                  )}
                  {direct.length > 0 && (
                    <Section
                      title={subfolders.length > 0 || sections.length > 0 ? 'Bookmarks' : undefined}
                      count={direct.length}
                    >
                      <SortableContext
                        items={direct.map((b) => `bm:${b.id}`)}
                        strategy={rectSortingStrategy}
                      >
                        <Grid layout={layout} size={size}>
                          {direct.map((b) => tile(b))}
                        </Grid>
                      </SortableContext>
                    </Section>
                  )}
                  {sections.map((section) => (
                    <NestedSection key={section.folder.id} section={section}>
                      <SortableContext
                        items={section.marks.map((b) => `bm:${b.id}`)}
                        strategy={rectSortingStrategy}
                      >
                        <Grid layout={layout} size={size}>
                          {section.marks.map((b) => tile(b))}
                        </Grid>
                      </SortableContext>
                    </NestedSection>
                  ))}
                  {direct.length === 0 && sections.length === 0 && (
                    <p className="text-[12.5px] text-fg-3">
                      No bookmarks directly in this folder.{' '}
                      <button
                        type="button"
                        className="text-accent hover:underline"
                        onClick={() => useSettings.getState().update({ bookmarkShowNested: true })}
                      >
                        Show subfolder contents inline
                      </button>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </DropHintContext.Provider>

      <DragOverlay dropAnimation={null}>
        {dragging ? <DragChip data={dragging} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

// ---- pieces -----------------------------------------------------------------

interface NestedSectionData {
  folder: BookmarkFolder;
  path: BookmarkFolder[];
  marks: Bookmark[];
}

/** Every descendant folder that holds bookmarks, depth first, for the inline view. */
function nestedSections(
  folders: Record<ID, BookmarkFolder>,
  bookmarks: Record<ID, Bookmark>,
  spaceId: ID,
  rootId: ID | null,
): NestedSectionData[] {
  const result: NestedSectionData[] = [];
  const walk = (parentId: ID | null, trail: BookmarkFolder[]) => {
    for (const folder of foldersIn(folders, spaceId, parentId)) {
      const next = [...trail, folder];
      const marks = bookmarksIn(bookmarks, spaceId, folder.id);
      if (marks.length) result.push({ folder, path: next, marks });
      if (result.length < 200) walk(folder.id, next);
    }
  };
  walk(rootId, []);
  return result;
}

function NestedSection({ section, children }: { section: NestedSectionData; children: ReactNode }) {
  const showBookmarks = useWorkspace((s) => s.showBookmarks);
  const [open, setOpen] = useState(true);
  const accent = ACCENTS[section.folder.accent].value;
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? 'Collapse section' : 'Expand section'}
          onClick={() => setOpen(!open)}
          className="flex size-5 items-center justify-center rounded text-fg-3 hover:bg-hover hover:text-fg"
        >
          <ChevronDown size={14} className={cn('transition-transform', !open && '-rotate-90')} />
        </button>
        <span style={{ color: accent }}>
          <EntityIcon name={section.folder.icon} size={14} strokeWidth={2} />
        </span>
        <button
          type="button"
          onClick={() => showBookmarks(section.folder.id)}
          className="flex min-w-0 items-center gap-1 truncate text-[12.5px] font-medium text-fg-2 hover:text-fg hover:underline"
        >
          {section.path.map((f, i) => (
            <span key={f.id} className={cn(i < section.path.length - 1 && 'text-fg-3')}>
              {i > 0 && <span className="px-1 text-fg-3">/</span>}
              {f.name}
            </span>
          ))}
        </button>
        <span className="text-[11.5px] tabular-nums text-fg-3">{section.marks.length}</span>
        <span className="h-px flex-1 bg-line" />
      </div>
      {open && children}
    </section>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title?: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      {title && (
        <div className="flex items-center gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-fg-3">{title}</h2>
          <span className="text-[11.5px] tabular-nums text-fg-3">{count}</span>
          <span className="h-px flex-1 bg-line" />
        </div>
      )}
      {children}
    </section>
  );
}

function Grid({
  layout,
  size,
  children,
}: {
  layout: LibraryLayout;
  size: TileSize;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        layout === 'list' ? 'flex flex-col gap-px' : cn('grid gap-2.5', GRID_COLUMNS[size]),
      )}
    >
      {children}
    </div>
  );
}

function SearchResults({
  hits,
  size,
  layout,
  query,
}: {
  hits: ReturnType<typeof searchLibrary>;
  size: TileSize;
  layout: LibraryLayout;
  query: string;
}) {
  if (hits.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 py-16 text-center">
        <p className="text-[14px] text-fg-2">Nothing matches “{query.trim()}”</p>
        <p className="text-[12.5px] text-fg-3">
          Search looks at titles, addresses and folder names.
        </p>
      </div>
    );
  }
  const folderHits = hits.filter((h) => h.folder);
  const bookmarkHits = hits.filter((h) => h.bookmark);
  return (
    <div className="flex flex-col gap-7">
      {folderHits.length > 0 && (
        <Section title="Folders" count={folderHits.length}>
          <Grid layout={layout} size={size}>
            {folderHits.map((h) => (
              <FolderCard
                key={h.folder!.id}
                folder={h.folder!}
                size={size}
                layout={layout}
                path={h.path}
              />
            ))}
          </Grid>
        </Section>
      )}
      {bookmarkHits.length > 0 && (
        <Section title="Bookmarks" count={bookmarkHits.length}>
          <Grid layout={layout} size={size}>
            {bookmarkHits.map((h) => (
              <BookmarkTile
                key={h.bookmark!.id}
                bookmark={h.bookmark!}
                size={size}
                layout={layout}
                path={h.path}
                sortable={false}
              />
            ))}
          </Grid>
        </Section>
      )}
    </div>
  );
}

function EmptyFolder({
  isRoot,
  onAdd,
  onFolder,
  onImport,
}: {
  isRoot: boolean;
  onAdd: () => void;
  onFolder: () => void;
  onImport: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl border border-line bg-raised text-accent">
        <FolderPlus size={22} />
      </span>
      <div>
        <p className="text-[15px] font-medium text-fg">
          {isRoot ? 'Build your bookmark library' : 'This folder is empty'}
        </p>
        <p className="mt-1 text-[12.5px] text-fg-3">
          {isRoot
            ? 'Organise links in folders and subfolders, browse them as a tile grid, and drag to rearrange. You can import an HTML export from Chrome, Edge or Firefox.'
            : 'Add bookmarks or subfolders, or drag existing ones here.'}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="primary" icon={Plus} onClick={onAdd}>
          Add bookmark
        </Button>
        <Button icon={FolderPlus} onClick={onFolder}>
          New folder
        </Button>
        <Button variant="ghost" icon={Upload} onClick={onImport}>
          Import HTML
        </Button>
      </div>
    </div>
  );
}

function DragChip({ data }: { data: BookmarkDragData }) {
  const bookmark = useWorkspace((s) =>
    data.type === 'bookmark' ? s.bookmarks[data.bookmarkId] : undefined,
  );
  const folder = useWorkspace((s) =>
    data.type === 'folder' ? s.bookmarkFolders[data.folderId] : undefined,
  );
  return (
    <div className="flex h-9 max-w-[260px] cursor-grabbing items-center gap-2 rounded-lg border border-line-strong bg-raised px-3 text-[13px] text-fg shadow-pop">
      {bookmark && <Favicon url={bookmark.url} size={16} />}
      {folder && (
        <span style={{ color: ACCENTS[folder.accent].value }}>
          <EntityIcon name={folder.icon} size={15} strokeWidth={2} />
        </span>
      )}
      <span className="truncate">{bookmark?.title ?? folder?.name ?? ''}</span>
    </div>
  );
}
