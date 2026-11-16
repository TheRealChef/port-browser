import { useMemo } from 'react';
import { FolderPlus, Library } from '../icons';
import { createFolderFlow } from '../../features/bookmarks/bookmarkActions';
import { buildFolderMenu } from '../../features/bookmarks/bookmarkMenu';
import { ACCENTS } from '../../features/workspace/appearance';
import { activeView, folderPath, foldersIn } from '../../features/workspace/selectors';
import { selectPanelOpen, useUI } from '../../stores/uiStore';
import { useWorkspace } from '../../stores/workspaceStore';
import type { ID } from '../../types/models';
import { cn } from '../../utils/misc';
import { EntityIcon } from '../common/EntityIcon';
import { IconButton } from '../common/IconButton';
import { showContextMenu } from '../common/menu';
import { SectionHeader } from './SidebarTree';

const VISIBLE_FOLDERS = 8;

/** Entry points into the bookmark library: the whole library plus top-level folders. */
export function BookmarkList({ spaceId }: { spaceId: ID }) {
  const folders = useWorkspace((s) => s.bookmarkFolders);
  const bookmarks = useWorkspace((s) => s.bookmarks);
  const showBookmarks = useWorkspace((s) => s.showBookmarks);
  const view = useWorkspace(activeView);
  const settingsOpen = useUI(selectPanelOpen);
  const setSettingsOpen = useUI((s) => s.setSettingsOpen);

  const topLevel = useMemo(() => foldersIn(folders, spaceId, null), [folders, spaceId]);
  const total = useMemo(
    () => Object.values(bookmarks).filter((b) => b.spaceId === spaceId).length,
    [bookmarks, spaceId],
  );
  const inLibrary = !settingsOpen && view.kind === 'bookmarks';
  const openTop = inLibrary ? (folderPath(folders, view.folderId)[0]?.id ?? null) : undefined;

  const open = (folderId: ID | null) => {
    setSettingsOpen(false);
    showBookmarks(folderId, spaceId);
  };

  const rowClass = (active: boolean) =>
    cn(
      'flex h-row w-full items-center gap-2 rounded-[7px] px-2 text-left text-[13px] outline-none transition-ui',
      'focus-inset',
      active ? 'bg-selected font-semibold text-fg' : 'text-fg-2 hover:bg-hover hover:text-fg',
    );

  return (
    <section>
      <SectionHeader title="Bookmarks">
        <IconButton
          size="sm"
          icon={FolderPlus}
          label="New bookmark folder"
          tooltipSide="right"
          onClick={() => void createFolderFlow(null, spaceId)}
        />
      </SectionHeader>
      <div className="flex flex-col gap-px">
        <button type="button" onClick={() => open(null)} className={rowClass(openTop === null)}>
          <Library size={15} className={openTop === null ? 'text-accent' : 'text-fg-3'} />
          <span className="flex-1 truncate">Library</span>
          <span className="count">{total}</span>
        </button>
        {topLevel.slice(0, VISIBLE_FOLDERS).map((folder) => (
          <button
            key={folder.id}
            type="button"
            onClick={() => open(folder.id)}
            onContextMenu={(e) => showContextMenu(e, buildFolderMenu(folder.id))}
            className={rowClass(openTop === folder.id)}
          >
            <span className="shrink-0" style={{ color: ACCENTS[folder.accent].value }}>
              <EntityIcon name={folder.icon} size={15} />
            </span>
            <span className="truncate">{folder.name}</span>
          </button>
        ))}
        {topLevel.length > VISIBLE_FOLDERS && (
          <button
            type="button"
            onClick={() => open(null)}
            className="rounded-md px-2 py-1 text-left text-[12px] text-fg-3 transition-ui hover:bg-hover hover:text-fg-2"
          >
            {topLevel.length - VISIBLE_FOLDERS} more folders…
          </button>
        )}
      </div>
    </section>
  );
}
