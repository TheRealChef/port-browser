import { createContext, useContext } from 'react';
import type { ID } from '../../types/models';

/** Sidebar containers: the pinned grid, ungrouped list, or a group (`group:<id>`). */
export type ContainerId = 'pinned' | 'ungrouped' | `group:${string}`;

export type DragData =
  | { type: 'tab'; tabId: ID; container: ContainerId }
  | { type: 'group'; groupId: ID }
  | { type: 'container'; container: ContainerId }
  | { type: 'space'; spaceId: ID }
  | { type: 'dashboard'; dashboardId: ID };

export interface SidebarDragState {
  active: DragData | null;
  /** Highlight key: a ContainerId or `space:<id>`. */
  overKey: string | null;
}

export const DragStateContext = createContext<SidebarDragState>({ active: null, overKey: null });

export const useSidebarDrag = () => useContext(DragStateContext);
