import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultWorkspace } from '../features/workspace/defaults';
import { startHistoryRecorder, VISIT_SETTLE_MS } from '../features/history/recordHistory';
import { buildSuggestions } from '../features/navigation/suggestions';
import { redactUrl, useHistory } from './historyStore';
import { useSettings } from './settingsStore';
import { useWorkspace } from './workspaceStore';

beforeEach(() => {
  useHistory.setState({ entries: [] });
  useWorkspace.setState(createDefaultWorkspace());
  useSettings.getState().update({ recordHistory: true });
});

describe('history store', () => {
  it('never keeps sign-in codes, tokens or credentials from addresses', () => {
    expect(redactUrl('https://user:pw@a.test/cb?code=123&state=x&page=2#access_token=abc')).toBe(
      'https://a.test/cb?state=x&page=2',
    );
    expect(redactUrl('https://a.test/?q=hello')).toBe('https://a.test/?q=hello');
    expect(redactUrl('javascript:alert(1)')).toBeNull();
  });

  it('merges quick revisits and keeps newest first', () => {
    const h = useHistory.getState();
    h.recordVisit({ url: 'https://a.test/', title: 'A', spaceId: 's' }, 1000);
    h.recordVisit({ url: 'https://b.test/', title: 'B', spaceId: 's' }, 2000);
    h.recordVisit({ url: 'https://a.test/', title: 'A2', spaceId: 's' }, 3000);
    const entries = useHistory.getState().entries;
    expect(entries.map((e) => [e.url, e.title, e.visitedAt])).toEqual([
      ['https://a.test/', 'A2', 3000],
      ['https://b.test/', 'B', 2000],
    ]);
  });

  it('clears by time range, site and id', () => {
    const h = useHistory.getState();
    h.recordVisit({ url: 'https://a.test/1', title: '', spaceId: 's' }, 1000);
    h.recordVisit({ url: 'https://a.test/2', title: '', spaceId: 's' }, 5000);
    h.recordVisit({ url: 'https://b.test/', title: '', spaceId: 's' }, 9000);
    h.clear(8000);
    expect(useHistory.getState().entries).toHaveLength(2);
    h.removeSite('a.test');
    expect(useHistory.getState().entries).toHaveLength(0);
  });

  it('feeds address-bar suggestions', () => {
    useHistory
      .getState()
      .recordVisit({ url: 'https://docs.rs/serde', title: 'serde docs', spaceId: 's' });
    const s = buildSuggestions(
      'serde',
      useWorkspace.getState(),
      'duckduckgo',
      null,
      useHistory.getState().entries,
    );
    expect(s.some((x) => x.kind === 'history' && x.url === 'https://docs.rs/serde')).toBe(true);
  });
});

describe('history recorder', () => {
  let stop: () => void;
  beforeEach(() => {
    vi.useFakeTimers();
    stop = startHistoryRecorder();
  });
  afterEach(() => {
    stop();
    vi.useRealTimers();
  });

  it('records a tab only once it settles on an address', () => {
    const ws = useWorkspace.getState();
    const id = ws.createTab({ url: 'https://a.test/' });
    ws.syncNavigation(id, 'https://a.test/file.zip'); // turned out to be a download…
    ws.syncNavigation(id, 'https://a.test/', { replace: true }); // …engine reports the page stayed
    vi.advanceTimersByTime(VISIT_SETTLE_MS + 10);
    expect(useHistory.getState().entries.map((e) => e.url)).toEqual(['https://a.test/']);
  });

  it('records nothing while history is off', () => {
    useSettings.getState().update({ recordHistory: false });
    useWorkspace.getState().createTab({ url: 'https://a.test/' });
    vi.advanceTimersByTime(VISIT_SETTLE_MS + 10);
    expect(useHistory.getState().entries).toHaveLength(0);
  });
});
