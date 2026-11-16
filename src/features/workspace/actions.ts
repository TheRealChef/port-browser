import { askConfirm, askEntity, askForm, askText } from '../../components/common/dialogs';
import { useSettings } from '../../stores/settingsStore';
import { useUI } from '../../stores/uiStore';
import { useWorkspace } from '../../stores/workspaceStore';
import { ACCENT_COLORS, type ID } from '../../types/models';
import { normalizeInput, titleFromUrl } from '../../utils/url';
import { containerTabs, dashboardsOfSpace, groupsOfSpace, tabsOfSpace } from './selectors';

/** User-facing workflows that combine dialogs with store updates. */

const ws = () => useWorkspace.getState();
const toast = (message: string, tone?: 'info' | 'success' | 'error') =>
  useUI.getState().showToast(message, tone);

export async function createSpaceFlow(): Promise<void> {
  const count = Object.keys(ws().spaces).length;
  const result = await askEntity({
    title: 'New space',
    submitLabel: 'Create space',
    initial: {
      name: '',
      icon: 'star',
      accent: ACCENT_COLORS[(count + 7) % ACCENT_COLORS.length] ?? 'cobalt',
    },
  });
  if (!result) return;
  ws().createSpace(result);
  useUI.getState().setSettingsOpen(false);
}

export async function editSpaceFlow(spaceId: ID): Promise<void> {
  const space = ws().spaces[spaceId];
  if (!space) return;
  const result = await askEntity({ title: 'Edit space', initial: space });
  if (result) ws().updateSpace(spaceId, result);
}

export async function deleteSpaceFlow(spaceId: ID): Promise<void> {
  const state = ws();
  const space = state.spaces[spaceId];
  if (!space) return;
  if (Object.keys(state.spaces).length <= 1) {
    toast('A workspace needs at least one space.', 'error');
    return;
  }
  const tabs = tabsOfSpace(state.tabs, spaceId).length;
  const groups = groupsOfSpace(state.groups, spaceId).length;
  const dashboards = dashboardsOfSpace(state.dashboards, spaceId).length;
  const { ok } = await askConfirm({
    title: `Delete “${space.name}”?`,
    message: `This permanently removes the space with its ${tabs} tab(s), ${groups} group(s) and ${dashboards} dashboard(s). This cannot be undone.`,
    confirmLabel: 'Delete space',
    danger: true,
  });
  if (!ok) return;
  ws().deleteSpace(spaceId);
  const settings = useSettings.getState();
  if (settings.defaultSpaceId === spaceId) settings.update({ defaultSpaceId: null });
  toast(`Deleted ${space.name}`);
}

export async function createGroupFlow(spaceId?: ID): Promise<ID | null> {
  const result = await askEntity({
    title: 'New group',
    submitLabel: 'Create group',
    initial: { name: '', icon: 'folder', accent: 'cobalt' },
  });
  if (!result) return null;
  return ws().createGroup({ ...result, spaceId });
}

export async function editGroupFlow(groupId: ID): Promise<void> {
  const group = ws().groups[groupId];
  if (!group) return;
  const result = await askEntity({ title: 'Edit group', initial: group });
  if (result) ws().updateGroup(groupId, result);
}

export async function deleteGroupFlow(groupId: ID): Promise<void> {
  const state = ws();
  const group = state.groups[groupId];
  if (!group) return;
  const count = containerTabs(state.tabs, group.spaceId, false, groupId).length;
  if (count === 0) {
    ws().deleteGroup(groupId);
    return;
  }
  const { ok, option } = await askConfirm({
    title: `Delete group “${group.name}”?`,
    message: `Its ${count} tab(s) will move to the ungrouped section.`,
    confirmLabel: 'Delete group',
    danger: true,
    option: 'Close the tabs instead',
  });
  if (!ok) return;
  ws().deleteGroup(groupId, { closeTabs: option });
}

export async function createDashboardFlow(): Promise<void> {
  const name = await askText({
    title: 'New dashboard',
    label: 'Name',
    placeholder: 'e.g. Morning overview',
    submitLabel: 'Create',
  });
  if (!name) return;
  ws().createDashboard(name);
  useUI.getState().setSettingsOpen(false);
}

export async function renameDashboardFlow(dashboardId: ID): Promise<void> {
  const dashboard = ws().dashboards[dashboardId];
  if (!dashboard) return;
  const name = await askText({ title: 'Rename dashboard', label: 'Name', initial: dashboard.name });
  if (name) ws().renameDashboard(dashboardId, name);
}

export async function deleteDashboardFlow(dashboardId: ID): Promise<void> {
  const dashboard = ws().dashboards[dashboardId];
  if (!dashboard) return;
  const { ok } = await askConfirm({
    title: `Delete “${dashboard.name}”?`,
    message: 'The dashboard and its widgets will be removed. Tabs and bookmarks are not affected.',
    confirmLabel: 'Delete dashboard',
    danger: true,
  });
  if (ok) ws().deleteDashboard(dashboardId);
}

/** Asks for a URL (and optional title); returns a normalised http(s) link. */
export async function askLink(title: string): Promise<{ url: string; title: string } | null> {
  const engine = useSettings.getState().searchEngine;
  const values = await askForm({
    title,
    submitLabel: 'Add',
    fields: [
      { name: 'url', label: 'Address', placeholder: 'example.com', required: true, type: 'url' },
      { name: 'title', label: 'Title (optional)', placeholder: 'Shown name' },
    ],
    validate: (v) =>
      normalizeInput(v.url ?? '', engine)?.kind === 'url' ? null : 'Enter a valid web address.',
  });
  if (!values) return null;
  const normalized = normalizeInput(values.url ?? '', engine);
  if (!normalized) return null;
  return { url: normalized.url, title: values.title?.trim() || titleFromUrl(normalized.url) };
}
