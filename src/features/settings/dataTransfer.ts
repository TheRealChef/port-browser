import { askConfirm } from '../../components/common/dialogs';
import { buildExport, parseImport } from '../../stores/persistence';
import { getSettingsSnapshot, useSettings } from '../../stores/settingsStore';
import { useUI } from '../../stores/uiStore';
import { pickWorkspaceData, useWorkspace } from '../../stores/workspaceStore';

const toast = (message: string, tone?: 'info' | 'success' | 'error') =>
  useUI.getState().showToast(message, tone);

export function exportConfiguration(): void {
  const data = buildExport(pickWorkspaceData(useWorkspace.getState()), getSettingsSnapshot());
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `vela-config-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Configuration exported', 'success');
}

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export async function importConfiguration(file: File): Promise<void> {
  if (file.size > MAX_IMPORT_BYTES) {
    toast('That file is too large to be a Vela configuration.', 'error');
    return;
  }
  const result = parseImport(await file.text());
  if (!result.ok) {
    toast(result.error, 'error');
    return;
  }
  const w = result.workspace;
  const counts = [
    `${Object.keys(w.spaces).length} spaces`,
    `${Object.keys(w.groups).length} groups`,
    `${Object.keys(w.tabs).length} tabs`,
    `${Object.keys(w.dashboards).length} dashboards`,
    `${Object.keys(w.bookmarks).length} bookmarks`,
  ].join(', ');
  const skipped = result.dropped ? ` ${result.dropped} invalid record(s) will be skipped.` : '';
  const { ok } = await askConfirm({
    title: 'Replace current configuration?',
    message: `The import contains ${counts}.${skipped} Your current spaces, tabs and settings will be replaced.`,
    confirmLabel: 'Import',
    danger: true,
  });
  if (!ok) return;
  useWorkspace.getState().replaceAll(result.workspace);
  useSettings.getState().replaceAll(result.settings);
  useUI.getState().setSettingsOpen(false);
  toast('Configuration imported', 'success');
}

export async function resetApplicationData(): Promise<void> {
  const { ok } = await askConfirm({
    title: 'Reset all Vela data?',
    message:
      'All spaces, groups, tabs, dashboards, bookmarks and settings will be replaced by the defaults. Consider exporting first. This cannot be undone.',
    confirmLabel: 'Reset everything',
    danger: true,
  });
  if (!ok) return;
  useWorkspace.getState().reset();
  useSettings.getState().reset();
  useUI.getState().setSettingsOpen(false);
  toast('Vela was reset to defaults');
}
