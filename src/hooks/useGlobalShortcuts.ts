import { useEffect } from 'react';
import { useNavigation } from '../app/providers/hostContext';
import { sortedSpaces } from '../features/workspace/selectors';
import { useSettings } from '../stores/settingsStore';
import { useUI } from '../stores/uiStore';
import { useWorkspace } from '../stores/workspaceStore';

function isTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) {
    return !['checkbox', 'radio', 'button', 'submit', 'range', 'color'].includes(target.type);
  }
  return false;
}

/**
 * Global keyboard shortcuts. Ctrl (or ⌘) is the primary modifier; Alt
 * variants exist for combinations the host browser reserves (Chrome never
 * lets a page intercept Ctrl+T or Ctrl+W). Shortcuts cannot fire while
 * focus is inside an embedded page's iframe.
 */
export function useGlobalShortcuts(): void {
  const nav = useNavigation();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      const ui = useUI.getState();
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      const typing = isTextField(event.target);
      const overlayOpen = ui.dialog !== null || ui.contextMenu !== null;

      if (event.key === 'Escape') {
        if (ui.contextMenu) ui.closeContextMenu();
        else if (ui.paletteOpen) ui.setPaletteOpen(false);
        else if (ui.downloadsOpen) ui.setDownloadsOpen(false);
        else if ((ui.settingsOpen || ui.historyOpen) && !ui.dialog && !typing)
          ui.setSettingsOpen(false);
        return;
      }
      if (overlayOpen) return;

      const run = (action: () => void) => {
        event.preventDefault();
        action();
      };

      if (mod && !event.altKey && !event.shiftKey) {
        if (key === 'k') return run(() => ui.setPaletteOpen(!ui.paletteOpen));
        if (key === 'l') {
          return run(() => {
            ui.setPaletteOpen(false);
            ui.focusAddressBar();
          });
        }
      }

      if (typing || ui.paletteOpen) return;

      const altOnly = event.altKey && !mod && !event.shiftKey;
      const modOnly = mod && !event.altKey && !event.shiftKey;

      const shiftCombo = event.shiftKey && mod !== event.altKey;
      if (shiftCombo && key === 't') return run(() => nav.reopenClosedTab());
      if ((modOnly || altOnly) && key === 't') return run(() => nav.newTab());
      if ((modOnly || altOnly) && key === 'w') return run(() => nav.closeActiveTab());
      if (modOnly && key === 'b') return run(() => useSettings.getState().toggleSidebar());
      if (modOnly && key === 'r') return run(() => nav.reload());
      if (modOnly && key === ',') return run(() => ui.setSettingsOpen(!ui.settingsOpen));
      if (modOnly && key === 'h') return run(() => ui.setHistoryOpen(!ui.historyOpen));
      if (modOnly && key === 'j') return run(() => ui.setDownloadsOpen(!ui.downloadsOpen));

      if ((modOnly || altOnly) && /^[1-9]$/.test(event.key)) {
        const space = sortedSpaces(useWorkspace.getState().spaces)[Number(event.key) - 1];
        if (space) {
          return run(() => {
            ui.setSettingsOpen(false);
            useWorkspace.getState().switchSpace(space.id);
          });
        }
      }

      if (event.altKey && !mod && event.key === 'ArrowLeft') return run(() => nav.back());
      if (event.altKey && !mod && event.key === 'ArrowRight') return run(() => nav.forward());
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [nav]);
}
