import { useState } from 'react';
import { Globe, Plus } from 'lucide-react';
import { faviconCandidate, hostnameOf, isLocalUrl } from '../../utils/url';
import { cn } from '../../utils/misc';

/** Origins whose /favicon.ico failed this session, so we don't retry and flicker. */
const failed = new Set<string>();

const PALETTE = ['#a78bfa', '#7aa2f7', '#4fd1c5', '#5bc69d', '#e6ae68', '#f0956a', '#f08ba0'];

function letterColor(seed: string): string {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length] as string;
}

export function Favicon({
  url,
  size = 16,
  className,
}: {
  url: string;
  size?: number;
  className?: string;
}) {
  // Local dev servers are often not running; don't probe them for icons.
  const src = url && !isLocalUrl(url) ? faviconCandidate(url) : null;
  const [errorSrc, setErrorSrc] = useState<string | null>(null);
  const box = { width: size, height: size };

  if (!url) {
    return (
      <span
        className={cn('flex shrink-0 items-center justify-center text-fg-3', className)}
        style={box}
      >
        <Plus size={size - 2} strokeWidth={2} />
      </span>
    );
  }

  if (!src || errorSrc === src || failed.has(src)) {
    const host = hostnameOf(url);
    const letter = host
      .replace(/^www\./, '')
      .charAt(0)
      .toUpperCase();
    if (!letter || /[^A-Z0-9]/.test(letter)) {
      return <Globe size={size} className={cn('shrink-0 text-fg-3', className)} />;
    }
    return (
      <span
        aria-hidden
        className={cn(
          'flex shrink-0 items-center justify-center rounded-[4px] font-semibold text-[#14121c]',
          className,
        )}
        style={{ ...box, fontSize: size * 0.62, background: letterColor(host) }}
      >
        {letter}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      draggable={false}
      className={cn('shrink-0 rounded-[3px] object-contain', className)}
      style={box}
      onError={() => {
        failed.add(src);
        setErrorSrc(src);
      }}
    />
  );
}
