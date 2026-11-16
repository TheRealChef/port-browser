# Getting started

Port UI works in any web stack (plain HTML, React, Vue, Svelte or Electron) because it is CSS plus a small, dependency-free behaviour script. React projects can also use the controlled components in `@port/ui/react`.

## 1. Add the package

Port UI is private, so install it from the repository or a local folder:

```bash
npm i git+ssh://git@github.com/<org>/port-ui.git     # or
npm i ../port-ui                                      # local path / monorepo workspace
```

`npm install` runs `prepare`, which builds `dist/`. A prebuilt `dist/` is also committed, so copying the folder works too.

## 2. Load the styles

```js
import "@port/ui/fonts.css"; // IBM Plex Sans + Mono. Self-host for offline desktop apps (see below).
import "@port/ui/port.css";  // tokens + every preset + all components
```

Or pick the pieces you need: `tokens.css`, `themes/<preset>.css` and `components.css`.

## 3. Create a `.port` root

Every token and component is scoped to `.port`, so Port never touches the host app's global styles:

```html
<div class="port" id="app"> … </div>
```

## 4. Start it

**Vanilla / any framework:**

```js
import Port from "@port/ui";
Port.init(document.getElementById("app"), { theme: "system" }); // follows the OS live
```

`init` sets `data-theme`, `data-platform` and density, renders shortcut labels and wires all behaviour (menus, selects, sliders, tables, trees, overlays and keyboard navigation) through delegated listeners. Markup added later works without calling it again.

**React:**

```tsx
import { PortRoot, Button, Select } from "@port/ui/react";
<PortRoot theme="system"><Button variant="primary" icon="play">Resume</Button></PortRoot>
```

The React components are controlled, so state lives in React and you don't call `Port.init`. Write `@port/ui/react` in TypeScript or Vite projects. The bindings ship as `.tsx` source, so your bundler compiles them.

**Script tag (no bundler):**

```html
<link rel="stylesheet" href="dist/port.css">
<script src="dist/port.umd.js"></script>
<script>Port.init(document.querySelector(".port"));</script>
```

## Self-hosting fonts (recommended for desktop)

```bash
npm i @fontsource/ibm-plex-sans @fontsource/ibm-plex-mono
```

```js
import "@fontsource/ibm-plex-sans/400.css"; import "@fontsource/ibm-plex-sans/500.css"; import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css"; import "@fontsource/ibm-plex-mono/500.css";
```

Then skip `fonts.css`.

## Next

- [Components](components.md): markup and React names for every component
- [Theming](theming.md): light/dark, presets, building your own preset
- [Platform](platform.md): Electron windows, shortcuts, RTL, long labels
- [Tokens](tokens.md): every value
