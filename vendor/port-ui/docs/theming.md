# Theming

## Light and dark have equal priority

Every colour token has a light and a dark value, each tuned on its own (warm stone light, cool slate dark). Nothing is inverted, and `npm run check` tests contrast in both modes for every preset.

| Set on the `.port` root | Effect |
|---|---|
| `Port.init(root, { theme: "system" })` | Follows the OS and updates live (default). |
| `data-theme="light"` / `"dark"` | Forces a mode. |
| no `data-theme`, no JS | The CSS still follows `prefers-color-scheme`. |

## Presets

Curated palettes, each designed for both modes:

| Preset | Set |
|---|---|
| Stone & Slate (default) | nothing |
| Dusk | `data-palette="dusk"` |
| Signal | `data-palette="signal"` |
| Pigment | `data-palette="pigment"` |
| High contrast (WCAG AAA) | `data-palette="contrast"`. Also applied automatically under `prefers-contrast: more`. |

```js
Port.configure(root, { palette: "dusk" });   // or root.dataset.palette = "dusk"
root.removeAttribute("data-palette");        // back to Stone & Slate
```

Show presets in your settings with the `.preset` card (see the Settings screen in the design system) or `presets` from `@port/ui/tokens`.

## Colour rules

- `ink` carries text on every surface. `ink-2` is for labels and `ink-3` for metadata, never on tints.
- Each hue has a mark (`--clay`), a wash (`--clay-tint`) and an ink (`--clay-ink`). Put `h-<hue>` on any element to make it the local hue: components then use `--hue`, `--hue-t`, `--hue-i` and the derived `--wash`.
- App identity: Hub → `brand`, Browser → `cobalt`, Git → `clay`, Terminal → `graphite`. The identity hue owns the chrome and primary button only.
- `brand` is Port. `mineral` means success only (passed, added, done). `violet` means an agent is involved, and nothing else uses it. `amber` is warning, `coral` is error or destructive, and `focus` is reserved for the keyboard ring.
- Budget per screen: about 60% neutrals, ≤20% identity wash, ≤12% workspace groups, plus small signal accents.

## Adding a preset

1. Add an entry to `src/tokens/presets.json` with `id`, `name`, `description` and `light`/`dark` overrides. List only the tokens you change.
2. `npm run build`, which emits `dist/themes/<id>.css` and adds it to `port.css`.
3. `npm run check`. Every text pair must pass 4.5:1 (7:1 for `contrast`) in both modes, or the check fails.
