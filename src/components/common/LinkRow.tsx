import type { MouseEvent, ReactNode } from 'react';
import { Favicon } from './Favicon';
import { cn } from '../../utils/misc';
import { displayUrl } from '../../utils/url';

interface LinkRowProps {
  url: string;
  title: string;
  meta?: ReactNode;
  onOpen: () => void;
  onContextMenu?: (event: MouseEvent) => void;
  trailing?: ReactNode;
  className?: string;
}

/** A clickable favicon + title row used by start-page cards and widgets. */
export function LinkRow({
  url,
  title,
  meta,
  onOpen,
  onContextMenu,
  trailing,
  className,
}: LinkRowProps) {
  return (
    <div
      className={cn(
        'group/row relative flex items-center rounded-lg transition-ui hover:bg-hover',
        className,
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        onContextMenu={onContextMenu}
        className="flex min-w-0 flex-1 items-center gap-2.5 px-2 py-1.5 text-left"
      >
        <Favicon url={url} size={16} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] text-fg">{title}</span>
          <span className="block truncate text-[11.5px] text-fg-3">{meta ?? displayUrl(url)}</span>
        </span>
      </button>
      {trailing && (
        <div className="flex shrink-0 items-center pr-1 opacity-0 transition-ui group-focus-within/row:opacity-100 group-hover/row:opacity-100">
          {trailing}
        </div>
      )}
    </div>
  );
}
