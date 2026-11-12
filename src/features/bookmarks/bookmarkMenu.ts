import {
  AppWindow,
  Copy,
  ExternalLink,
  FolderInput,
  FolderOpen,
  FolderPlus,
  Layers,
  Palette,
  Pencil,
  Plus,
  SquareArrowOutUpRight,
  Trash2,
  Upload,
} from 'lucide-react';
import { menu } from '../../components/common/menu';
import { useUI, type MenuEntry } from '../../stores/uiStore';
import { useWorkspace } from '../../stores/workspaceStore';
import type { ID } from '../../types/models';
import type { Navigation } from '../navigation/navigation';
import {
  addBookmarkFlow,
  createFolderFlow,
  deleteFolderFlow,
  editBookmarkFlow,
  editFolderFlow,
  folderOptions,
  moveFolderFlow,
  openFolderAsGroup,
  openInBackground,
  pickBookmarksFile,
  removeBookmarkWithUndo,
} from './bookmarkActions';

const ws = () => useWorkspace.getState();

export function buildBookmarkMenu(bookmarkId: ID, nav: Navigation): MenuEntry[] {
  const bookmark = ws().bookmarks[bookmarkId];
  if (!bookmark) return [];
  const moveTargets = folderOptions(bookmark.spaceId).map((option) =>
    menu.item(
      option.label,
      () => ws().moveBookmark(bookmarkId, { folderId: option.value || null }),
      {
        checked: (bookmark.folderId ?? '') === option.value,
        disabled: (bookmark.folderId ?? '') === option.value,
      },
    ),
  );
  return [
    menu.item('Open', () => nav.openUrl(bookmark.url, { title: bookmark.title }), {
      icon: AppWindow,
    }),
    menu.item('Open in background tab', () => openInBackground(bookmark.url, bookmark.title), {
      icon: SquareArrowOutUpRight,
    }),
    menu.item('Open in browser', () => nav.openExternal(bookmark.url), { icon: ExternalLink }),
    menu.separator(),
    menu.item('Edit…', () => void editBookmarkFlow(bookmarkId), { icon: Pencil }),
    menu.submenu('Move to folder', moveTargets, { icon: FolderInput }),
    menu.item(
      'Copy link',
      () => {
        navigator.clipboard
          .writeText(bookmark.url)
          .then(() => useUI.getState().showToast('Link copied', 'success'))
          .catch(() => useUI.getState().showToast('Clipboard is not available', 'error'));
      },
      { icon: Copy },
    ),
    menu.separator(),
    menu.item('Remove bookmark', () => removeBookmarkWithUndo(bookmarkId), {
      icon: Trash2,
      danger: true,
    }),
  ];
}

export function buildFolderMenu(folderId: ID): MenuEntry[] {
  const folder = ws().bookmarkFolders[folderId];
  if (!folder) return [];
  return [
    menu.item('Open', () => ws().showBookmarks(folderId), { icon: FolderOpen }),
    menu.item('Open all as tab group', () => void openFolderAsGroup(folderId), { icon: Layers }),
    menu.separator(),
    menu.item('Add bookmark here…', () => void addBookmarkFlow(folder.spaceId, folderId), {
      icon: Plus,
    }),
    menu.item('New subfolder…', () => void createFolderFlow(folderId), { icon: FolderPlus }),
    menu.item('Import into this folder…', () => pickBookmarksFile(folderId), { icon: Upload }),
    menu.separator(),
    menu.item('Edit name, icon & color…', () => void editFolderFlow(folderId), { icon: Palette }),
    menu.item('Move to…', () => void moveFolderFlow(folderId), { icon: FolderInput }),
    menu.separator(),
    menu.item('Delete folder…', () => void deleteFolderFlow(folderId), {
      icon: Trash2,
      danger: true,
    }),
  ];
}
