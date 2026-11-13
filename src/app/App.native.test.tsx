import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HostToUIMessage } from '../host/bridge';
import { useUI } from '../stores/uiStore';
import { useWorkspace } from '../stores/workspaceStore';
import { App } from './App';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** Renders the whole app as it runs inside the desktop shell (WebView2 bridge present). */
function mountNative() {
  const sent: unknown[] = [];
  const listeners: Array<(e: { data: unknown }) => void> = [];
  window.chrome = {
    webview: {
      postMessage: (m) => sent.push(m),
      addEventListener: (_t, l) => listeners.push(l),
      removeEventListener: () => {},
    },
  };
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(<App />));
  const emit = (data: HostToUIMessage) => act(() => listeners.forEach((l) => l({ data })));
  return { container, root, sent, emit };
}

describe('App in the desktop shell', () => {
  afterEach(() => {
    delete window.chrome;
    document.body.innerHTML = '';
  });

  it('renders the native UI with downloads, history and a page slot without crashing', () => {
    // jsdom lacks these browser APIs the page slot uses.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    const { container, root, sent, emit } = mountNative();
    expect(container.textContent).not.toContain('hit a problem');
    expect(container.textContent).toContain('Native');
    expect(sent).toContainEqual({ type: 'ready' });

    emit({
      type: 'downloads',
      started: true,
      items: [
        {
          id: 'd1',
          url: 'https://x.test/a.zip',
          fileName: 'a.zip',
          totalBytes: 100,
          receivedBytes: 40,
          state: 'inProgress',
          reason: null,
          canResume: false,
          startedAt: Date.now(),
          missing: false,
        },
      ],
    });
    act(() => useUI.getState().setDownloadsOpen(true));
    expect(document.body.textContent).toContain('a.zip');

    // Opening a page tab mounts the native slot and asks the shell to show it.
    act(() => {
      useUI.getState().setDownloadsOpen(false);
      useWorkspace.getState().createTab({ url: 'https://example.com/' });
    });
    expect(container.querySelector('[data-native-slot]')).not.toBeNull();

    act(() => useUI.getState().setHistoryOpen(true));
    expect(container.textContent).toContain('History');
    expect(container.textContent).not.toContain('hit a problem');
    act(() => root.unmount());
  });
});
