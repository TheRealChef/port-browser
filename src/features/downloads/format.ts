import type { DownloadItem } from '../../host/bridge';

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
}

/** Share of a download done, 0–1, or null when the size is unknown. */
export function downloadProgress(item: DownloadItem): number | null {
  if (item.state === 'completed') return 1;
  if (!item.totalBytes) return null;
  return Math.min(1, item.receivedBytes / item.totalBytes);
}
