# Principles

How Port looks and why. This is the brand book from the design system, kept with the code.

## Principles

1. **Structure you can see.** Relationships are drawn as rails, connectors, bands and keystone tabs, so the eye doesn't have to infer them from spacing alone.
2. **Colour with a job.** Colour marks a place (workspace), an app (identity) or a signal (state). Neutrals carry everything else, and no screen gives every element a hue.
3. **Four states, four channels.** Selected uses fill, active uses border and weight, focused uses a ring, running uses motion. They stack without conflict.
4. **Symmetry by default, asymmetry with intent.** Windows balance on their centre axis. Breaking symmetry (for an inspector or a diff) is a deliberate signal.
5. **Dense, calm, keyboard-first.** Rows are 26px compact and 32px cozy. Every list is arrow-navigable and ⌘K reaches everything.

## Colour

- Use `ink` for text on every surface. Use `ink-2` for labels and `ink-3` for metadata on `surface-0/1/2`, never on tints.
- Every hue has three roles. `<hue>` is the solid mark (fills, rails, icons) with `on-fill` text. `<hue>-tint` is the wash for groups, selected rows and badges. `<hue>-ink` is text on that wash and on `surface-1`.
- App identity: Hub → `brand`, Browser → `cobalt`, Git → `clay`, Terminal → `graphite`. The identity hue owns the chrome (keystone, stripe, primary button) and nothing else.
- Workspace hues (`brand`, `clay`, `cobalt`, `lichen`, `heather`, `teal`) appear on groups, rails and launcher tiles. They never colour body text.
- `violet` means an AI agent is involved, every time, and nothing else uses it. `amber` is warning/pending, `coral` is error/destructive, `mineral` is success/added.
- `focus` is reserved for the keyboard ring. It appears nowhere else.
- Budget per screen: about 60% neutrals, ≤20% identity wash, ≤12% workspace groups, with small signal accents.
- **Light and dark have equal priority.** Light is warm stone (`surface-*` around `#faf8f4`) and dark is cool slate (around `#1a1f21`). Each is tuned separately, never inverted. Every token has both values, every contrast check runs in both, and the Playground opens on Light + dark side by side. Nothing ships if it has only been reviewed in one theme.

### Palette explorations (the challenge)

The brief's palette is the default (**Brief**). Three alternatives, switchable everywhere via the Palette axis, push back on it:

- **Signal Magenta.** Mineral green as the brand collides with success and added lines in Git and Terminal. Moving `brand` to magenta separates "this is Port" from "this passed".
- **Pigment.** Workspace hues become saturated pigments (ultramarine brand, vermilion, cadmium, madder) on bright paper or true ink-black. Most recognisable; it needs restraint in dense views.
- **Dusk.** Tinted neutrals: peach-paper light and plum-indigo dark. Every surface feels like Port, not a grey IDE.

`brand`, `brand-tint` and `brand-ink` alias `mineral` in Brief. Build against `brand`, never against `mineral`, wherever you mean Port's identity.

## Geometry

- Every corner is a **sharp squircle**: a tight radius drawn with continuous curvature (`corner-shape: squircle`), so corners read crisp but never mechanical. No cut corners or angled tabs anywhere.
- Radii are concentric: inner radius = outer radius − padding. Atelier uses 18 → 12 → 8 (window → panel → control), with squircle corners on controls where supported. Tabs use `radius-tab` on their top corners only, so they merge into the edge they sit on.
- Pills (`radius-pill`) are only for status and counters. Spinners, dots, rings and toggles stay perfectly round.
- Panels float as islands with `space-3`–`space-4` gaps on `surface-sunk` (B, C, D) or sit flush with hairlines (A).

## Organisation patterns

Use **bento** for overviews (one idea per cell; size = importance; one tinted headline cell). Use **connected trees** for anything hierarchical (in Keystone, the connector takes the group's hue). Use **section bands** to split a list by state (each with an icon and count). Use **compact clusters** for 4–6 facts. Use **dense tables** with ring status glyphs for issues, commits and processes. Use **inspectors** with collapsible, hue-sourced groups. Use the **stripe → workspace → tabs → in-page** ladder for navigation, and **docking** with splitters that grow on hover and snap at 25/33/50%.

## State grammar

| State | Channel | Treatment |
|---|---|---|
| Hover | fill | 5.5% ink overlay |
| Pressed | transform | 1px drop + 0.985 scale, 90ms |
| **Selected** | **fill** | hue wash + 3px hue rail (B: lifted tile, C: corner brackets) |
| **Active** | **border + weight** | `surface-2`, 1px `line-strong`, 600 weight |
| **Focused** | **ring** | 2px `focus`, 2px offset, inner `surface-1` stroke (Fluent-style) |
| **Running** | **motion** | moving 2px conveyor + live mono timer |
| Disabled | stroke | dashed border, `ink-3` |
| Loading | shape | spinner replaces label; skeleton shimmer for rows |
| Completed / Warning / Error | glyph | filled check / triangle / filled "!" (never colour alone) |
| Blocked | texture | diagonal hatch + lock |
| Dragging / Drop target | depth / outline | `shadow-float` + −1.2° tilt / dashed hue outline + wash |
| Expanded / collapsed | rotation | chevron rotates on the spring curve |

## Sections and grouping

Settings, sidebars, menus and tables all group the same way. A small uppercase label names each group, related items sit together, and a group's count sits beside its name. Settings pages put a title and one-line description on the left of each section and the controls in a card on the right.

## Iconography

Port's own 16px stroke set: round caps and joins, 1.5 stroke by default, with the stroke matching the adjacent text weight (1.25 / 1.5 / 1.75 / 2). Spatial switches to square caps. Icons sit bare, in a tinted `icbox` (A, B), an outline box (C) or a squircle box (D). Status uses ring glyphs that fill with progress and change shape for done, error, warning and blocked.

## Decisions

Approved and locked:

- **Direction:** B · Material Atelier, kept pure.
- **Palette:** Brief, at balanced colour intensity.
- **Layout and density:** symmetric layout, compact density.
- **Type:** IBM Plex Sans + IBM Plex Mono.
- **Brand colour:** separated from success. `brand` is a deep bottle-mineral, and `mineral` now means success only.
- **Themes:** light and dark have equal priority.
- **User themes:** curated presets (Stone & Slate, Dusk, Signal, Pigment), each designed for both modes. They are chosen in Settings → Appearance.

The other directions, palettes and type pairings stay in the Playground for reference.
