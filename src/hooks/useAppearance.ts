import { useEffect, useSyncExternalStore } from 'react';
import { useBrowserHost } from '../app/providers/hostContext';
import { NativeBrowserHost } from '../host/NativeBrowserHost';
import { useSettings } from '../stores/settingsStore';
import { useWorkspace } from '../stores/workspaceStore';
import type { AccentColor, Palette, Settings, ThemeMode } from '../types/models';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribeToScheme(onChange: () => void): () => void {
  const query = window.matchMedia?.(DARK_QUERY);
  query?.addEventListener('change', onChange);
  return () => query?.removeEventListener('change', onChange);
}

const systemPrefersDark = () => window.matchMedia?.(DARK_QUERY).matches ?? true;

export function resolveTheme(mode: ThemeMode, prefersDark: boolean): 'light' | 'dark' {
  return mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;
}

export interface Appearance {
  theme: 'light' | 'dark';
  palette: Palette;
  accent: AccentColor;
  density: Settings['density'];
  reduceMotion: boolean;
}

/**
 * Makes `root` the Port UI root: `.port` scope, light/dark, preset, the local
 * hue (`h-<accent>`: selected rows, rails and indicators follow the space),
 * density and motion.
 */
export function applyAppearance(root: HTMLElement, a: Appearance): void {
  const keep = [...root.classList].filter((c) => c !== 'port' && !c.startsWith('h-'));
  root.className = ['port', `h-${a.accent}`, ...keep].join(' ');
  root.dataset.theme = a.theme;
  if (a.palette === 'stone') delete root.dataset.palette;
  else root.dataset.palette = a.palette;
  root.dataset.density = a.density === 'compact' ? 'compact' : 'cozy';
  if (a.reduceMotion) root.dataset.motion = 'reduced';
  else delete root.dataset.motion;
  root.style.colorScheme = a.theme;
}

function currentAppearance(prefersDark: boolean): Appearance {
  const s = useSettings.getState();
  const ws = useWorkspace.getState();
  const spaceAccent = ws.spaces[ws.activeSpaceId]?.accent ?? 'brand';
  return {
    theme: resolveTheme(s.theme, prefersDark),
    palette: s.palette,
    accent: s.accentMode === 'space' ? spaceAccent : s.fixedAccent,
    density: s.density,
    reduceMotion: s.reduceMotion,
  };
}

/** Applies the saved appearance before the first render, so nothing flashes. */
export function applyInitialAppearance(): void {
  applyAppearance(document.documentElement, currentAppearance(systemPrefersDark()));
}

/** Keeps the document root in sync with the appearance settings and the OS. */
export function useAppearance(): void {
  const host = useBrowserHost();
  const prefersDark = useSyncExternalStore(subscribeToScheme, systemPrefersDark, () => true);
  const theme = useSettings((s) => resolveTheme(s.theme, prefersDark));
  const palette = useSettings((s) => s.palette);
  const spaceAccent = useWorkspace((s) => s.spaces[s.activeSpaceId]?.accent ?? 'brand');
  const accentMode = useSettings((s) => s.accentMode);
  const fixedAccent = useSettings((s) => s.fixedAccent);
  const density = useSettings((s) => s.density);
  const reduceMotion = useSettings((s) => s.reduceMotion);
  const accent = accentMode === 'space' ? spaceAccent : fixedAccent;

  useEffect(() => {
    const root = document.documentElement;
    applyAppearance(root, { theme, palette, accent, density, reduceMotion });
    if (host instanceof NativeBrowserHost) {
      const styles = getComputedStyle(root);
      host.setTheme({
        dark: theme === 'dark',
        background: styles.getPropertyValue('--surface-0').trim(),
        caption: styles.getPropertyValue('--surface-0').trim(),
        text: styles.getPropertyValue('--ink').trim(),
      });
    }
  }, [host, theme, palette, accent, density, reduceMotion]);
}
