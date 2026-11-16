# Accessibility

- **Contrast:** 4.5:1 for all text and 3:1 for marks, borders and the focus ring, in light and dark for every preset. The `contrast` preset meets 7:1 / 4.5:1. `npm run check` enforces this (700 checks).
- **Focus:** a 2px `--focus` ring with a 2px offset and an inner surface stroke (visible on any hue). `--focus` is used for nothing else.
- **State never relies on colour alone.** Selected is a wash plus a rail or lift. Active is a border plus 600 weight. Focused is the ring. Running is a moving conveyor plus a timer. Status glyphs change shape (filled check, triangle, "!", dashed ring, hatch for blocked).
- **Keyboard:**

  | Where | Keys |
  |---|---|
  | Lists, trees, tables | ↑/↓ move; Enter/Space select (Shift or ⌘ to add, in multi-select scopes) |
  | Groups | ←/→ collapse and expand |
  | Select | ↓/Enter opens; ↑/↓ moves; Enter picks; Esc closes |
  | Menus | ↑/↓, Enter, Esc |
  | Sliders | arrow keys, Home/End |
  | Dialogs, sheets, palette | focus moves in, Tab is trapped, Esc closes, focus returns to the trigger |

- **Roles:** checkbox, radio(group), switch, slider, combobox/listbox/option, menu/menuitem, tree/treeitem, tablist/tab, dialog/alertdialog, progressbar and status are set in the markup and the React components.
- **Motion:** every animation has a reduced-motion version; see [motion](motion.md).
