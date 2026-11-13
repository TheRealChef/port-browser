import type { MediaState } from '../../host/bridge';

/** Largest declared artwork (sites list several sizes); falls back to the first. */
export function bestArtwork(artwork: MediaState['artwork']): string | null {
  let best: string | null = null;
  let bestSize = -1;
  for (const a of artwork) {
    if (!/^https?:\/\//i.test(a.src)) continue;
    const size = Math.max(
      0,
      ...a.sizes.split(/\s+/).map((s) => Number(s.toLowerCase().split('x')[0]) || 0),
    );
    if (size > bestSize) {
      best = a.src;
      bestSize = size;
    }
  }
  return best;
}

/** Current position in seconds, advanced by the time since the page reported it. */
export function mediaPosition(
  entry: Pick<MediaState, 'position' | 'duration' | 'playing'> & { receivedAt: number },
  now: number,
): number | null {
  if (entry.position === null) return null;
  const elapsed = entry.playing ? Math.max(0, now - entry.receivedAt) / 1000 : 0;
  const position = entry.position + elapsed;
  return entry.duration ? Math.min(entry.duration, position) : position;
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${rest}` : `${m}:${rest}`;
}
