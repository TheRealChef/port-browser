import { beforeEach, describe, expect, it } from 'vitest';
import { createDefaultWorkspace } from '../features/workspace/defaults';
import {
  bookmarksIn,
  deepBookmarkCount,
  folderPath,
  foldersIn,
  sortedSpaces,
} from '../features/workspace/selectors';
import { parseBookmarksHtml } from '../features/bookmarks/importHtml';
import { migrateWorkspace, sanitizeWorkspace } from './persistence';
import { useWorkspace } from './workspaceStore';

const state = () => useWorkspace.getState();
const workId = () => sortedSpaces(state().spaces)[0]!.id;
const folderNamed = (name: string) =>
  Object.values(state().bookmarkFolders).find((f) => f.name === name)!;
const base = { icon: 'folder', accent: 'blue' as const };

beforeEach(() => {
  useWorkspace.setState(createDefaultWorkspace());
});

describe('bookmark folders', () => {
  it('seeds nested folders', () => {
    const reference = folderNamed('Reference');
    expect(foldersIn(state().bookmarkFolders, workId(), reference.id).map((f) => f.name)).toEqual([
      'Frontend',
      '.NET & Azure',
    ]);
    expect(deepBookmarkCount(state().bookmarkFolders, state().bookmarks, reference.id)).toBe(10);
  });

  it('creates subfolders in the parent’s space and adds bookmarks into them', () => {
    const parent = folderNamed('Tools');
    const child = state().createFolder({ ...base, parentId: parent.id, name: 'Design' });
    expect(state().bookmarkFolders[child]).toMatchObject({
      parentId: parent.id,
      spaceId: workId(),
    });

    const id = state().addBookmark({ url: 'https://figma.com/', title: 'Figma', folderId: child });
    expect(state().bookmarks[id]?.folderId).toBe(child);
    expect(folderPath(state().bookmarkFolders, child).map((f) => f.name)).toEqual([
      'Tools',
      'Design',
    ]);
  });

  it('refuses to move a folder into its own descendant', () => {
    const reference = folderNamed('Reference');
    const frontend = folderNamed('Frontend');
    expect(state().moveFolder(reference.id, frontend.id)).toBe(false);
    expect(state().bookmarkFolders[reference.id]?.parentId).toBeNull();

    expect(state().moveFolder(frontend.id, null, 0)).toBe(true);
    expect(foldersIn(state().bookmarkFolders, workId(), null)[0]?.id).toBe(frontend.id);
  });

  it('moves contents up to the parent when deleting a folder', () => {
    const reference = folderNamed('Reference');
    const frontend = folderNamed('Frontend');
    const before = Object.keys(state().bookmarks).length;
    state().deleteFolder(reference.id);
    expect(state().bookmarkFolders[reference.id]).toBeUndefined();
    expect(state().bookmarkFolders[frontend.id]?.parentId).toBeNull();
    expect(Object.keys(state().bookmarks)).toHaveLength(before);
  });

  it('deletes nested folders and bookmarks when asked to', () => {
    const reference = folderNamed('Reference');
    const inside = deepBookmarkCount(state().bookmarkFolders, state().bookmarks, reference.id);
    const before = Object.keys(state().bookmarks).length;
    state().showBookmarks(folderNamed('Frontend').id);
    state().deleteFolder(reference.id, { deleteContents: true });
    expect(state().bookmarkFolders[folderNamed('Tools').id]).toBeDefined();
    expect(Object.values(state().bookmarkFolders).some((f) => f.name === 'Frontend')).toBe(false);
    expect(Object.keys(state().bookmarks)).toHaveLength(before - inside);
    expect(state().spaceViews[workId()]).toEqual({ kind: 'bookmarks', folderId: null });
  });

  it('reorders bookmarks inside a folder and across folders', () => {
    const tools = folderNamed('Tools');
    const marks = bookmarksIn(state().bookmarks, workId(), tools.id);
    const last = marks[marks.length - 1]!;
    state().moveBookmark(last.id, { folderId: tools.id, index: 0 });
    expect(bookmarksIn(state().bookmarks, workId(), tools.id)[0]?.id).toBe(last.id);

    state().moveBookmark(last.id, { folderId: null });
    const root = bookmarksIn(state().bookmarks, workId(), null);
    expect(root[root.length - 1]?.id).toBe(last.id);
    expect(bookmarksIn(state().bookmarks, workId(), tools.id).map((b) => b.order)).toEqual([
      0, 1, 2,
    ]);
  });

  it('expands ancestors when revealing a folder', () => {
    const reference = folderNamed('Reference');
    state().updateFolder(reference.id, { collapsed: true });
    state().showBookmarks(folderNamed('Frontend').id);
    expect(state().bookmarkFolders[reference.id]?.collapsed).toBe(false);
  });

  it('imports a nested tree', () => {
    const parsed = parseBookmarksHtml(`<!DOCTYPE NETSCAPE-Bookmark-file-1>
      <DL><p>
        <DT><H3>Bar</H3>
        <DL><p>
          <DT><A HREF="https://a.example/">A</A>
          <DT><H3>Deep</H3>
          <DL><p><DT><A HREF="https://b.example/">B</A></DL><p>
        </DL><p>
        <DT><A HREF="javascript:alert(1)">Bad</A>
        <DT><A HREF="https://c.example/">C</A>
      </DL>`);
    expect(parsed).toMatchObject({ bookmarkCount: 3, folderCount: 2, skipped: 1 });

    const result = state().importBookmarks(parsed.nodes, { parentId: folderNamed('Tools').id });
    expect(result).toEqual({ folders: 2, bookmarks: 3 });
    const bar = folderNamed('Bar');
    expect(bar.parentId).toBe(folderNamed('Tools').id);
    expect(deepBookmarkCount(state().bookmarkFolders, state().bookmarks, bar.id)).toBe(2);
  });
});

describe('persistence of folders', () => {
  it('migrates v1 data by adding an empty folder table', () => {
    const v1 = { ...createDefaultWorkspace(), bookmarkFolders: undefined };
    const migrated = migrateWorkspace(v1, 1) as Record<string, unknown>;
    expect(migrated.bookmarkFolders).toEqual({});
    const result = sanitizeWorkspace(migrated);
    expect(Object.values(result!.data.bookmarks).every((b) => b.folderId === null)).toBe(true);
  });

  it('repairs folder cycles and dangling references', () => {
    const data = createDefaultWorkspace();
    const reference = Object.values(data.bookmarkFolders).find((f) => f.name === 'Reference')!;
    const frontend = Object.values(data.bookmarkFolders).find((f) => f.name === 'Frontend')!;
    reference.parentId = frontend.id; // cycle
    const someBookmark = Object.values(data.bookmarks)[0]!;
    someBookmark.folderId = 'missing';
    const repaired = sanitizeWorkspace(JSON.parse(JSON.stringify(data)))!.data;

    const seen = new Set<string>();
    let cursor = repaired.bookmarkFolders[frontend.id];
    while (cursor?.parentId && !seen.has(cursor.id)) {
      seen.add(cursor.id);
      cursor = repaired.bookmarkFolders[cursor.parentId];
    }
    expect(cursor?.parentId ?? null).toBeNull();
    expect(repaired.bookmarks[someBookmark.id]?.folderId).toBeNull();
  });
});
