import type { MouseEvent as ReactMouseEvent } from 'react';
import { useUI, type MenuEntry } from '../../stores/uiStore';

export function showContextMenu(event: ReactMouseEvent, items: MenuEntry[]): void {
  event.preventDefault();
  event.stopPropagation();
  useUI.getState().openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items,
    returnFocus: event.currentTarget instanceof HTMLElement ? event.currentTarget : null,
  });
}

/** Opens a menu anchored below an element (e.g. a "more" button). */
export function showMenuAt(element: HTMLElement, items: MenuEntry[]): void {
  const rect = element.getBoundingClientRect();
  useUI.getState().openContextMenu({
    x: rect.left,
    y: rect.bottom + 4,
    items,
    returnFocus: element,
  });
}

let seq = 0;
const key = () => `m${++seq}`;

export const menu = {
  item: (
    label: string,
    onSelect: () => void,
    extra: Partial<Extract<MenuEntry, { type: 'item' }>> = {},
  ): MenuEntry => ({ type: 'item', id: key(), label, onSelect, ...extra }),
  submenu: (
    label: string,
    items: MenuEntry[],
    extra: Partial<Extract<MenuEntry, { type: 'submenu' }>> = {},
  ): MenuEntry => ({ type: 'submenu', id: key(), label, items, ...extra }),
  separator: (): MenuEntry => ({ type: 'separator', id: key() }),
  label: (label: string): MenuEntry => ({ type: 'label', id: key(), label }),
};
