import { useEffect, useMemo, useState } from 'react';
import {
  Pause,
  Play,
  Repeat,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
  type Icon,
} from '../../components/icons';
import { useBrowserHost } from '../../app/providers/hostContext';
import { Favicon } from '../../components/common/Favicon';
import { NativeBrowserHost } from '../../host/NativeBrowserHost';
import type { MediaAction } from '../../host/bridge';
import { useUI, type MediaEntry } from '../../stores/uiStore';
import { useWorkspace } from '../../stores/workspaceStore';
import { cn } from '../../utils/misc';
import { hostnameOf } from '../../utils/url';
import { tabDisplayTitle } from '../workspace/selectors';
import { bestArtwork, formatTime, mediaPosition } from './mediaFormat';

/**
 * "Now playing" card at the bottom of the sidebar. Filled from whatever a tab
 * plays (YouTube, Spotify, SoundCloud, podcasts…) through the site's own
 * media session, and controls it with the site's own buttons.
 */
export function MiniPlayer() {
  const host = useBrowserHost();
  const media = useUI((s) => s.media);
  const tabs = useWorkspace((s) => s.tabs);
  const [picked, setPicked] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const sources = useMemo(
    () =>
      Object.entries(media)
        .filter(([id, m]) => tabs[id] && !m.dismissed)
        .sort(
          ([, a], [, b]) =>
            Number(b.playing) - Number(a.playing) || b.lastPlayedAt - a.lastPlayedAt,
        ),
    [media, tabs],
  );
  const current = sources.find(([id]) => id === picked) ?? sources[0];
  const playing = current?.[1].playing ?? false;

  // Advance the position smoothly between updates from the page.
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [playing]);

  if (!(host instanceof NativeBrowserHost) || !current) return null;
  const [tabId, m] = current;
  const tab = tabs[tabId]!;
  const act = (action: MediaAction | 'mute' | 'unmute', time?: number) =>
    host.mediaAction(tabId, action, time);
  const index = sources.findIndex(([id]) => id === tabId);

  return (
    <section
      aria-label="Now playing"
      className="group/player relative mx-2.5 mb-2 overflow-hidden rounded-xl bg-surface shadow-card"
    >
      <Backdrop entry={m} />
      <div className="relative flex items-center gap-2.5 p-2 pb-1">
        <button
          type="button"
          title="Go to tab"
          onClick={() => {
            useUI.getState().setSettingsOpen(false);
            useWorkspace.getState().selectTab(tabId);
          }}
          className="flex min-w-0 flex-1 items-center gap-2.5 pr-4 text-left"
        >
          <Artwork entry={m} url={tab.url} favicon={tab.favicon} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-semibold text-fg">
              {m.title || tabDisplayTitle(tab)}
            </span>
            <span className="block truncate text-[11.5px] text-fg-3">
              {[m.artist, hostnameOf(tab.url).replace(/^www\./, '')].filter(Boolean).join(' · ')}
            </span>
          </span>
        </button>
        <button
          type="button"
          aria-label="Hide player"
          title="Hide until it plays again"
          onClick={() => useUI.getState().dismissMedia(tabId)}
          className="btn icon quiet sm absolute right-1 top-1 size-5 text-fg-3 opacity-0 group-hover/player:opacity-100 focus-visible:opacity-100"
        >
          <X size={12} />
        </button>
      </div>

      <Progress entry={m} now={now} onSeek={(t) => act('seekto', t)} />

      <div className="relative flex items-center px-1.5 pb-1.5">
        <ControlButton
          icon={m.muted ? VolumeX : Volume2}
          label={m.muted ? 'Unmute tab' : 'Mute tab'}
          active={m.muted}
          onClick={() => act(m.muted ? 'unmute' : 'mute')}
        />
        <span className="flex flex-1 items-center justify-center gap-1">
          <ControlButton
            icon={SkipBack}
            label="Previous"
            disabled={!m.actions.includes('previoustrack')}
            onClick={() => act('previoustrack')}
          />
          <button
            type="button"
            aria-label={m.playing ? 'Pause' : 'Play'}
            title={m.playing ? 'Pause' : 'Play'}
            onClick={() => act(m.playing ? 'pause' : 'play')}
            className="flex size-8 items-center justify-center rounded-full bg-brand text-on-brand shadow-card transition-ui hover:brightness-110 active:scale-95"
          >
            {m.playing ? (
              <Pause size={15} fill="currentColor" strokeWidth={0} />
            ) : (
              <Play size={15} fill="currentColor" strokeWidth={0} className="translate-x-px" />
            )}
          </button>
          <ControlButton
            icon={SkipForward}
            label="Next"
            disabled={!m.actions.includes('nexttrack')}
            onClick={() => act('nexttrack')}
          />
        </span>
        {sources.length > 1 ? (
          <button
            type="button"
            title="Switch between tabs playing media"
            onClick={() => setPicked(sources[(index + 1) % sources.length]![0])}
            className="tabular flex h-7 min-w-7 items-center justify-center gap-1 rounded-[7px] px-1 text-[11px] text-fg-3 transition-ui hover:bg-hover hover:text-fg"
          >
            <Repeat size={11} />
            {index + 1}/{sources.length}
          </button>
        ) : (
          <span className="w-7" />
        )}
      </div>
    </section>
  );
}

/** Blurred artwork wash behind the card, kept faint so text stays readable. */
function Backdrop({ entry }: { entry: MediaEntry }) {
  const art = bestArtwork(entry.artwork);
  if (!art) return null;
  return (
    <img
      src={art}
      alt=""
      aria-hidden
      referrerPolicy="no-referrer"
      draggable={false}
      className="pointer-events-none absolute inset-0 size-full scale-125 object-cover opacity-[0.16] blur-2xl saturate-150"
    />
  );
}

function Artwork({
  entry,
  url,
  favicon,
}: {
  entry: MediaEntry;
  url: string;
  favicon: string | null;
}) {
  const art = bestArtwork(entry.artwork);
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-elevated">
      {art && failed !== art ? (
        <img
          src={art}
          alt=""
          referrerPolicy="no-referrer"
          draggable={false}
          className="size-full object-cover"
          onError={() => setFailed(art)}
        />
      ) : (
        <Favicon url={url} icon={favicon} size={20} />
      )}
      {entry.playing && <Equalizer />}
    </span>
  );
}

/** Three bouncing bars while playing; static when reduced motion is on. */
function Equalizer() {
  return (
    <span
      aria-hidden
      className="absolute bottom-1 right-1 flex h-2.5 items-end gap-[2px] rounded-sm bg-black/45 px-[3px] py-[2px]"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[2px] animate-eq rounded-full bg-white motion-reduce:animate-none"
          style={{ animationDelay: `${i * 0.18}s`, height: '100%' }}
        />
      ))}
    </span>
  );
}

function Progress({
  entry,
  now,
  onSeek,
}: {
  entry: MediaEntry;
  now: number;
  onSeek: (seconds: number) => void;
}) {
  const position = mediaPosition(entry, now);
  const duration = entry.duration;
  if (position === null || !duration) {
    return <div className="relative mx-2.5 my-1 h-[3px] rounded-full bg-sunk shadow-sunk" />;
  }
  const canSeek = entry.actions.includes('seekto') || entry.element;
  const share = Math.min(1, position / duration);
  return (
    <div className="relative flex items-center gap-2 px-2.5 py-0.5">
      <span className="tabular w-8 text-[10.5px] text-fg-3">{formatTime(position)}</span>
      <div
        role="slider"
        aria-label="Playback position"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(position)}
        tabIndex={canSeek ? 0 : -1}
        onClick={(e) => {
          if (!canSeek) return;
          const r = e.currentTarget.getBoundingClientRect();
          onSeek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * duration);
        }}
        onKeyDown={(e) => {
          if (!canSeek) return;
          if (e.key === 'ArrowRight') onSeek(Math.min(duration, position + 10));
          if (e.key === 'ArrowLeft') onSeek(Math.max(0, position - 10));
        }}
        className={cn(
          'group/seek relative h-3 flex-1 outline-none',
          canSeek ? 'cursor-pointer' : 'cursor-default',
        )}
      >
        <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-sunk shadow-sunk" />
        <span
          className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-accent"
          style={{ width: `${share * 100}%` }}
        />
        {canSeek && (
          <span
            className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg opacity-0 shadow-card transition-ui group-hover/seek:opacity-100 group-focus-visible/seek:opacity-100"
            style={{ left: `${share * 100}%` }}
          />
        )}
      </div>
      <span className="tabular w-8 text-right text-[10.5px] text-fg-3">{formatTime(duration)}</span>
    </div>
  );
}

function ControlButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  active,
}: {
  icon: Icon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex size-7 items-center justify-center rounded-md transition-ui hover:bg-hover hover:text-fg disabled:text-fg-disabled disabled:hover:bg-transparent',
        active ? 'text-danger' : 'text-fg-2',
      )}
    >
      <Icon size={14} />
    </button>
  );
}
