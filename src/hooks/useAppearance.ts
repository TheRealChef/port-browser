import { useEffect } from 'react';
import { accentValue } from '../features/workspace/appearance';
import { useSettings } from '../stores/settingsStore';
import { useWorkspace } from '../stores/workspaceStore';

/** Applies theme preferences (accent, density, motion) to the document root. */
export function useAppearance(): void {
  const spaceAccent = useWorkspace((s) => s.spaces[s.activeSpaceId]?.accent ?? 'green');
  const accentMode = useSettings((s) => s.accentMode);
  const fixedAccent = useSettings((s) => s.fixedAccent);
  const density = useSettings((s) => s.density);
  const reduceMotion = useSettings((s) => s.reduceMotion);

  useEffect(() => {
    const accent = accentMode === 'space' ? spaceAccent : fixedAccent;
    document.documentElement.style.setProperty('--accent', accentValue(accent));
  }, [accentMode, spaceAccent, fixedAccent]);

  useEffect(() => {
    document.documentElement.dataset.density = density;
    document.documentElement.dataset.reduceMotion = String(reduceMotion);
  }, [density, reduceMotion]);
}
