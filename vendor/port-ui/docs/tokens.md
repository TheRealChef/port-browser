# Tokens

Generated from `src/tokens/tokens.json`. Every token is a CSS custom property on the `.port` root (`var(--name)`), and is also available as JSON, W3C DTCG JSON, an ES module and a Tailwind preset.

## Colour

Each colour has a light and a dark value. They are designed separately, never inverted.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--ground` | `#e6e2d9` | `#0c0f10` | App frame and desktop ground behind windows; Spatial's dot grid sits on it. |
| `--surface-0` | `#f1eee7` | `#131719` | Window body; the ground panels sit on. |
| `--surface-1` | `#faf8f4` | `#1a1f21` | Default panel surface: sidebars, lists, tables. |
| `--surface-2` | `#ffffff` | `#222829` | Raised: popovers, the active tab, Atelier's lifted tiles. |
| `--surface-sunk` | `#e9e5dc` | `#0f1213` | Inset wells: address bar, terminal gutters, code blocks. |
| `--line` | `#d8d2c6` | `#2c3436` | Hairline dividers and panel borders. |
| `--line-strong` | `#8f877a` | `#6f7d80` | Control borders and connectors that must read at 3:1. |
| `--ink` | `#1a1d1b` | `#eef0eb` | Primary text on every surface. |
| `--ink-2` | `#4a504b` | `#b4bcb6` | Secondary text and labels on surface-0/1/2. |
| `--ink-3` | `#646a65` | `#8f9893` | Metadata and timestamps on surface-0/1/2; never on tints. |
| `--focus` | `#1f4fd6` | `#93b4ff` | Keyboard focus ring: 2px solid, 2px offset. Reserved for focus only. |
| `--on-fill` | `#ffffff` | `#0d1110` | Text and icons on solid hue fills (buttons, vivid bands). |
| `--brand` | `#24493d` | `#cbe7da` | Port's brand: Hub identity, the launch CTA, the active workspace, the cover. A deep bottle-mineral, deliberately darker (light) and paler (dark) than success green so brand never reads as "passed". Fills take on-fill text. |
| `--brand-tint` | `#dde8e3` | `#1c2b26` | Brand wash behind the Hub hero, the current workspace and brand-selected rows. |
| `--brand-ink` | `#1d3b31` | `#d9efe5` | Brand text on brand-tint and surface-1. |
| `--mineral` | `#2c7656` | `#62c196` | Success only: passed, done, added lines, connected. No longer the brand. Solid marks, rails, icons, fills with on-fill text. |
| `--mineral-tint` | `#dbeae1` | `#183026` | Tinted ground for mineral groups, selected rows and badges. |
| `--mineral-ink` | `#1b5039` | `#a3dfc2` | Text on mineral-tint and on surface-1. |
| `--clay` | `#a94f31` | `#e38d6d` | Warmth and grouping; Port Git identity; staged changes. Solid marks, rails, icons, fills with on-fill text. |
| `--clay-tint` | `#f3e0d6` | `#36221a` | Tinted ground for clay groups, selected rows and badges. |
| `--clay-ink` | `#7e3820` | `#f3bba5` | Text on clay-tint and on surface-1. |
| `--cobalt` | `#2d5bcc` | `#7ea4ff` | Information and navigation; Port Browser identity; links. Solid marks, rails, icons, fills with on-fill text. |
| `--cobalt-tint` | `#dfe6f9` | `#1a2440` | Tinted ground for cobalt groups, selected rows and badges. |
| `--cobalt-ink` | `#1d409c` | `#b9cdff` | Text on cobalt-tint and on surface-1. |
| `--violet` | `#6c45c4` | `#b39aff` | AI, agents and automation only. Solid marks, rails, icons, fills with on-fill text. |
| `--violet-tint` | `#e9e2f9` | `#271f40` | Tinted ground for violet groups, selected rows and badges. |
| `--violet-ink` | `#51309c` | `#d5c7ff` | Text on violet-tint and on surface-1. |
| `--teal` | `#167a7a` | `#52c9c2` | Integrations, data, sync. Solid marks, rails, icons, fills with on-fill text. |
| `--teal-tint` | `#d4ecea` | `#132e2d` | Tinted ground for teal groups, selected rows and badges. |
| `--teal-ink` | `#0f5856` | `#98e4de` | Text on teal-tint and on surface-1. |
| `--amber` | `#8f5c0e` | `#f0b44c` | Warnings, pending, paused. Solid marks, rails, icons, fills with on-fill text. |
| `--amber-tint` | `#f7e8cb` | `#372912` | Tinted ground for amber groups, selected rows and badges. |
| `--amber-ink` | `#6b4408` | `#f7d394` | Text on amber-tint and on surface-1. |
| `--coral` | `#c33a31` | `#ff8073` | Errors, deletions, destructive actions. Solid marks, rails, icons, fills with on-fill text. |
| `--coral-tint` | `#fadedb` | `#3c1c1a` | Tinted ground for coral groups, selected rows and badges. |
| `--coral-ink` | `#9a271f` | `#ffb6ad` | Text on coral-tint and on surface-1. |
| `--lichen` | `#5f6e17` | `#bfce62` | Added hue: personal and reading workspaces. Solid marks, rails, icons, fills with on-fill text. |
| `--lichen-tint` | `#e7ebcd` | `#282d13` | Tinted ground for lichen groups, selected rows and badges. |
| `--lichen-ink` | `#46520e` | `#dce69e` | Text on lichen-tint and on surface-1. |
| `--heather` | `#9d3f71` | `#ea8dbb` | Added hue: design and review workspaces. Solid marks, rails, icons, fills with on-fill text. |
| `--heather-tint` | `#f4dfe9` | `#391c2b` | Tinted ground for heather groups, selected rows and badges. |
| `--heather-ink` | `#772a53` | `#f6c2db` | Text on heather-tint and on surface-1. |
| `--graphite` | `#2b3134` | `#c9d1cf` | Added hue: Port Terminal identity; dark chrome bands. Solid marks, rails, icons, fills with on-fill text. |
| `--graphite-tint` | `#e1e3e2` | `#23292b` | Tinted ground for graphite groups, selected rows and badges. |
| `--graphite-ink` | `#1f2427` | `#e4e9e7` | Text on graphite-tint and on surface-1. |

## Spacing

| Token | Value | Use |
|---|---|---|
| `--space-1` | `2px` | Icon-to-badge nudge. |
| `--space-2` | `4px` | Inside chips; tree indent ticks. |
| `--space-3` | `6px` | Row vertical padding (compact). |
| `--space-4` | `8px` | Control padding; gap in clusters. |
| `--space-5` | `12px` | Panel inner padding (compact). |
| `--space-6` | `16px` | Panel inner padding (cozy); card gap. |
| `--space-7` | `24px` | Region gap; editorial blocks. |
| `--space-8` | `40px` | Hub section rhythm. |

## Radius

| Token | Value | Use |
|---|---|---|
| `--radius-hair` | `2px` | Spatial controls, kbd keys. |
| `--radius-ctl` | `9px` | Buttons, inputs, rows, tabs (Keystone). Drawn as a sharp squircle (corner-shape: squircle) where supported. |
| `--radius-panel` | `14px` | Panels and tiles; = radius-window minus the 6px island gap. Sharp squircle. |
| `--radius-tab` | `13px` | Top corners of the app tab and active tabs; bottom corners stay square where they meet the edge. |
| `--radius-window` | `20px` | Windows; outermost container. Sharp squircle. |
| `--radius-pill` | `999px` | Status pills and counters only. |

## Motion

| Token | Value | Use |
|---|---|---|
| `--motion-d1` | `90ms` | Press, hover. |
| `--motion-d2` | `160ms` | Colour, fades. |
| `--motion-d3` | `240ms` | Selection, chevrons. |
| `--motion-d4` | `380ms` | Panels, docking. |
| `--motion-e-out` | `cubic-bezier(.2,.8,.2,1)` | Default ease-out. |
| `--motion-e-spring` | `cubic-bezier(.32,1.36,.52,1)` | Settles with at most ~8% overshoot. |
| `--motion-e-io` | `cubic-bezier(.6,0,.3,1)` | Ease-in-out for loops. |

## Shadow

| Token | Light | Dark | Use |
|---|---|---|---|
| `--shadow-tile` | `0 1px 0 rgba(255,255,255,0.8) inset, 0 1px 2px rgba(40,32,20,0.10), 0 4px 12px rgba(40,32,20,0.06)` | `0 1px 0 rgba(255,255,255,0.05) inset, 0 1px 2px rgba(0,0,0,0.5), 0 6px 16px rgba(0,0,0,0.35)` | Atelier lifted tiles, selected tabs. |
| `--shadow-float` | `0 10px 30px rgba(40,32,20,0.16), 0 2px 6px rgba(40,32,20,0.08)` | `0 14px 40px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.4)` | Floating panels, popovers, drag ghosts. |
| `--shadow-well` | `inset 0 1px 2px rgba(40,32,20,0.12)` | `inset 0 1px 3px rgba(0,0,0,0.5)` | Sunk wells: address bar, inputs. |

## Type

Families: `--font-sans`: "IBM Plex Sans", system-ui, sans-serif, `--font-display`: "IBM Plex Sans", system-ui, sans-serif, `--font-mono`: "IBM Plex Mono", ui-monospace, monospace

Every style is available as a `.t-<name>` class inside `.port`.

| Class | Size / line | Weight | Family | Use |
|---|---|---|---|---|
| `.t-display-xl` | 44px / 48px | 600 | display | Hub overview titles; one per screen. |
| `.t-display-md` | 28px / 34px | 600 | display | Editorial region headings. |
| `.t-title` | 15px / 20px | 600 | sans | Panel titles and dialog headings. |
| `.t-body` | 13px / 18px | 400 | sans | Default UI text, rows, menus. |
| `.t-label` | 12px / 16px | 500 | sans | Control labels, group headers. |
| `.t-eyebrow` | 10.5px / 14px | 600 | sans | Uppercase section eyebrows and Spatial panel legends. |
| `.t-code` | 12.5px / 19px | 400 | mono | Terminal, diffs, commands. |
| `.t-meta` | 11px / 15px | 400 | mono | Hashes, hosts, timestamps, counters. |
| `.t-numeric` | 22px / 26px | 500 | mono | Stat clusters; tabular figures. |

## Presets

| Preset | `data-palette` | Description |
|---|---|---|
| Stone & Slate | *(none)* | Default. Warm stone light, cool slate dark. |
| Dusk | `dusk` | Peach-paper light, plum-indigo dark. Tinted neutrals. |
| Signal | `signal` | Cooler greys with a magenta brand. |
| Pigment | `pigment` | Bright paper or true ink-black, bold workspace pigments. |
| High contrast | `contrast` | WCAG AAA: 7:1 text, 4.5:1 marks. Also applied automatically under prefers-contrast: more. |
