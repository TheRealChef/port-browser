# Components

Every control is drawn by Port; none uses a browser default. Text fields are real `<input>`s, restyled, so typing, IME, autofill and spellcheck keep working.

Each entry shows the HTML (vanilla, wired by `Port.init`) and the React component. `h-<hue>` on any element sets its local colour: `brand`, `mineral`, `clay`, `cobalt`, `violet`, `teal`, `amber`, `coral`, `lichen`, `heather` or `graphite`.

Icons in HTML come from `Port.icon("name", "sm")`, the SVG files in `dist/icons/` or the sprite (`<svg class="ic"><use href="dist/icons/sprite.svg#port-branch"/></svg>`). The snippets below write `{icon:name}` for brevity.

---

## Buttons

```html
<button class="btn primary h-brand">{icon:play}Resume</button>   <!-- one primary per view, in the app's hue -->
<button class="btn">Fetch</button>
<button class="btn tonal h-brand">Arrange</button>
<button class="btn quiet">Cancel</button>
<button class="btn danger">{icon:x}Discard</button>
<button class="btn tonal h-violet">{icon:spark}Ask agent</button> <!-- violet only for agents -->
<button class="btn link h-cobalt">Open docs</button>
<button class="btn icon quiet" aria-label="More">{icon:more}</button>
<button class="btn sm">Small</button> <button class="btn lg">Large</button>
<button class="btn primary" data-fx="save">Save</button>          <!-- loading → done feedback -->
<div class="bgroup"><button class="btn">Fetch</button><button class="btn">Pull</button><button class="btn">Push</button></div>
<div class="toolbar" role="toolbar" aria-label="View">…<span class="vsep"></span>…</div>
```

React: `Button` (`variant`, `size`, `hue`, `icon`, `loading`, `done`), `IconButton` (`label`, `tooltip`, `shortcut`), `ButtonGroup`, `Toolbar`, `ToolbarSeparator`.

States are `:hover`, `:active` (pressed), `:focus-visible`, `[disabled]` (dashed border), `.is-loading` and `.is-done`.

## Text fields

```html
<label class="tf">
  <span class="tf-l">Branch name <span class="opt">optional</span></span>
  <span class="box">{icon:branch}<span class="affix">refs/</span><input class="inp" value="feat/sync"><span class="kbd" data-keys="mod+b"></span></span>
  <span class="tf-h">Shown in history.</span>
</label>
<!-- states on .tf: is-error, is-ok, is-disabled. Text area: <span class="box ta"><textarea class="inp"></textarea></span> -->
<!-- Number stepper: add <span class="stepper"><button data-step="1">…</button><button data-step="-1">…</button></span> inside .box -->
<!-- Token field: <span class="box tokens" data-tokens="heather"><span class="tag h-heather">Mara<button aria-label="Remove Mara">{icon:x}</button></span><input class="inp"></span> -->
```

React: `TextField` (`label`, `help`, `error`, `success`, `optional`, `icon`, `prefix`, `suffix`, `shortcut`, `multiline`), `TokenField`.

Errors say what's wrong and how to fix it: "Branch names can't contain spaces. Try feat/sync-engine."

## Checkbox, radio, switch

```html
<span class="ck" role="checkbox" tabindex="0" aria-checked="true"><span class="bx">{icon:check}</span><span>Sign commit<span class="sub">Uses your SSH key</span></span></span>
<div data-ckgroup>  <!-- select-all with indeterminate -->
  <span class="ck" data-all role="checkbox" tabindex="0" aria-checked="mixed"><span class="bx">{icon:minus}</span><span>All</span></span> …children .ck…
</div>
<div role="radiogroup" aria-label="Merge method"><span class="ck radio" role="radio" tabindex="0" aria-checked="true"><span class="bx"></span><span>Squash</span></span> …</div>
<span class="toggle h-brand on" role="switch" aria-checked="true" aria-label="Sync on battery" tabindex="0"></span>
```

React: `Checkbox` (`checked: boolean | "mixed"`), `RadioGroup`, `Switch`.

## Slider

```html
<div class="slider h-brand" role="slider" tabindex="0" aria-label="Interface size" aria-valuemin="11" aria-valuemax="16" aria-valuenow="13" data-step="1" data-out="px">
  <span class="tr"></span><span class="fill"></span><span class="th"></span>
</div>
<!-- optional live readout anywhere in the same parent: <span data-slider-out></span> -->
```

React: `Slider` (`min`, `max`, `step`, `ticks`, `format`).

## Segmented control

```html
<div class="seg" data-seg role="radiogroup" aria-label="View">
  <button data-v="files" aria-pressed="true">Files</button><button data-v="tree" aria-pressed="false">Tree</button>
</div>
<!-- listens: root.addEventListener("port-seg", e => e.detail.value) -->
```

React: `Segmented`.

## Swatches and theme presets

```html
<div class="swatches" role="radiogroup" aria-label="Workspace colour"><span class="sw h-clay" role="radio" tabindex="0" aria-checked="true" aria-label="clay">{icon:check}</span> …</div>
```

React: `Swatches`. For preset cards, see the `.preset` markup in the design system's Settings screen.

## Select

```html
<div class="dd">
  <div class="box sel" role="combobox" tabindex="0" aria-haspopup="listbox" aria-expanded="false"><span class="val">main</span>{icon:chevD sm chev2}</div>
  <div class="menu" role="listbox" hidden>
    <div class="mi" role="option" aria-selected="true"><span class="grow">main</span>{icon:check sm chkm}</div>
    <div class="mi" role="option" aria-selected="false"><span class="grow">develop</span>{icon:check sm chkm}</div>
  </div>
</div>
```

React: `Select` (`options: {value,label,lead?}`).

## Menus and context menus

```html
<div class="menu" role="menu">
  <div class="mlab">Tab</div>
  <div class="mi" role="menuitem">{icon:globe sm}<span class="grow">Open in split</span><span class="sc"><span class="kbd" data-keys="mod+enter"></span></span></div>
  <div class="mi" role="menuitem">{icon:layers sm}<span class="grow">Move to group</span>{icon:chevR sm}<div class="menu submenu">…</div></div>
  <div class="msep"></div>
  <div class="mi danger" role="menuitem">{icon:x sm}<span class="grow">Close tab</span></div>
</div>
<!-- Context menu: data-ctx="#template-id" on any area; right-click opens the template's menu at the pointer -->
```

React: `Menu` (`items` with `section`, `"separator"`, `children` for submenus), `ContextMenu`.

## Date picker

The `.cal` markup lives in the design system's Menus card. Selected days use `aria-selected`, ranges use `.inrange` and today uses `.today`.

## Overlays

```html
<span class="tipwrap"><button class="btn icon">…</button><span class="tip" role="tooltip">Reload <span class="kbd" data-keys="mod+r"></span></span></span>
<button class="btn" data-pop>Share</button><div class="pop" hidden>…</div>                <!-- popover -->
<button class="btn" data-overlay="#discard">Discard…</button>                             <!-- opens <template id="discard"> -->
<template id="discard"><div class="dlg h-coral" role="alertdialog">…<button data-close>Cancel</button></div></template>
```

JS: `Port.open(targetInsideWindow, "#template" | html | element)` returns the scrim, and `Port.close(scrim)` closes it. Use `.dlg` for dialogs, `.sheet` for side sheets and `.cmdk` for the command palette (an input with `data-cmdk-in` filters `.mi` items live).

React: `Tooltip`, `Popover`, `Dialog` (`tone`, `icon`, `actions`, `footerNote`), `Sheet`, `CommandPalette`.

Overlays render inside the nearest `.win` (or `.port`), so they stay inside the app window.

## Feedback

```html
<div class="banner h-amber">{icon:alert}<div><b>Token expires in 3 days.</b></div><div class="acts"><button class="btn sm">Renew</button></div></div>
<div class="toast h-mineral"><span class="icbox">{icon:check sm}</span><span class="grow">Pushed 3 commits</span></div>  <!-- or Port.toast(el, {text}) -->
<div class="bar h-brand" role="progressbar" aria-valuenow="68"><i style="width:68%"></i></div>   <!-- .bar.indet for indeterminate -->
<span class="ring h-brand" style="--p:68" data-l="68%"></span>
<span class="spinner h-brand"></span>  <span class="weave"><i></i><i></i><i></i></span>  <span class="pulse h-mineral"></span>
<span class="sglyph s-run h-cobalt" style="--p:50"></span>   <!-- s-todo s-run s-review s-done s-warn s-error s-blocked -->
<span class="skel" style="width:60%"></span>
<div class="empty h-clay"><h4>No repository in this workspace</h4><p>Add a folder that contains .git, or clone one.</p>…</div>
```

React: `Banner`, `Toast`, `Progress`, `Ring`, `Spinner`, `AgentActivity`, `StatusGlyph`, `Skeleton`, `EmptyState`.

## Lists, trees and groups (the state grammar)

```html
<div class="pb" data-select-scope="multi" role="tree">          <!-- single | multi -->
  <div class="grp h-cobalt">
    <div class="grp-h" role="button" tabindex="0" aria-expanded="true" data-collapse>{icon:chevD sm chev}<span class="grow trunc">Sync research</span><span class="count">6</span></div>
    <div class="grp-b"><div class="grp-in" role="group">
      <div class="row is-selected is-active" tabindex="0" role="treeitem"><span class="fav h-cobalt">F</span><span class="lbl">Merge semantics</span><span class="meta">fieldnotes.dev</span></div>
      <div class="kids"><div class="row" tabindex="0"><i class="elb"></i><span class="lbl">Automerge docs</span></div></div>
    </div></div>
  </div>
</div>
```

| State | Class | Looks like |
|---|---|---|
| Selected | `is-selected` | lifted tile (in the selection set) |
| Active | `is-active` | wash + 600 weight (the thing on screen) |
| Focused | `:focus-visible` | 2px focus ring |
| Running | `is-running` | moving conveyor along the bottom |
| Disabled / blocked / error / drop / dragging | `is-disabled` / `is-blocked` / `is-error` / `is-drop` / `is-dragging` | dashed, hatched, coral, dashed outline, lifted |

React: `Row`, `Children` (nested rows with connectors), `Group`.

## Tables with smart grouping

```html
<table class="grid">
  <thead><tr><th class="chkc">…checkbox…</th><th data-sort>Key</th><th data-sort>Title</th></tr></thead>
  <tbody>
    <tr class="tgrp h-cobalt"><td colspan="3"><span class="row-flex">{icon:chevD sm chev}<span class="sglyph s-run h-cobalt" style="--p:50"></span>In progress<span class="count">2</span></span></td></tr>
    <tr tabindex="0"><td class="chkc">…</td><td class="mono faint">PORT-311</td><td>Tab restore</td><td><span class="ra">…row actions on hover…</span></td></tr>
  </tbody>
</table>
```

Click `th[data-sort]` to sort within groups, click `tr.tgrp` to collapse a group, and a header checkbox selects every row. In a parent with `data-select-scope="single"`, rows select on click.

React: `DataTable` (`columns`, `groupBy`, `groupOrder`, `groupLead`, `selectable`, `rowActions`).

## Navigation

```html
<div class="tabs h-clay" role="tablist"><span class="tab is-active" role="tab" tabindex="0">{icon:file sm}<span class="tl">merge.ts</span></span>…</div>
<nav class="crumbs" aria-label="Breadcrumb"><a>Port Core</a>{icon:chevR}<a aria-current="page">merge.ts</a></nav>
<div class="steps"><span class="stp done"><span class="n">{icon:check sm}</span>Folder</span><span class="stp-c done"></span><span class="stp cur"><span class="n">2</span>Apps</span></div>
<nav class="stripe">…<span class="st-i h-cobalt is-on">{icon:globe}</span>…</nav>   <!-- tool-window stripe -->
```

React: `Tabs`, `Breadcrumbs`, `Steps`.

## Layout

```html
<div class="win h-clay">                                  <!-- app window: titlebar, body, status bar -->
  <header class="tb">
    <span class="mac-lights" aria-hidden="true"><i></i><i></i><i></i></span>
    <div class="tb-key">{icon:branch}<span class="app-name">Port Git</span></div>
    … <div class="wctl">…min / max / close…</div>     <!-- Port.windowControls() -->
  </header>
  <div class="wb"><section class="panel"><header class="ph"><span class="ttl">Branches</span></header><div class="pb">…</div></section></div>
  <footer class="sb">…</footer>
</div>
<section class="setsec"><header><h3>Theme</h3><p>One-line description.</p></header><div class="setcard"><div class="setrow"><div><div class="sl">Mode</div><div class="sd">…</div></div><div class="sc2">…control…</div></div></div></section>
<div class="band h-mineral">{icon:check sm}Ready to merge<span class="grow"></span><span class="count">4</span></div>
<article class="tile h-heather">…</article>
<div class="splitter"></div>  <dl class="kv"><dt>Branch</dt><dd>main</dd></dl>
```

React: `Window`, `Panel`, `SettingsSection`, `SettingsRow`.

## Data display

`.pill` (`solid`, `line`), `.count`, `.kbd` with `data-keys`, `.tag`, `.avatar` (`presence`, `sq`, `lg`), `.avg` avatar group, `.fav` letter favicon, `.fst.fs-M|A|D|U` file status, `.fchip` file chip, `.drop` drop zone, `.note` notification row, `.divider`, `.scrollarea`. Scrollbars inside `.port` are Port's own.

React: `Pill`, `Tag`, `Count`, `Kbd`, `Avatar`, `AvatarGroup`, `KeyValue`, `DropZone`, `Icon`.

## Code and terminal

Use `.term` with spans `.p` (prompt), `.c`, `.ok`, `.bad`, `.w`, `.dim` and `.ai`, plus `.cursor`. The diff view is `.diff` with `.ln` (`.add` or `.del`), `<mark>` for word-level changes and `.hunk` headers.
