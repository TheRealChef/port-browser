import { createContext } from 'react';
import type { Bookmark, BookmarkFolder, ID } from '../../types/models';

/** Where a dragged folder will land relative to the folder under the pointer. */
export type DropZone = 'before' | 'into' | 'after';

export interface DropHint {
  /** Droppable id currently hovered. */
  id: string;
  zone: DropZone;
}

export const DropHintContext = createContext<DropHint | null>(null);

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Outer quarters reorder, the middle nests. */
export function dropZoneFor(rect: Rect, x: number, y: number, axis: 'x' | 'y'): DropZone {
  const start = axis === 'x' ? rect.left : rect.top;
  const size = axis === 'x' ? rect.width : rect.height;
  const pos = (axis === 'x' ? x : y) - start;
  if (pos < size * 0.25) return 'before';
  if (pos > size * 0.75) return 'after';
  return 'into';
}

export interface SearchHit {
  kind: 'bookmark' | 'folder';
  bookmark?: Bookmark;
  folder?: BookmarkFolder;
  path: string;
  score: number;
}

/** Case-insensitive search below `rootId` (or the whole space), best matches first. */
export function searchLibrary(
  folders: Record<ID, BookmarkFolder>,
  bookmarks: Record<ID, Bookmark>,
  spaceId: ID,
  rootId: ID | null,
  query: string,
  scope: Set<ID> | null,
): SearchHit[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  const pathCache = new Map<ID | null, string>();
  const pathOf = (folderId: ID | null): string => {
    const cached = pathCache.get(folderId);
    if (cached !== undefined) return cached;
    const names: string[] = [];
    const seen = new Set<ID>();
    let cursor = folderId ? folders[folderId] : undefined;
    while (cursor && !seen.has(cursor.id)) {
      seen.add(cursor.id);
      names.unshift(cursor.name);
      cursor = cursor.parentId ? folders[cursor.parentId] : undefined;
    }
    const path = names.length ? names.join(' / ') : 'Bookmarks';
    pathCache.set(folderId, path);
    return path;
  };
  const inScope = (folderId: ID | null) =>
    rootId === null ? true : folderId !== null && (scope?.has(folderId) ?? false);

  const score = (fields: string[]): number => {
    let total = 0;
    for (const term of terms) {
      let best = 0;
      fields.forEach((field, i) => {
        const at = field.indexOf(term);
        if (at === -1) return;
        const weight = (i === 0 ? 3 : 1) * (at === 0 ? 2 : 1);
        best = Math.max(best, weight);
      });
      if (best === 0) return 0;
      total += best;
    }
    return total;
  };

  const hits: SearchHit[] = [];
  for (const folder of Object.values(folders)) {
    if (folder.spaceId !== spaceId || folder.id === rootId || !inScope(folder.parentId)) continue;
    const s = score([folder.name.toLowerCase()]);
    if (s > 0) hits.push({ kind: 'folder', folder, path: pathOf(folder.parentId), score: s + 1 });
  }
  for (const bookmark of Object.values(bookmarks)) {
    if (bookmark.spaceId !== spaceId || !inScope(bookmark.folderId)) continue;
    const s = score([bookmark.title.toLowerCase(), bookmark.url.toLowerCase()]);
    if (s > 0) hits.push({ kind: 'bookmark', bookmark, path: pathOf(bookmark.folderId), score: s });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, 400);
}

/** Moves focus between `[data-nav-item]` elements like a spreadsheet. */
export function navigateGrid(container: HTMLElement, key: string): boolean {
  const items = Array.from(container.querySelectorAll<HTMLElement>('[data-nav-item]'));
  if (items.length === 0) return false;
  const active = document.activeElement as HTMLElement | null;
  const index = active ? items.indexOf(active) : -1;
  let target: HTMLElement | undefined;

  if (index === -1) target = items[0];
  else if (key === 'ArrowRight') target = items[index + 1];
  else if (key === 'ArrowLeft') target = items[index - 1];
  else if (key === 'Home') target = items[0];
  else if (key === 'End') target = items[items.length - 1];
  else if (key === 'ArrowDown' || key === 'ArrowUp') {
    const current = items[index]!.getBoundingClientRect();
    const cx = current.left + current.width / 2;
    const down = key === 'ArrowDown';
    const rows = items
      .map((el) => ({ el, rect: el.getBoundingClientRect() }))
      .filter(({ rect }) =>
        down ? rect.top >= current.bottom - 2 : rect.bottom <= current.top + 2,
      );
    if (rows.length) {
      const edge = down
        ? Math.min(...rows.map((r) => r.rect.top))
        : Math.max(...rows.map((r) => r.rect.top));
      const row = rows.filter((r) => Math.abs(r.rect.top - edge) < 4);
      row.sort(
        (a, b) =>
          Math.abs(a.rect.left + a.rect.width / 2 - cx) -
          Math.abs(b.rect.left + b.rect.width / 2 - cx),
      );
      target = row[0]?.el;
    }
  }
  if (!target) return false;
  target.focus();
  target.scrollIntoView({ block: 'nearest' });
  return true;
}
