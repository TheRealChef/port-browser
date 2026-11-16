# Platform

## Electron windows

Port windows are frameless on every OS. See `examples/electron/` for a working main, preload and renderer.

| OS | Window buttons | Port's job |
|---|---|---|
| macOS | Native traffic lights (`titleBarStyle: "hiddenInset"`, `trafficLightPosition: {x:14,y:14}`) | Leaves 84px at the titlebar's start (`data-platform="mac"`) |
| Windows | Port draws `.wctl`: 46px wide, full height, close turns coral | Wire the buttons to `win.minimize()` / `maximize()` / `close()` over IPC |
| Linux | Port draws round `.wctl` buttons on the right | Same as Windows |

`.tb` is a drag region (`app-region: drag`). Buttons, inputs, tabs and anything with `tabindex` inside it opt out automatically. Set the window's `backgroundColor` to `surface-0` (`#f1eee7` light, `#131719` dark) to avoid a white flash.

`Port.detectPlatform()` reads the user agent. In Electron, pass the real one: `Port.init(root, { platform: window.portWindow.platform })`.

## Shortcuts

Write each shortcut once as `data-keys="mod+shift+k"`, or use `<Kbd keys="mod+shift+k" />` in React. It renders ⌘⇧K on macOS and Ctrl+Shift+K elsewhere. Supported names are `mod`, `shift`, `alt`, `ctrl`, `enter`, `backspace`, `esc` and any key.

## Right-to-left

Put `dir="rtl"` on the root or any ancestor. Selection rails, tree connectors, chevrons, back/forward arrows, submenus and banner actions all mirror. Mono content (code, hashes, paths) stays left-to-right; wrap it in `dir="ltr"` if it sits in RTL prose.

## Long labels

Rows, tabs, menu items and table cells ellipsise, and Port adds the full text as a tooltip on hover. Buttons never wrap mid-word. Test with German, which runs about 35% longer than English.

## High contrast and OS settings

- `prefers-contrast: more` → the AAA `contrast` palette.
- Windows forced colours → borders and selection hand over to system colours (`CanvasText`, `Highlight`).
- `prefers-reduced-motion` → loops stop, transforms become fades, state stays readable. You can also force it with `data-motion="reduced"`.
- `prefers-reduced-transparency` → scrims become solid.

## Squircles

Continuous squircle corners need `corner-shape`, which ships in Chromium 139+ (Electron 38+). Other engines fall back to plain rounding at the same radii, which still looks right.
