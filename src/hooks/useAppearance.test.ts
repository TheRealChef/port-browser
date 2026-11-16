import { describe, expect, it } from 'vitest';
import { applyAppearance, resolveTheme } from './useAppearance';

describe('appearance', () => {
  it('resolves system mode from the OS preference', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
  });

  it('applies Port UI root attributes', () => {
    const root = document.createElement('html');
    applyAppearance(root, {
      theme: 'dark',
      palette: 'dusk',
      accent: 'teal',
      density: 'comfortable',
      reduceMotion: true,
    });
    expect(root.className).toBe('port h-teal');
    expect(root.dataset.theme).toBe('dark');
    expect(root.dataset.palette).toBe('dusk');
    expect(root.dataset.density).toBe('cozy');
    expect(root.dataset.motion).toBe('reduced');

    applyAppearance(root, {
      theme: 'light',
      palette: 'stone',
      accent: 'brand',
      density: 'compact',
      reduceMotion: false,
    });
    expect(root.dataset.palette).toBeUndefined();
    expect(root.dataset.density).toBe('compact');
    expect(root.dataset.motion).toBeUndefined();
  });
});
