import { beforeEach, describe, expect, it } from 'vitest';
import { createDefaultWorkspace } from '../features/workspace/defaults';
import { containerTabs, groupsOfSpace, sortedSpaces } from '../features/workspace/selectors';
import type { Space } from '../types/models';
import { WORKSPACE_STORAGE_KEY, sanitizeWorkspace } from './persistence';
import { useWorkspace } from './workspaceStore';

const state = () => useWorkspace.getState();
const spaces = () => sortedSpaces(state().spaces) as [Space, Space];
const groupNamed = (name: string) => Object.values(state().groups).find((g) => g.name === name)!;

beforeEach(() => {
  useWorkspace.setState(createDefaultWorkspace());
});

describe('spaces', () => {
  it('seeds Work and Personal with their default groups', () => {
    const [work, personal] = spaces();
    expect(work.name).toBe('Work');
    expect(personal.name).toBe('Personal');
    expect(groupsOfSpace(state().groups, work.id).map((g) => g.name)).toEqual([
      'Documentation',
      'Local Development',
      'Project Management',
    ]);
    expect(groupsOfSpace(state().groups, personal.id).map((g) => g.name)).toEqual([
      'Entertainment',
      'Reading',
    ]);
  });

  it('restores each space’s selected view when switching', () => {
    const [work, personal] = spaces();
    const workTab = containerTabs(state().tabs, work.id, false, groupNamed('Documentation').id)[0]!;
    state().selectTab(workTab.id);

    state().switchSpace(personal.id);
    const dashboardId = state().createDashboard('Leisure');
    expect(state().spaceViews[personal.id]).toEqual({ kind: 'dashboard', dashboardId });

    state().switchSpace(work.id);
    expect(state().activeSpaceId).toBe(work.id);
    expect(state().spaceViews[work.id]).toEqual({ kind: 'tab', tabId: workTab.id });

    state().switchSpace(personal.id);
    expect(state().spaceViews[personal.id]).toEqual({ kind: 'dashboard', dashboardId });
  });

  it('deletes a space with all of its content but never the last one', () => {
    const [work, personal] = spaces();
    state().switchSpace(personal.id);
    state().deleteSpace(personal.id);
    expect(state().spaces[personal.id]).toBeUndefined();
    expect(Object.values(state().tabs).some((t) => t.spaceId === personal.id)).toBe(false);
    expect(Object.values(state().groups).some((g) => g.spaceId === personal.id)).toBe(false);
    expect(state().activeSpaceId).toBe(work.id);

    state().deleteSpace(work.id);
    expect(state().spaces[work.id]).toBeDefined();
  });
});

describe('groups', () => {
  it('moves tabs to ungrouped when a group is deleted', () => {
    const [work] = spaces();
    const group = groupNamed('Local Development');
    const members = containerTabs(state().tabs, work.id, false, group.id);
    expect(members).toHaveLength(2);

    state().deleteGroup(group.id);

    expect(state().groups[group.id]).toBeUndefined();
    for (const tab of members) {
      expect(state().tabs[tab.id]?.groupId).toBeNull();
    }
    expect(containerTabs(state().tabs, work.id, false, null).map((t) => t.id)).toEqual(
      members.map((t) => t.id),
    );
  });

  it('closes the tabs instead when asked to', () => {
    const group = groupNamed('Reading');
    const [member] = containerTabs(state().tabs, group.spaceId, false, group.id);
    state().selectTab(member!.id);
    state().deleteGroup(group.id, { closeTabs: true });
    expect(state().tabs[member!.id]).toBeUndefined();
    expect(state().spaceViews[group.spaceId]).not.toEqual({ kind: 'tab', tabId: member!.id });
  });
});

describe('tabs', () => {
  it('moves a tab between groups at a given index', () => {
    const [work] = spaces();
    const docs = groupNamed('Documentation');
    const pm = groupNamed('Project Management');
    const [tab] = containerTabs(state().tabs, work.id, false, docs.id);

    state().moveTab(tab!.id, { groupId: pm.id, index: 1 });

    const pmTabs = containerTabs(state().tabs, work.id, false, pm.id);
    expect(pmTabs.map((t) => t.id)[1]).toBe(tab!.id);
    expect(pmTabs.map((t) => t.order)).toEqual([0, 1, 2]);
    expect(containerTabs(state().tabs, work.id, false, docs.id).map((t) => t.order)).toEqual([0]);
  });

  it('reorders within a container', () => {
    const [work] = spaces();
    const docs = groupNamed('Documentation');
    const [first, second] = containerTabs(state().tabs, work.id, false, docs.id);
    state().moveTab(first!.id, { index: 1 });
    expect(containerTabs(state().tabs, work.id, false, docs.id).map((t) => t.id)).toEqual([
      second!.id,
      first!.id,
    ]);
  });

  it('moves a tab to another space and repairs the old space’s view', () => {
    const [work, personal] = spaces();
    const docs = groupNamed('Documentation');
    const [tab, sibling] = containerTabs(state().tabs, work.id, false, docs.id);
    state().selectTab(tab!.id);

    state().moveTab(tab!.id, { spaceId: personal.id });

    const moved = state().tabs[tab!.id]!;
    expect(moved.spaceId).toBe(personal.id);
    expect(moved.groupId).toBeNull();
    expect(state().spaceViews[work.id]).toEqual({ kind: 'tab', tabId: sibling!.id });
  });

  it('pins and unpins, leaving the group', () => {
    const docs = groupNamed('Documentation');
    const [tab] = containerTabs(state().tabs, docs.spaceId, false, docs.id);
    state().setTabPinned(tab!.id, true);
    expect(state().tabs[tab!.id]).toMatchObject({ pinned: true, groupId: null });
    state().setTabPinned(tab!.id, false);
    expect(state().tabs[tab!.id]).toMatchObject({ pinned: false, groupId: null });
  });

  it('selects a neighbour when the selected tab closes', () => {
    const docs = groupNamed('Documentation');
    const [first, second] = containerTabs(state().tabs, docs.spaceId, false, docs.id);
    state().selectTab(first!.id);
    state().closeTab(first!.id);
    expect(state().tabs[first!.id]).toBeUndefined();
    expect(state().spaceViews[docs.spaceId]).toEqual({ kind: 'tab', tabId: second!.id });
  });

  it('tracks history for back and forward', () => {
    const tabId = state().createTab({ url: 'https://example.com/' });
    state().recordNavigation(tabId, 'https://example.org/');
    expect(state().stepHistory(tabId, -1)).toBe('https://example.com/');
    expect(state().stepHistory(tabId, -1)).toBeNull();
    expect(state().stepHistory(tabId, 1)).toBe('https://example.org/');
  });
});

describe('persistence', () => {
  it('survives a reload through localStorage', async () => {
    const [, personal] = spaces();
    state().switchSpace(personal.id);
    const tabId = state().createTab({ url: 'https://example.com/', title: 'Example' });
    const saved = localStorage.getItem(WORKSPACE_STORAGE_KEY);

    expect(saved).toContain('example.com');

    useWorkspace.setState(createDefaultWorkspace());

    localStorage.setItem(WORKSPACE_STORAGE_KEY, saved!);
    await useWorkspace.persist.rehydrate();

    expect(state().tabs[tabId]?.title).toBe('Example');
    expect(state().activeSpaceId).toBe(personal.id);
    expect(state().spaceViews[personal.id]).toEqual({ kind: 'tab', tabId });
  });

  it('drops invalid records without losing the rest', () => {
    const data = createDefaultWorkspace();
    const raw = JSON.parse(JSON.stringify(data)) as Record<string, Record<string, unknown>>;
    const anyTabId = Object.keys(data.tabs)[0]!;
    raw.tabs!['bad'] = { id: 'bad', spaceId: 'missing-space', url: 'https://x.dev' };
    raw.tabs!['evil'] = { id: 'evil', spaceId: data.activeSpaceId, url: 'javascript:alert(1)' };
    raw.tabs!['junk'] = 42;
    raw.groups!['orphan'] = { id: 'orphan', spaceId: 'nope', name: 'Orphan' };

    const result = sanitizeWorkspace(raw);
    expect(result).not.toBeNull();
    expect(result!.dropped).toBe(4);
    expect(result!.data.tabs[anyTabId]).toBeDefined();
    expect(Object.keys(result!.data.tabs)).toHaveLength(Object.keys(data.tabs).length);
  });

  it('falls back to defaults when stored JSON is corrupted', async () => {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, '{not json');
    await useWorkspace.persist.rehydrate();
    expect(Object.keys(state().spaces)).toHaveLength(2);
    expect(localStorage.getItem(`${WORKSPACE_STORAGE_KEY}:corrupt-backup`)).toBe('{not json');
  });
});

describe('restoreTab', () => {
  it('puts a closed tab back in its group and position and selects it', () => {
    const docs = groupNamed('Documentation');
    const [first, second] = containerTabs(state().tabs, docs.spaceId, false, docs.id);
    const snapshot = state().tabs[first!.id]!;
    state().closeTab(first!.id);

    const id = state().restoreTab(snapshot);

    expect(id).toBe(first!.id);
    expect(containerTabs(state().tabs, docs.spaceId, false, docs.id).map((t) => t.id)).toEqual([
      first!.id,
      second!.id,
    ]);
    expect(state().spaceViews[docs.spaceId]).toEqual({ kind: 'tab', tabId: first!.id });
  });

  it('ungroups a restored tab whose group was deleted', () => {
    const docs = groupNamed('Documentation');
    const [tab] = containerTabs(state().tabs, docs.spaceId, false, docs.id);
    const snapshot = state().tabs[tab!.id]!;
    state().closeTab(tab!.id);
    state().deleteGroup(docs.id);
    const id = state().restoreTab(snapshot)!;
    expect(state().tabs[id]?.groupId).toBeNull();
  });
});

describe('reorder', () => {
  it('reorders spaces and dashboards', () => {
    const [work, personal] = spaces();
    state().reorderSpace(personal.id, 0);
    expect(sortedSpaces(state().spaces).map((s) => s.id)).toEqual([personal.id, work.id]);

    const a = state().createDashboard('A', work.id);
    const b = state().createDashboard('B', work.id);
    state().reorderDashboard(b, 0);
    const order = Object.values(state().dashboards)
      .filter((d) => d.spaceId === work.id)
      .sort((x, y) => x.order - y.order)
      .map((d) => d.id);
    expect(order.indexOf(b)).toBeLessThan(order.indexOf(a));
    expect(order[0]).toBe(b);
  });
});
