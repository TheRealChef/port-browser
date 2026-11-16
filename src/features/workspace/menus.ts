import {
  AppWindow,
  Copy,
  ExternalLink,
  FolderInput,
  FolderMinus,
  Layers,
  Palette,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Trash2,
  X,
} from '../../components/icons';
import { menu } from '../../components/common/menu';
import type { Navigation } from '../navigation/navigation';
import { useUI, type MenuEntry } from '../../stores/uiStore';
import { useWorkspace } from '../../stores/workspaceStore';
import type { ID } from '../../types/models';
import { MOD_LABEL } from '../../utils/misc';
import {
  createGroupFlow,
  deleteDashboardFlow,
  deleteGroupFlow,
  deleteSpaceFlow,
  editGroupFlow,
  editSpaceFlow,
  renameDashboardFlow,
} from './actions';
import { groupsOfSpace, sortedSpaces } from './selectors';

const ws = () => useWorkspace.getState();

export function buildTabMenu(tabId: ID, nav: Navigation): MenuEntry[] {
  const state = ws();
  const tab = state.tabs[tabId];
  if (!tab) return [];
  const groups = groupsOfSpace(state.groups, tab.spaceId);
  const otherSpaces = sortedSpaces(state.spaces).filter((s) => s.id !== tab.spaceId);

  const groupItems: MenuEntry[] = [
    ...groups.map((g) =>
      menu.item(g.name, () => ws().moveTab(tabId, { groupId: g.id, pinned: false }), {
        checked: !tab.pinned && tab.groupId === g.id,
        disabled: !tab.pinned && tab.groupId === g.id,
      }),
    ),
    ...(groups.length ? [menu.separator()] : []),
    menu.item(
      'New group…',
      async () => {
        const groupId = await createGroupFlow(tab.spaceId);
        if (groupId) ws().moveTab(tabId, { groupId, pinned: false });
      },
      { icon: Plus },
    ),
  ];
  if (tab.groupId) {
    groupItems.push(
      menu.item('Remove from group', () => ws().moveTab(tabId, { groupId: null }), {
        icon: FolderMinus,
      }),
    );
  }

  return [
    menu.item('Open', () => ws().selectTab(tabId), { icon: AppWindow }),
    menu.item('Open in browser', () => nav.openExternal(tab.url), {
      icon: ExternalLink,
      disabled: !tab.url,
    }),
    menu.separator(),
    menu.item('Duplicate', () => ws().duplicateTab(tabId), { icon: Copy }),
    menu.item(tab.pinned ? 'Unpin' : 'Pin', () => ws().setTabPinned(tabId, !tab.pinned), {
      icon: tab.pinned ? PinOff : Pin,
    }),
    menu.item('Rename', () => useUI.getState().setRenamingTab(tabId), { icon: Pencil }),
    menu.separator(),
    menu.submenu('Move to group', groupItems, { icon: FolderInput }),
    menu.submenu(
      'Move to space',
      otherSpaces.map((s) =>
        menu.item(s.name, () => {
          ws().moveTab(tabId, { spaceId: s.id });
          useUI.getState().showToast(`Moved to ${s.name}`, 'success');
        }),
      ),
      { icon: Layers, disabled: otherSpaces.length === 0 },
    ),
    menu.separator(),
    menu.item('Close', () => nav.closeTab(tabId), {
      icon: X,
      shortcut: `${MOD_LABEL}+W`,
      danger: true,
    }),
  ];
}

export function buildGroupMenu(groupId: ID, nav: Navigation): MenuEntry[] {
  const group = ws().groups[groupId];
  if (!group) return [];
  return [
    menu.item('New tab in group', () => nav.newTab({ groupId }), { icon: Plus }),
    menu.item(group.collapsed ? 'Expand' : 'Collapse', () =>
      ws().setGroupCollapsed(groupId, !group.collapsed),
    ),
    menu.separator(),
    menu.item('Edit name, icon & color…', () => editGroupFlow(groupId), { icon: Palette }),
    menu.separator(),
    menu.item('Delete group…', () => deleteGroupFlow(groupId), { icon: Trash2, danger: true }),
  ];
}

export function buildSpaceMenu(spaceId: ID): MenuEntry[] {
  const state = ws();
  const canDelete = Object.keys(state.spaces).length > 1;
  return [
    menu.item('Switch to space', () => ws().switchSpace(spaceId), {
      disabled: state.activeSpaceId === spaceId,
    }),
    menu.item('Edit name, icon & color…', () => editSpaceFlow(spaceId), { icon: Palette }),
    menu.separator(),
    menu.item('Delete space…', () => deleteSpaceFlow(spaceId), {
      icon: Trash2,
      danger: true,
      disabled: !canDelete,
    }),
  ];
}

export function buildDashboardMenu(dashboardId: ID): MenuEntry[] {
  return [
    menu.item('Open', () => ws().openDashboard(dashboardId), { icon: AppWindow }),
    menu.item('Rename…', () => renameDashboardFlow(dashboardId), { icon: Pencil }),
    menu.separator(),
    menu.item('Delete dashboard…', () => deleteDashboardFlow(dashboardId), {
      icon: Trash2,
      danger: true,
    }),
  ];
}
