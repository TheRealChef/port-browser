import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Settings } from '../types/models';
import { clamp } from '../utils/validate';
import {
  DEFAULT_SETTINGS,
  SETTINGS_SCHEMA_VERSION,
  SETTINGS_STORAGE_KEY,
  SIDEBAR_MAX,
  SIDEBAR_MIN,
  createSafeStorage,
  sanitizeSettings,
} from './persistence';

interface SettingsActions {
  update: (patch: Partial<Settings>) => void;
  setSidebarWidth: (width: number) => void;
  toggleSidebar: () => void;
  replaceAll: (settings: Settings) => void;
  reset: () => void;
}

export type SettingsState = Settings & SettingsActions;

function pickSettings(state: Settings): Settings {
  return sanitizeSettings(state);
}

export const useSettings = create<SettingsState>()(
  persist<SettingsState, [], [], Settings>(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(patch),
      setSidebarWidth: (width) =>
        set({ sidebarWidth: clamp(Math.round(width), SIDEBAR_MIN, SIDEBAR_MAX) }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      replaceAll: (settings) => set(sanitizeSettings(settings)),
      reset: () => set({ ...DEFAULT_SETTINGS }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      version: SETTINGS_SCHEMA_VERSION,
      storage: createSafeStorage<Settings>(),
      partialize: pickSettings,
      merge: (persisted, current) => ({ ...current, ...sanitizeSettings(persisted) }),
    },
  ),
);

export function getSettingsSnapshot(): Settings {
  return pickSettings(useSettings.getState());
}
