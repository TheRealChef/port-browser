import { useState } from 'react';
import { Globe, Plus } from '../icons';
import { faviconCandidate, hostnameOf, isLocalUrl } from '../../utils/url';
import { cn } from '../../utils/misc';

/** Origins whose /favicon.ico failed this session, so we don't retry and flicker. */
const failed = new Set<string>();

/** Letter tiles use Port UI's `.fav`: a workspace-hue wash with its ink. */
const HUES = ['h-cobalt', 'h-teal', 'h-lichen', 'h-clay', 'h-heather', 'h-brand', 'h-graphite'];

function letterHue(seed: string): string {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return HUES[Math.abs(hash) % HUES.length] as string;
}

export function Favicon({
  url,
  icon,
  size = 16,
  className,
}: {
  url: string;
  /** Icon URL reported by the browser engine, preferred over guessing. */
  icon?: string | null;
  size?: number;
  className?: string;
}) {
  // Local dev servers are often not running; don't probe them for icons.
  const guess = url && !isLocalUrl(url) ? faviconCandidate(url) : null;
  const src = icon && url && !failed.has(icon) ? icon : guess;
  const [errorSrc, setErrorSrc] = useState<string | null>(null);
  const box = { width: size, height: size };

  if (!url) {
    return (
      <span
        className={cn('flex shrink-0 items-center justify-center text-fg-3', className)}
        style={box}
      >
        <Plus size={size - 2} />
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
        className={cn('fav', letterHue(host), className)}
        style={{ ...box, fontSize: Math.round(size * 0.6), borderRadius: Math.max(4, size / 4) }}
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
