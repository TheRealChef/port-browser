import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Ban,
  File as FileIcon,
  FolderOpen,
  Pause,
  Play,
  RotateCw,
  Trash2,
  X,
  type Icon,
} from '../../components/icons';
import { useBrowserHost } from '../../app/providers/hostContext';
import { NativeBrowserHost } from '../../host/NativeBrowserHost';
import type { DownloadAction, DownloadItem } from '../../host/bridge';
import { downloadProgress, formatBytes } from './format';
import { useUI } from '../../stores/uiStore';
import { cn, relativeTime } from '../../utils/misc';
import { hostnameOf } from '../../utils/url';

function statusText(item: DownloadItem): string {
  const received = formatBytes(item.receivedBytes);
  switch (item.state) {
    case 'completed':
      return item.missing
        ? 'Deleted or moved'
        : `${item.totalBytes ? formatBytes(item.totalBytes) : received} · ${hostnameOf(item.url)}`;
    case 'paused':
      return `Paused · ${received}${item.totalBytes ? ` of ${formatBytes(item.totalBytes)}` : ''}`;
    case 'interrupted':
      return item.reason === 'UserCanceled'
        ? 'Canceled'
        : `Failed${item.reason ? ` · ${humanReason(item.reason)}` : ''}`;
    default:
      return `${received}${item.totalBytes ? ` of ${formatBytes(item.totalBytes)}` : ''}`;
  }
}

function humanReason(reason: string): string {
  return reason
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());
}

/** Popover listing downloads from the desktop shell. Anchored under the toolbar's right edge. */
export function DownloadsPanel({ anchor }: { anchor: HTMLElement | null }) {
  const host = useBrowserHost();
  const open = useUI((s) => s.downloadsOpen);
  const items = useUI((s) => s.downloads);
  const setOpen = useUI((s) => s.setDownloadsOpen);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panel.current?.contains(target) || anchor?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener('pointerdown', onDown, true);
    return () => window.removeEventListener('pointerdown', onDown, true);
  }, [open, anchor, setOpen]);

  if (!open || !(host instanceof NativeBrowserHost)) return null;
  const rect = anchor?.getBoundingClientRect();
  const act = (id: string, action: DownloadAction) => host.downloadAction(id, action);

  return createPortal(
    <div
      ref={panel}
      role="dialog"
      aria-label="Downloads"
      className="menu fixed z-[90] flex max-h-[min(520px,80vh)] w-[380px] flex-col p-0"
      style={{
        top: (rect?.bottom ?? 44) + 6,
        right: Math.max(8, window.innerWidth - (rect?.right ?? window.innerWidth - 8)),
      }}
    >
      <div className="flex items-center gap-2 px-4 pb-2 pt-3">
        <h2 className="flex-1 text-[13.5px] font-semibold">Downloads</h2>
        <PanelButton
          icon={FolderOpen}
          label="Open folder"
          onClick={() => host.openDownloadsFolder()}
        />
        <PanelButton
          icon={Trash2}
          label="Clear list"
          disabled={!items.some((i) => i.state !== 'inProgress' && i.state !== 'paused')}
          onClick={() => host.clearDownloads()}
        />
        <PanelButton icon={X} label="Close" onClick={() => setOpen(false)} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {items.length === 0 ? (
          <p className="px-2 py-8 text-center text-[12.5px] text-fg-3">
            Files you download will show up here.
          </p>
        ) : (
          items.map((item) => <DownloadRow key={item.id} item={item} act={act} />)
        )}
      </div>
    </div>,
    document.body,
  );
}

function DownloadRow({
  item,
  act,
}: {
  item: DownloadItem;
  act: (id: string, action: DownloadAction) => void;
}) {
  const progress = downloadProgress(item);
  const done = item.state === 'completed' && !item.missing;
  const failed = item.state === 'interrupted';
  return (
    <div className="group flex items-center gap-3 rounded-[8px] px-2 py-2 transition-ui hover:bg-hover">
      <button
        type="button"
        disabled={!done}
        onClick={() => act(item.id, 'open')}
        title={done ? 'Open' : undefined}
        className={cn(
          'icbox size-9 shrink-0 rounded-[9px]',
          failed || item.missing ? 'h-graphite opacity-60' : 'h-cobalt',
        )}
      >
        <FileIcon size={16} />
      </button>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          disabled={!done}
          onClick={() => act(item.id, 'open')}
          className={cn(
            'block max-w-full truncate text-left text-[13px]',
            done ? 'text-fg hover:underline' : 'text-fg-2',
            (failed || item.missing) && 'line-through decoration-fg-3',
          )}
        >
          {item.fileName}
        </button>
        <p className="tabular truncate text-[11.5px] text-fg-3">
          {statusText(item)}
          {item.state === 'completed' && ` · ${relativeTime(item.startedAt)}`}
        </p>
        {(item.state === 'inProgress' || item.state === 'paused') && (
          <div
            className={cn(
              'bar mt-1.5',
              progress === null && 'indet',
              item.state === 'paused' ? 'h-graphite' : 'h-cobalt',
            )}
          >
            <i
              style={progress === null ? undefined : { width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center opacity-80 group-hover:opacity-100">
        {item.state === 'inProgress' && (
          <>
            <PanelButton icon={Pause} label="Pause" onClick={() => act(item.id, 'pause')} />
            <PanelButton icon={Ban} label="Cancel" onClick={() => act(item.id, 'cancel')} />
          </>
        )}
        {item.state === 'paused' && (
          <>
            <PanelButton icon={Play} label="Resume" onClick={() => act(item.id, 'resume')} />
            <PanelButton icon={Ban} label="Cancel" onClick={() => act(item.id, 'cancel')} />
          </>
        )}
        {failed && item.canResume && (
          <PanelButton icon={RotateCw} label="Retry" onClick={() => act(item.id, 'resume')} />
        )}
        {done && (
          <PanelButton
            icon={FolderOpen}
            label="Show in folder"
            onClick={() => act(item.id, 'showInFolder')}
          />
        )}
        {item.state !== 'inProgress' && item.state !== 'paused' && (
          <PanelButton icon={X} label="Remove from list" onClick={() => act(item.id, 'remove')} />
        )}
      </div>
    </div>
  );
}

function PanelButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: Icon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="btn icon quiet sm size-7 text-fg-3 disabled:border-transparent disabled:text-fg-disabled"
    >
      <Icon size={14} />
    </button>
  );
}
