import { askConfirm, askEntity, askForm } from '../../components/common/dialogs';
import { useSettings } from '../../stores/settingsStore';
import { useUI } from '../../stores/uiStore';
import { useWorkspace } from '../../stores/workspaceStore';
import type { ID } from '../../types/models';
import { normalizeInput, titleFromUrl } from '../../utils/url';
import {
  bookmarksIn,
  deepBookmarkCount,
  descendantFolderIds,
  foldersIn,
  folderPath,
} from '../workspace/selectors';
import { parseBookmarksHtml } from './importHtml';

/** Dialog-driven bookmark and folder workflows. */

const ws = () => useWorkspace.getState();
const ui = () => useUI.getState();

const ROOT = '';
const OPEN_ALL_CONFIRM_THRESHOLD = 12;
const OPEN_ALL_LIMIT = 60;

/** Depth-first folder choices for a select field ("" = top level). */
export function folderOptions(
  spaceId: ID,
  exclude?: Set<ID>,
): Array<{ value: string; label: string }> {
  const { bookmarkFolders } = ws();
  const options = [{ value: ROOT, label: 'Bookmarks (top level)' }];
  const walk = (parentId: ID | null, depth: number) => {
    for (const folder of foldersIn(bookmarkFolders, spaceId, parentId)) {
      if (exclude?.has(folder.id)) continue;
      options.push({ value: folder.id, label: `${' '.repeat(depth)}${folder.name}` });
      walk(folder.id, depth + 1);
    }
  };
  walk(null, 1);
  return options;
}

export function folderLabel(folderId: ID | null): string {
  if (!folderId) return 'Bookmarks';
  return folderPath(ws().bookmarkFolders, folderId)
    .map((f) => f.name)
    .join(' / ');
}

export async function addBookmarkFlow(spaceId?: ID, folderId: ID | null = null): Promise<void> {
  const space = spaceId ?? ws().activeSpaceId;
  const engine = useSettings.getState().searchEngine;
  const values = await askForm({
    title: 'Add bookmark',
    submitLabel: 'Add',
    fields: [
      { name: 'url', label: 'Address', placeholder: 'example.com', required: true, type: 'url' },
      { name: 'title', label: 'Title (optional)', placeholder: 'Shown name' },
      {
        name: 'folder',
        label: 'Folder',
        type: 'select',
        initial: folderId ?? ROOT,
        options: folderOptions(space),
      },
    ],
    validate: (v) =>
      normalizeInput(v.url ?? '', engine)?.kind === 'url' ? null : 'Enter a valid web address.',
  });
  if (!values) return;
  const target = normalizeInput(values.url ?? '', engine);
  if (!target) return;
  ws().addBookmark({
    url: target.url,
    title: values.title?.trim() || titleFromUrl(target.url),
    spaceId: space,
    folderId: values.folder || null,
  });
}

export async function editBookmarkFlow(bookmarkId: ID): Promise<void> {
  const bookmark = ws().bookmarks[bookmarkId];
  if (!bookmark) return;
  const engine = useSettings.getState().searchEngine;
  const values = await askForm({
    title: 'Edit bookmark',
    fields: [
      { name: 'title', label: 'Title', initial: bookmark.title, required: true },
      { name: 'url', label: 'Address', initial: bookmark.url, required: true, type: 'url' },
      {
        name: 'folder',
        label: 'Folder',
        type: 'select',
        initial: bookmark.folderId ?? ROOT,
        options: folderOptions(bookmark.spaceId),
      },
    ],
    validate: (v) =>
      normalizeInput(v.url ?? '', engine)?.kind === 'url' ? null : 'Enter a valid web address.',
  });
  if (!values) return;
  const target = normalizeInput(values.url ?? '', engine);
  if (!target) return;
  ws().updateBookmark(bookmarkId, {
    title: values.title?.trim() || bookmark.title,
    url: target.url,
  });
  const folderId = values.folder || null;
  if (folderId !== bookmark.folderId) ws().moveBookmark(bookmarkId, { folderId });
}

export function removeBookmarkWithUndo(bookmarkId: ID): void {
  const bookmark = ws().bookmarks[bookmarkId];
  if (!bookmark) return;
  ws().removeBookmark(bookmarkId);
  ui().showToast(`Removed “${bookmark.title}”`, 'info', {
    label: 'Undo',
    run: () => ws().restoreBookmark(bookmark),
  });
}

export async function createFolderFlow(parentId: ID | null, spaceId?: ID): Promise<ID | null> {
  const result = await askEntity({
    title: parentId ? `New folder in “${folderLabel(parentId)}”` : 'New folder',
    submitLabel: 'Create folder',
    initial: { name: '', icon: 'folder', accent: 'slate' },
  });
  if (!result) return null;
  return ws().createFolder({ ...result, parentId, spaceId });
}

export async function editFolderFlow(folderId: ID): Promise<void> {
  const folder = ws().bookmarkFolders[folderId];
  if (!folder) return;
  const result = await askEntity({ title: 'Edit folder', initial: folder });
  if (result) ws().updateFolder(folderId, result);
}

export async function moveFolderFlow(folderId: ID): Promise<void> {
  const state = ws();
  const folder = state.bookmarkFolders[folderId];
  if (!folder) return;
  const values = await askForm({
    title: `Move “${folder.name}”`,
    submitLabel: 'Move',
    fields: [
      {
        name: 'parent',
        label: 'Into',
        type: 'select',
        initial: folder.parentId ?? ROOT,
        options: folderOptions(
          folder.spaceId,
          descendantFolderIds(state.bookmarkFolders, folderId),
        ),
      },
    ],
  });
  if (values) ws().moveFolder(folderId, values.parent || null);
}

export async function deleteFolderFlow(folderId: ID): Promise<void> {
  const state = ws();
  const folder = state.bookmarkFolders[folderId];
  if (!folder) return;
  const count = deepBookmarkCount(state.bookmarkFolders, state.bookmarks, folderId);
  const subfolders = descendantFolderIds(state.bookmarkFolders, folderId).size - 1;
  if (count === 0 && subfolders === 0) {
    ws().deleteFolder(folderId);
    return;
  }
  const parent = folder.parentId ? `“${folderLabel(folder.parentId)}”` : 'the top level';
  const { ok, option } = await askConfirm({
    title: `Delete folder “${folder.name}”?`,
    message: `It contains ${count} bookmark(s) and ${subfolders} subfolder(s). They will move up to ${parent}.`,
    confirmLabel: 'Delete folder',
    danger: true,
    option: 'Delete everything inside as well',
  });
  if (ok) ws().deleteFolder(folderId, { deleteContents: option });
}

/** Opens a folder's direct bookmarks as a new tab group named after the folder. */
export async function openFolderAsGroup(folderId: ID | null, spaceId?: ID): Promise<void> {
  const state = ws();
  const folder = folderId ? state.bookmarkFolders[folderId] : undefined;
  const space = folder?.spaceId ?? spaceId ?? state.activeSpaceId;
  const marks = bookmarksIn(state.bookmarks, space, folder ? folder.id : null);
  if (marks.length === 0) {
    ui().showToast('This folder has no bookmarks of its own to open.');
    return;
  }
  if (marks.length > OPEN_ALL_CONFIRM_THRESHOLD) {
    const shown = Math.min(marks.length, OPEN_ALL_LIMIT);
    const { ok } = await askConfirm({
      title: `Open ${shown} tabs?`,
      message: `This creates a tab group with ${shown} tabs${marks.length > OPEN_ALL_LIMIT ? ` (the first ${OPEN_ALL_LIMIT} of ${marks.length})` : ''}.`,
      confirmLabel: 'Open tabs',
    });
    if (!ok) return;
  }
  const groupId = ws().createGroup({
    spaceId: space,
    name: folder?.name ?? 'Bookmarks',
    icon: folder?.icon ?? 'folder',
    accent: folder?.accent ?? 'slate',
  });
  let first: ID | null = null;
  for (const bookmark of marks.slice(0, OPEN_ALL_LIMIT)) {
    const id = ws().createTab({
      spaceId: space,
      groupId,
      url: bookmark.url,
      title: bookmark.title,
      select: false,
    });
    first ??= id;
  }
  if (first) ws().selectTab(first);
  ui().setSettingsOpen(false);
  ui().showToast(
    `Opened ${Math.min(marks.length, OPEN_ALL_LIMIT)} tabs in “${folder?.name ?? 'Bookmarks'}”`,
    'success',
  );
}

/** Opens a bookmark in a new tab without leaving the current view. */
export function openInBackground(url: string, title: string): void {
  ws().createTab({ url, title, select: false });
  ui().showToast(`Opened “${title}” in a background tab`);
}

const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

export async function importBookmarksFlow(
  file: File,
  parentId: ID | null,
  spaceId?: ID,
): Promise<void> {
  if (file.size > MAX_IMPORT_BYTES) {
    ui().showToast('That file is too large to import.', 'error');
    return;
  }
  const parsed = parseBookmarksHtml(await file.text());
  if (parsed.bookmarkCount === 0 && parsed.folderCount === 0) {
    ui().showToast('No bookmarks found. Export them from your browser as an HTML file.', 'error');
    return;
  }
  const where = parentId ? `“${folderLabel(parentId)}”` : 'the top level';
  const skipped = parsed.skipped ? ` ${parsed.skipped} non-web entries will be skipped.` : '';
  const { ok } = await askConfirm({
    title: 'Import bookmarks?',
    message: `Found ${parsed.bookmarkCount} bookmark(s) in ${parsed.folderCount} folder(s). They will be added to ${where} with their folder structure.${skipped}`,
    confirmLabel: 'Import',
  });
  if (!ok) return;
  const result = ws().importBookmarks(parsed.nodes, { spaceId, parentId });
  ui().showToast(`Imported ${result.bookmarks} bookmarks and ${result.folders} folders`, 'success');
}

/** Opens a native file picker for a browser bookmarks export. */
export function pickBookmarksFile(parentId: ID | null, spaceId?: ID): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.html,.htm,text/html';
  input.onchange = () => {
    const file = input.files?.[0];
    if (file) void importBookmarksFlow(file, parentId, spaceId);
  };
  input.click();
}
