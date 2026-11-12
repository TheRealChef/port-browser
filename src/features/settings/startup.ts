import { useSettings } from '../../stores/settingsStore';
import { useWorkspace } from '../../stores/workspaceStore';
import type { SpaceView } from '../../types/models';
import { sortedSpaces } from '../workspace/selectors';

/**
 * Runs once at launch, after the stores have hydrated synchronously from
 * localStorage. "restore" keeps every space's last view; "defaultSpace"
 * opens the default space on its start page.
 */
export function applyStartupBehavior(): void {
  const settings = useSettings.getState();
  if (settings.restoreBehavior !== 'defaultSpace') return;
  const ws = useWorkspace.getState();
  const target =
    settings.defaultSpaceId && ws.spaces[settings.defaultSpaceId]
      ? settings.defaultSpaceId
      : sortedSpaces(ws.spaces)[0]?.id;
  if (!target) return;
  const spaceViews: Record<string, SpaceView> = {};
  for (const id of Object.keys(ws.spaces)) spaceViews[id] = { kind: 'start' };
  useWorkspace.setState({ activeSpaceId: target, spaceViews });
}
