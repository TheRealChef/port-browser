import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultWorkspace } from '../features/workspace/defaults';
import { useWorkspace } from '../stores/workspaceStore';
import type { HostBridge, HostToUIMessage } from './bridge';
import { NativeBrowserHost, type NativeHostDeps } from './NativeBrowserHost';

function fakeBridge() {
  const sent: unknown[] = [];
  let listener: ((event: { data: unknown }) => void) | null = null;
  const bridge: HostBridge = {
    postMessage: (m) => sent.push(m),
    addEventListener: (_t, l) => (listener = l),
    removeEventListener: () => (listener = null),
  };
  return { bridge, sent, emit: (data: HostToUIMessage) => listener?.({ data }) };
}

function deps(overrides: Partial<NativeHostDeps> = {}): NativeHostDeps {
  let tabListener: () => void = () => {};
  const ids = new Map([
    ['a', 's1'],
    ['b', 's1'],
  ]);
  return {
    syncNavigation: vi.fn(),
    setTabMeta: vi.fn(),
    setEngineTab: vi.fn(),
    setSnapshot: vi.fn(),
    setSleep: vi.fn(),
    setMedia: vi.fn(),
    openPopupTab: vi.fn(() => true),
    closeTab: vi.fn(),
    replayKey: vi.fn(),
    tabSpaces: () => new Map(ids),
    setDownloads: vi.fn(),
    spaceDataCleared: vi.fn(),
    subscribeToTabs: (l) => {
      tabListener = l;
      return () => {};
    },
    ...overrides,
    // test hooks
    ...({
      _remove: (id: string) => (ids.delete(id), tabListener()),
      _move: (id: string, space: string) => (ids.set(id, space), tabListener()),
    } as object),
  } as NativeHostDeps;
}

describe('NativeBrowserHost', () => {
  it('announces itself and forwards commands', async () => {
    const { bridge, sent } = fakeBridge();
    const host = new NativeBrowserHost(bridge, deps());
    await host.reload('a');
    await host.goBack('a');
    await host.openExternal('javascript:alert(1)');
    await host.openExternal('https://example.com');
    expect(sent).toEqual([
      { type: 'ready' },
      { type: 'reload', tabId: 'a' },
      { type: 'back', tabId: 'a' },
      { type: 'openExternal', url: 'https://example.com/' },
    ]);
    expect(host.getEmbedSupport()).toEqual({ mode: 'native' });
  });

  it('replaces the requested URL with the engine’s (redirects) instead of adding history', async () => {
    const { bridge, emit, sent } = fakeBridge();
    const d = deps();
    const host = new NativeBrowserHost(bridge, d);
    await host.navigate('a', 'http://example.com');
    expect(d.syncNavigation).toHaveBeenLastCalledWith('a', 'http://example.com/');
    expect(sent.at(-1)).toEqual({
      type: 'navigate',
      tabId: 'a',
      url: 'http://example.com/',
      spaceId: 's1',
    });
    emit({
      type: 'navigated',
      tabId: 'a',
      url: 'https://example.com/',
      canGoBack: true,
      canGoForward: false,
    });
    expect(d.syncNavigation).toHaveBeenLastCalledWith('a', 'https://example.com/', {
      replace: true,
    });
    emit({
      type: 'navigated',
      tabId: 'a',
      url: 'https://example.com/x',
      canGoBack: true,
      canGoForward: false,
    });
    expect(d.syncNavigation).toHaveBeenLastCalledWith('a', 'https://example.com/x', {
      replace: false,
    });
    expect(d.setEngineTab).toHaveBeenCalledWith('a', { canGoBack: true, canGoForward: false });
  });

  it('rejects non-web navigations', async () => {
    const host = new NativeBrowserHost(fakeBridge().bridge, deps());
    await expect(host.navigate('a', 'file:///c:/x')).rejects.toThrow();
  });

  it('disposes views of tabs that disappear from the store', () => {
    const { bridge, sent } = fakeBridge();
    const d = deps();
    new NativeBrowserHost(bridge, d);
    (d as unknown as { _remove: (id: string) => void })._remove('b');
    expect(sent).toContainEqual({ type: 'dispose', tabId: 'b' });
  });

  it('recreates the view of a tab moved to another space', () => {
    const { bridge, sent } = fakeBridge();
    const d = deps();
    new NativeBrowserHost(bridge, d);
    (d as unknown as { _move: (id: string, s: string) => void })._move('a', 's2');
    expect(sent).toContainEqual({ type: 'dispose', tabId: 'a' });
  });

  it('forgets unloaded views so showing the tab loads it again', () => {
    const { bridge, sent, emit } = fakeBridge();
    const d = deps();
    const host = new NativeBrowserHost(bridge, d);
    host.showView({ tabId: 'a', url: 'https://a.test/' });
    host.showView({ tabId: 'a', url: 'https://a.test/' });
    emit({ type: 'sleep', tabId: 'a', state: 'discarded' });
    expect(d.setSleep).toHaveBeenCalledWith('a', 'discarded');
    host.showView({ tabId: 'a', url: 'https://a.test/' });
    // After unloading, the next show must be treated as a fresh view again (redirects replace).
    emit({
      type: 'navigated',
      tabId: 'a',
      url: 'https://www.a.test/',
      canGoBack: false,
      canGoForward: false,
    });
    expect(d.syncNavigation).toHaveBeenLastCalledWith('a', 'https://www.a.test/', {
      replace: true,
    });
    expect(sent.filter((m) => (m as { type: string }).type === 'view')).toHaveLength(3);
  });

  it('sends the sleep policy', () => {
    const { bridge, sent } = fakeBridge();
    const host = new NativeBrowserHost(bridge, deps());
    host.setSleepPolicy({
      enabled: true,
      suspendMinutes: 5,
      discardMinutes: 30,
      keepLoaded: ['a'],
    });
    expect(sent.at(-1)).toEqual({
      type: 'sleepPolicy',
      enabled: true,
      suspendMinutes: 5,
      discardMinutes: 30,
      keepLoaded: ['a'],
    });
  });

  it('opens popups as tabs and releases them if that fails', () => {
    const { bridge, sent, emit } = fakeBridge();
    const d = deps({ openPopupTab: vi.fn(() => false) });
    new NativeBrowserHost(bridge, d);
    emit({
      type: 'newTab',
      tabId: 'p',
      url: 'https://x.test/',
      openerTabId: 'a',
      background: false,
    });
    expect(d.openPopupTab).toHaveBeenCalledWith('p', 'https://x.test/', 'a', false);
    expect(sent).toContainEqual({ type: 'dispose', tabId: 'p' });
  });

  it('passes media state to the player and sends its controls', () => {
    const { bridge, sent, emit } = fakeBridge();
    const d = deps();
    const host = new NativeBrowserHost(bridge, d);
    const state = {
      title: 'Song',
      artist: 'Band',
      album: '',
      artwork: [],
      playing: true,
      position: 3,
      duration: 200,
      actions: ['play', 'pause', 'nexttrack'] as const,
      element: true,
      audible: true,
      muted: false,
    };
    emit({ type: 'media', tabId: 'a', state: { ...state, actions: [...state.actions] } });
    expect(d.setMedia).toHaveBeenLastCalledWith('a', expect.objectContaining({ title: 'Song' }));
    emit({ type: 'media', tabId: 'a', state: 'junk' } as unknown as HostToUIMessage);
    expect(d.setMedia).toHaveBeenLastCalledWith('a', null);

    host.mediaAction('a', 'nexttrack');
    host.mediaAction('a', 'seekto', 42);
    expect(sent.slice(-2)).toEqual([
      { type: 'mediaAction', tabId: 'a', action: 'nexttrack' },
      { type: 'mediaAction', tabId: 'a', action: 'seekto', time: 42 },
    ]);

    emit({ type: 'sleep', tabId: 'a', state: 'discarded' });
    expect(d.setMedia).toHaveBeenLastCalledWith('a', null);
  });

  it('ignores messages it does not know', () => {
    const { bridge, emit } = fakeBridge();
    const d = deps();
    new NativeBrowserHost(bridge, d);
    emit({ type: 'evil', tabId: 'a' } as unknown as HostToUIMessage);
    emit(null as unknown as HostToUIMessage);
    expect(d.closeTab).not.toHaveBeenCalled();
    expect(d.syncNavigation).not.toHaveBeenCalled();
  });
});

describe('workspace syncNavigation', () => {
  beforeEach(() => {
    useWorkspace.setState(createDefaultWorkspace());
  });

  it('steps, replaces and pushes history entries', () => {
    const ws = useWorkspace.getState();
    const id = ws.createTab({ url: 'https://a.test/' });
    const tab = () => useWorkspace.getState().tabs[id]!;
    ws.syncNavigation(id, 'https://b.test/');
    ws.syncNavigation(id, 'https://c.test/');
    expect(tab().history).toEqual(['https://a.test/', 'https://b.test/', 'https://c.test/']);
    ws.syncNavigation(id, 'https://b.test/'); // engine went back
    expect(tab().historyIndex).toBe(1);
    ws.syncNavigation(id, 'https://c.test/'); // and forward
    expect(tab().historyIndex).toBe(2);
    ws.syncNavigation(id, 'https://d.test/', { replace: true });
    expect(tab().history).toEqual(['https://a.test/', 'https://b.test/', 'https://d.test/']);
  });

  it('stores engine titles and only web favicons', () => {
    const ws = useWorkspace.getState();
    const id = ws.createTab({ url: 'https://a.test/' });
    ws.setTabMeta(id, { title: '  Page  ', favicon: 'javascript:x' });
    expect(useWorkspace.getState().tabs[id]).toMatchObject({ title: 'Page', favicon: null });
    ws.setTabMeta(id, { favicon: 'https://a.test/icon.png' });
    expect(useWorkspace.getState().tabs[id]!.favicon).toBe('https://a.test/icon.png');
  });

  it('can create a tab with a given id', () => {
    const id = useWorkspace.getState().createTab({ id: 'popup-1', url: 'https://a.test/' });
    expect(id).toBe('popup-1');
  });
});
