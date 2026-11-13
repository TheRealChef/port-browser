import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Copy, ExternalLink, Info, ShieldAlert, TriangleAlert } from 'lucide-react';
import { useBrowserHost, useNavigation } from '../../app/providers/hostContext';
import { selectContentCovered, useUI } from '../../stores/uiStore';
import { useWorkspace } from '../../stores/workspaceStore';
import { tabDisplayTitle } from '../../features/workspace/selectors';
import type { Tab } from '../../types/models';
import { displayUrl } from '../../utils/url';
import { Button } from '../common/Button';
import { Favicon } from '../common/Favicon';
import { StartPage } from '../start/StartPage';
import { NativeBrowserHost } from '../../host/NativeBrowserHost';

const SLOW_LOAD_MS = 12000;

export function TabView({ tabId }: { tabId: string }) {
  const tab = useWorkspace((s) => s.tabs[tabId]);
  if (!tab) return <StartPage />;
  if (!tab.url) return <StartPage />;
  return <PageView tab={tab} />;
}

function PageView({ tab }: { tab: Tab }) {
  const host = useBrowserHost();
  const override = useUI((s) => Boolean(s.embedOverrides[tab.id]));
  const support = host.getEmbedSupport(tab.url);

  if (support.mode === 'blocked' && !override) {
    return <EmbedFallback tab={tab} reason={support.reason} />;
  }
  if (support.mode === 'native' && host instanceof NativeBrowserHost) {
    return <NativeSlot host={host} tab={tab} />;
  }
  return (
    <FramePreview tab={tab} local={support.mode === 'iframe' && support.local} forced={override} />
  );
}

/**
 * Placeholder the desktop shell lays the tab's real WebView2 view over. It
 * reports its bounds, and while any UI overlay is open (the shell's views
 * always draw above the UI) it asks for a still snapshot instead.
 */
function NativeSlot({ host, tab }: { host: NativeBrowserHost; tab: Tab }) {
  const ref = useRef<HTMLDivElement>(null);
  const covered = useUI(selectContentCovered);
  const snapshot = useUI((s) => s.engineTabs[tab.id]?.snapshot ?? null);
  const loading = useUI((s) => s.engineTabs[tab.id]?.loading ?? false);
  const dismissToast = useUI((s) => s.dismissToast);
  const tabId = tab.id;
  const spaceId = tab.spaceId;
  // Only needed when the view is created; later URL changes come from the engine.
  const initialUrl = useRef(tab.url);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const send = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        host.showView({
          tabId,
          url: initialUrl.current,
          bounds: { x: r.left, y: r.top, width: r.width, height: r.height },
          covered,
          spaceId,
        });
      });
    };
    send();
    const observer = new ResizeObserver(send);
    observer.observe(el);
    window.addEventListener('resize', send);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', send);
    };
  }, [host, tabId, spaceId, covered]);

  // Hide the view when the slot goes away (start page, dashboards, settings).
  useEffect(() => () => host.showView({ tabId: null }), [host, tabId]);

  return (
    <div ref={ref} data-native-slot className="relative h-full overflow-hidden bg-canvas">
      {/* Stays until the shell reports the live view is back, so uncovering never flashes. */}
      {snapshot && (
        <img
          src={snapshot}
          alt=""
          draggable={false}
          className="absolute inset-0 size-full object-fill"
          onLoad={() => host.snapshotShown(tabId)}
          onPointerDown={() => dismissToast()}
        />
      )}
      {!snapshot && loading && (
        <div className="absolute inset-x-0 top-0 h-[2px] overflow-hidden">
          <div className="h-full w-2/5 animate-progress bg-info" />
        </div>
      )}
    </div>
  );
}

type LoadState = 'loading' | 'loaded' | 'slow';

function FramePreview({ tab, local, forced }: { tab: Tab; local: boolean; forced: boolean }) {
  const nav = useNavigation();
  const reloadKey = useUI((s) => s.reloadKeys[tab.id] ?? 0);
  const frameKey = `${tab.url}#${reloadKey}`;
  const [load, setLoad] = useState<{ key: string; state: LoadState }>({
    key: frameKey,
    state: 'loading',
  });
  const state: LoadState = load.key === frameKey ? load.state : 'loading';

  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        setLoad((l) =>
          l.key === frameKey && l.state === 'loaded' ? l : { key: frameKey, state: 'slow' },
        ),
      SLOW_LOAD_MS,
    );
    return () => window.clearTimeout(timer);
  }, [frameKey]);

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex h-8 shrink-0 items-center gap-2 border-b border-line bg-raised/60 px-3 text-[12px] text-fg-3">
        {state === 'loading' && (
          <div className="absolute inset-x-0 top-0 h-[2px] overflow-hidden">
            <div className="h-full w-2/5 animate-progress bg-info" />
          </div>
        )}
        {state === 'slow' ? (
          <TriangleAlert size={13} className="shrink-0 text-warning" />
        ) : (
          <Info size={13} className="shrink-0" />
        )}
        <span className="truncate">
          {state === 'slow'
            ? 'This page is taking a long time. The site may be unreachable or refusing to be embedded.'
            : forced
              ? 'Embedding attempted against the site’s known policy — a blank or error page means it was refused.'
              : local
                ? 'Local preview. If the server isn’t running, the frame shows a connection error.'
                : 'Embedded preview. Some sites refuse to be shown inside other pages and will appear blank.'}
        </span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => nav.openExternal(tab.url)}
          className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-fg-2 transition-ui hover:bg-hover hover:text-fg"
        >
          <ExternalLink size={12} />
          Open in browser
        </button>
      </div>
      <iframe
        key={frameKey}
        src={tab.url}
        title={tabDisplayTitle(tab)}
        className="min-h-0 w-full flex-1 border-0 bg-white"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="fullscreen; clipboard-write"
        onLoad={() => setLoad({ key: frameKey, state: 'loaded' })}
      />
    </div>
  );
}

function EmbedFallback({ tab, reason }: { tab: Tab; reason: string }) {
  const nav = useNavigation();
  const setEmbedOverride = useUI((s) => s.setEmbedOverride);
  const showToast = useUI((s) => s.showToast);

  return (
    <div className="flex h-full items-center justify-center overflow-auto p-8">
      <div className="w-full max-w-[460px] animate-fade text-center">
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl border border-line bg-raised shadow-card">
          <Favicon url={tab.url} size={30} />
        </div>
        <h1 className="mb-1 truncate text-[18px] font-semibold tracking-tight">
          {tabDisplayTitle(tab)}
        </h1>
        <p className="mb-6 truncate text-[12.5px] text-fg-3">{displayUrl(tab.url)}</p>

        <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-line bg-raised/70 p-3 text-left text-[12.5px] leading-relaxed text-fg-2">
          <ShieldAlert size={16} className="mt-0.5 shrink-0 text-warning" />
          <span>
            {reason} Port’s development build runs inside your browser and cannot override that, so
            this page opens in a regular browser tab instead.
          </span>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="primary" icon={ExternalLink} onClick={() => nav.openExternal(tab.url)}>
            Open in browser
          </Button>
          <Button
            icon={Copy}
            onClick={() => {
              navigator.clipboard
                .writeText(tab.url)
                .then(() => showToast('Link copied', 'success'))
                .catch(() => showToast('Clipboard is not available', 'error'));
            }}
          >
            Copy link
          </Button>
          <Button variant="ghost" onClick={() => setEmbedOverride(tab.id, true)}>
            Try embedding anyway
          </Button>
        </div>
      </div>
    </div>
  );
}
