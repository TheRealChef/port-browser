import type { ID } from '../../types/models';

export type BookmarkDragData =
  | { type: 'bookmark'; bookmarkId: ID; folderId: ID | null }
  | { type: 'folder'; folderId: ID }
  /** Anything a bookmark or folder can be dropped into (cards, tree rows, breadcrumbs). */
  | {
      type: 'target';
      folderId: ID | null;
      /** Set on folder cards/rows: dragging a folder near their edges reorders instead of nesting. */
      axis?: 'x' | 'y';
    };

export type TileSize = 'sm' | 'md' | 'lg';
export type LibraryLayout = 'grid' | 'list';

export const GRID_COLUMNS: Record<TileSize, string> = {
  sm: 'grid-cols-[repeat(auto-fill,minmax(128px,1fr))]',
  md: 'grid-cols-[repeat(auto-fill,minmax(208px,1fr))]',
  lg: 'grid-cols-[repeat(auto-fill,minmax(248px,1fr))]',
};

const PALETTE = ['#a78bfa', '#7aa2f7', '#4fd1c5', '#5bc69d', '#e6ae68', '#f0956a', '#f08ba0'];

/** Stable per-host tint used for large card covers. */
export function hostTint(host: string): string {
  let hash = 0;
  for (const ch of host) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length] as string;
}
