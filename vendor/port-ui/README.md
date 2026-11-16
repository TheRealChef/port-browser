# @port/ui

The Port design system as a package: tokens, theme presets, Port-drawn components and their behaviour, for **Port Browser, Port Git, Port Terminal and Port Hub**, or any other project that wants to look and work like Port.

- **Framework-agnostic.** Port UI is CSS plus one dependency-free script (ESM and UMD). It works with plain HTML, React, Vue, Svelte and Electron.
- **Scoped.** Everything lives under a `.port` root, so it never touches a host app's global styles.
- **Every control is Port's own.** Selects, menus, checkboxes, sliders, date picker, tooltips, dialogs, command palette, tables and scrollbars are all drawn by Port.
- **Light and dark have equal priority.** There are five curated presets, including WCAG AAA high contrast, and 700 automated contrast checks.
- **Desktop-ready.** Port UI includes frameless window chrome per OS, platform shortcut labels, RTL, long-label handling, reduced motion and forced colours.
- **Optional React bindings.** Controlled components in `@port/ui/react`.

Design direction: **Material Atelier**. Soft, layered tiles on a sunk ground, concentric radii (18 → 12 → 8) with squircle corners, IBM Plex type, compact density and a symmetric layout.

## Quick start

```bash
npm i ../port-ui            # or git+ssh://…/port-ui.git
```

```js
import "@port/ui/fonts.css";
import "@port/ui/port.css";
import Port from "@port/ui";

Port.init(document.querySelector(".port"), { theme: "system" });
```

```html
<div class="port">
  <button class="btn primary h-brand">Resume workspace</button>
</div>
```

React:

```tsx
import "@port/ui/fonts.css";
import "@port/ui/port.css";
import { PortRoot, Button, Select, DataTable } from "@port/ui/react";

<PortRoot theme="system" palette="dusk">
  <Button variant="primary" icon="play">Resume workspace</Button>
</PortRoot>
```

No bundler: `<link rel="stylesheet" href="dist/port.css">` + `<script src="dist/port.umd.js"></script>` → `window.Port`.

## What's inside

```
port-ui/
├─ dist/                      built output (committed; regenerate with npm run build)
│  ├─ port.css                tokens + all presets + components (one file)
│  ├─ tokens.css              tokens only (light + dark, scoped to .port)
│  ├─ components.css          components only
│  ├─ themes/*.css            dusk, signal, pigment, contrast presets
│  ├─ fonts.css               IBM Plex from Google Fonts (self-host for desktop)
│  ├─ port.mjs / port.umd.js  behaviour: init, configure, open/close overlays, toast, icons, keys …
│  ├─ port.d.ts               types
│  ├─ tokens.json             source format (lists with usage notes)
│  ├─ tokens.dtcg.json        W3C Design Tokens format (Figma Tokens Studio, Style Dictionary)
│  ├─ tokens.mjs              tokens + presets as an ES module
│  ├─ tailwind-preset.cjs     Tailwind preset (bg-port-surface-1, rounded-port-ctl …)
│  └─ icons/                  56 SVGs + sprite.svg; icons.mjs path map
├─ react/index.tsx            controlled React components (TypeScript source)
├─ src/                       source of truth: tokens, presets, CSS by component, JS, icons
├─ scripts/build.mjs          zero-dependency build
├─ scripts/check.mjs          contrast checker (fails CI on any regression)
├─ docs/                      getting started, components, theming, tokens, platform, accessibility, motion, principles
└─ examples/                  html, react, electron, tailwind
```

## Docs

| | |
|---|---|
| [Getting started](docs/getting-started.md) | install, load, init, self-host fonts |
| [Components](docs/components.md) | HTML markup and React names for every component |
| [Theming](docs/theming.md) | light/dark, presets, colour rules, adding a preset |
| [Tokens](docs/tokens.md) | every value, generated from the source |
| [Platform](docs/platform.md) | Electron windows, shortcuts, RTL, long labels, OS settings |
| [Accessibility](docs/accessibility.md) | contrast, focus, keyboard map, roles |
| [Motion](docs/motion.md) | durations, curves, reduced motion |
| [Principles](docs/principles.md) | how Port looks and why |
| [Contributing](docs/contributing.md) | editing src, building, checking, releasing |

## Examples

- `examples/html/index.html`: open it directly in a browser. It's a Port Git screen with menus, a sortable grouped table, a dialog, ⌘K, a context menu, theme and preset switching.
- `examples/react/`: the same screen in React (`App.tsx`, `main.tsx`); drop it into any Vite + React app.
- `examples/electron/`: frameless window per OS and window controls over IPC.
- `examples/tailwind/`: the Tailwind preset.

## Scripts

```bash
npm run build   # src → dist
npm run check   # contrast across every preset × light/dark
```

## Versioning

Semantic versioning. Token renames and removals are breaking changes. New tokens, presets and components are minor changes. See [CHANGELOG.md](CHANGELOG.md).
