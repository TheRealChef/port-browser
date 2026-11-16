# Changelog

## 0.1.0 — 2026-11-13

First handoff of the Port design system.

- Direction locked: Material Atelier, Brief palette, symmetric layout, IBM Plex type, compact density.
- Brand separated from success: `brand` is a deep bottle-mineral, and `mineral` means success only.
- Tokens: 46 colours (light and dark), spacing, radii, shadows, motion and type styles, in CSS, JSON, DTCG JSON, ES module and Tailwind formats.
- Presets: Stone & Slate (default), Dusk, Signal, Pigment and High contrast (WCAG AAA, automatic under `prefers-contrast: more`).
- Components, all Port-drawn:
  - buttons, groups and toolbars
  - text fields, steppers and token fields
  - checkbox, radio, switch, slider, segmented control and swatches
  - select, menus, context menu and date picker
  - tooltip, popover, dialog, sheet and command palette
  - banners, toasts, progress, spinners, status glyphs, skeletons and empty states
  - rows, trees and groups
  - tables with grouping, sorting and selection
  - tabs, breadcrumbs, steps and tool stripe
  - window chrome, panels, tiles, settings sections, splitters and scrollbars
- Platform: frameless window chrome for macOS, Windows and Linux, platform shortcut labels, RTL, long-label tooltips, forced colours, reduced motion and reduced transparency.
- React bindings (`@port/ui/react`), examples for HTML, React, Electron and Tailwind, and a zero-dependency build and contrast check.
