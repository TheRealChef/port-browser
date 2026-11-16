# Port

A workspace-oriented browser interface built around **Spaces → Groups → Tabs and Dashboards**.

Port runs two ways:

- **Desktop app (Windows).** A small .NET/WPF shell hosts the UI and gives every tab a real WebView2 (Chromium/Edge engine) view. Every site works, sign-ins persist, and background tabs keep running.
- **Web build.** The same UI in a normal browser tab for development, where pages are iframe previews (see the limitations below).

## Getting started

Requires Node.js 20.19+ (developed on Node 24).

```bash
npm install
npm run dev        # http://localhost:5173 (bound to localhost only)
```

| Script              | Purpose                                 |
| ------------------- | --------------------------------------- |
| `npm run dev`       | Vite dev server on `localhost:5173`     |
| `npm run build`     | Type-check and build to `dist/`         |
| `npm run typecheck` | TypeScript project check                |
| `npm run lint`      | ESLint (typescript-eslint, React hooks) |
| `npm test`          | Vitest unit tests                       |
| `npm run format`    | Prettier                                |

If port 5173 is taken, Vite picks the next free port and prints it.

## Desktop app

Requires the .NET 10 SDK and the WebView2 runtime (built into Windows 11).

| Script                | Purpose                                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `npm run app:install` | Build everything and install to `%LOCALAPPDATA%/Programs/Port` with Start menu and desktop shortcuts. Rerun to update. |
| `npm run app:build`   | Build a portable copy to `release/Port/` (run `Port.exe`).                                                             |
| `npm run app:dev`     | Run the shell against the Vite dev server (`npm run dev` must be running) for hot reload.                              |

Data lives in `%LOCALAPPDATA%/Port`: the workspace and each space's cookies and site data in `Profile`, which space uses which browser profile in `profiles.json`, the download list in `downloads.json`, and the window position in `window.json`. Reinstalling does not touch it. The desktop app has its own storage, so to bring over a workspace from the web build use **Settings → Export** there and **Import** in the app.

How it works (`native/Port.Desktop`):

- The UI is served from the bundled `dist/` at `https://port.example/` (a WebView2 virtual host; nothing is fetched from the network) and talks to the shell only through `chrome.webview.postMessage`. Messages are typed in `src/host/bridge.ts`, and the UI side is `src/host/NativeBrowserHost.ts`.
- Each tab gets a WebView2 view laid over the content area the UI reports. Views are created when a tab is first shown and kept alive until the tab closes. Removing tabs any other way (deleting a space or group) also releases their views.
- **Sign-ins per space.** Each space browses in its own persistent WebView2 profile (cookies, storage, cache), so you can be signed in to different accounts in Work and Personal, and sign-ins survive restarts. Popups share their opener's profile; a tab moved to another space reloads in that space's profile. **Settings → Sign-ins** signs a space out of every site. Pages opened before per-space profiles existed used the default profile; the first space that opens a page afterwards keeps those sign-ins. That default profile also holds Port's own saved workspace, so signing that space out clears everything except site local storage.
- **Sleeping tabs** (`native/Port.Desktop/TabSleeper.cs`). Every tab stays a live browser view, so memory grows with open tabs (about 150 MB per heavy site). Hidden tabs get a low memory target right away, are suspended after 5 minutes (no scripts or timers, instant wake, page and scroll kept) and unloaded after 30 minutes (the view is released; selecting the tab reloads it, and sign-ins stay because they live in cookies). Tabs playing audio and fullscreen pages are left alone, and pinned tabs are never unloaded. Sleeping tabs are dimmed in the sidebar. **Settings → Sleeping tabs** changes the times or turns it off. Measured with 12 heavy sites: 1.8 GB loaded, 1.2 GB with inactive tabs asleep, 0.7 GB with them unloaded.
- **Built-in player** (`native/Port.Desktop/MediaWatcher.cs`, `src/features/media`). When a tab plays audio or video (YouTube, Spotify, SoundCloud, podcasts and so on), a now-playing card appears at the bottom of the sidebar with the title, artist and artwork the site publishes through the Media Session API, a progress bar you can click to seek, and play/pause, previous/next and mute. The buttons call the site's own player controls, so they work from any tab. Previous and next are only enabled when the site offers them. With several sources, a counter switches between them. The × button hides a source until it plays again, and clicking the title jumps to its tab. Tabs that make sound show a speaker in the sidebar; click it to mute just that tab.
- **Downloads** go to your Downloads folder and appear in Port's panel (toolbar button or `Ctrl+J`) with progress, pause, resume, cancel, open and show in folder, instead of WebView2's own flyout. The list is kept across restarts.
- **History.** Every address a tab settles on for a moment is recorded locally (`src/stores/historyStore.ts`, `vela:history`): visited pages with title, space and time, without sign-in codes or tokens from addresses. Open it from the sidebar, the palette or `Ctrl+H` to search it, filter by space, and delete single visits, a whole site or a time range. History also feeds address-bar suggestions, and **Settings → History** turns recording off. It works in the web build too.
- Native views always draw above the UI, so while a menu, dialog, the palette, address suggestions, the downloads panel, a toast or a tooltip that reaches into the page is open, the page is swapped for a still snapshot. The live view is hidden only after the UI has painted the snapshot, so nothing flashes.
- Titles, favicons, URL changes, loading state and back/forward come from the engine. `target=_blank` links and popups open as tabs that keep `window.opener` (OAuth popups work). Page fullscreen fills the window.
- Port's shortcuts (`Ctrl+T/W/L/K/H/J`, `Ctrl+Shift+T`, `Ctrl+1…9`, `Ctrl+,`) still work while a page has focus. Everything else (`Ctrl+F`, `Ctrl+R`, `F12` DevTools, `Alt+←/→`) goes to the page.
- Pages have no access to the bridge. Only the UI origin's messages are accepted, the UI view can't navigate away from its origin, and `openExternal` only opens http(s) URLs.

## Features

- **Spaces**: Work and Personal by default. Create, rename, recolor, re-icon and delete spaces (with confirmation). Each space remembers its selected tab, dashboard or start page, and switching restores it.
- **Groups**: create, edit, collapse, reorder by drag, delete (tabs move to the ungrouped section, or are closed if you tick the option).
- **Tabs**: create, select, close, duplicate, pin/unpin, inline rename (F2 or the context menu), move between groups and spaces, reorder by drag, open in your real browser. Middle-click closes a tab. You can also drop a tab on a space icon to move it there.
- **Bookmark library** per space: folders nested to any depth, shown as a tile grid (small, medium or large cards) or a compact list, with a collapsible folder tree on the left and clickable breadcrumbs. Turn on _Show subfolder contents inline_ to see every subfolder's bookmarks as sections on one page. Search (`/` or `Ctrl+F`) covers titles, addresses and folder names below the open folder. Drag bookmarks to reorder them or drop them on a folder card, tree row or breadcrumb. Drag folders onto other folders to nest them, or near a card's edge to reorder. Open a folder's bookmarks as a tab group, middle-click or `Ctrl`+click for a background tab, and import an HTML bookmarks export from Chrome, Edge or Firefox with its folder structure kept. Folders also show in the sidebar, on the start page, in the palette and in the dashboard bookmarks widget (choose its folder in the widget menu).
- **Start page** per space: quick search over tabs and bookmarks (or enter an address), pinned sites, recent tabs, group overview, quick actions.
- **Dashboards**: create, rename, delete. Widgets: bookmarks, quick links, recent tabs and group launcher. You can add, remove, rename, widen and reorder widgets (drag the grip handle).
- **Command palette** (`Ctrl+K`): searches tabs, groups, spaces, dashboards and bookmarks across every space, runs actions, and opens addresses or searches.
- **Settings**: accent (per space or fixed), density, reduced motion, sidebar width, default space, startup behavior, search engine, a shortcut reference, and JSON export, import and reset.
- **Persistence**: everything is kept in `localStorage` and survives a refresh.

### Keyboard shortcuts

| Shortcut               | Action                                |
| ---------------------- | ------------------------------------- |
| `Ctrl+L`               | Focus address bar                     |
| `Ctrl+T` / `Alt+T`     | New tab                               |
| `Ctrl+W` / `Alt+W`     | Close selected tab                    |
| `Ctrl+1…9` / `Alt+1…9` | Switch space (1 = Work, 2 = Personal) |
| `Ctrl+B`               | Toggle sidebar                        |
| `Ctrl+K`               | Command palette                       |
| `Ctrl+R`               | Reload tab preview                    |
| `Alt+←` / `Alt+→`      | Back / forward                        |
| `Ctrl+,`               | Settings                              |
| `Esc`                  | Close menu / dialog / palette         |

In the bookmark library: arrow keys move between tiles, `Enter` opens, `F2` edits, `Delete` removes (with undo), `Backspace` or `Alt+↑` goes to the parent folder.

On a focused sidebar tab: `Enter` opens it, `F2` renames it, `Delete` closes it, and `Space` picks it up so you can move it with the arrow keys.

Chrome and Edge reserve `Ctrl+T`, `Ctrl+W` and `Ctrl+N`, so a web page never receives them. Use the `Alt` variants in the dev build. Shortcuts also don't fire while focus is inside an embedded page's iframe. Single-key shortcuts never fire while you are typing in a text field.

## Design system: Port UI

The interface uses **Port UI** (`@port/ui`), the shared design system for Port products. It is vendored in `vendor/port-ui` and installed as a local package. `src/styles/index.css` imports `@port/ui/port.css` into its own cascade layer (`theme, base, port, components, utilities`), so Port's component classes (`.btn`, `.menu`, `.dlg`, `.cmdk`, `.seg`, `.toggle`, `.ck`, `.slider`, `.setcard`, `.toast`, `.pill`, `.bar`, …) style the markup and Tailwind utilities can still adjust them. The same file maps Port tokens to the Tailwind colours the components use (`bg-chrome`, `bg-canvas`, `bg-surface`, `bg-sunk`, `bg-selected`, `text-fg-2`, `text-accent-ink`, `bg-success-soft`, …).

- **Themes.** Light and dark are designed separately with equal priority. Settings → Appearance has a Mode (System, Light, Dark) and five presets: Stone & Slate (default), Dusk, Signal, Pigment and High contrast. These set `data-theme` and `data-palette` on the root `.port` element. The desktop shell gets the resolved colours through a `theme` message, so the Windows title bar, window background and each page's preferred colour scheme follow the theme. The choice is saved in `theme.json` to avoid a flash at startup.
- **Hues have fixed meanings.** Cobalt is the browser's identity (primary buttons, information). Mineral means success only, amber is a warning, coral is an error, violet is reserved for AI, and `--focus` is used only for the keyboard focus ring. Spaces, groups and folders choose from Port, Cobalt, Teal, Lichen, Clay, Heather and Graphite. Each one sets its local hue with an `h-<hue>` class, and selected rows, washes and indicators use that hue.
- **State grammar.** Active means a wash in the local hue plus 600 weight. Selected means a lifted tile. Focus is a 2px ring. A drop target is a dashed hue outline over the wash.
- **Density and type.** Rows are compact (26px) by default, or cozy (32px). Text is IBM Plex Sans and IBM Plex Mono, self-hosted through Fontsource. Corners use `corner-shape: squircle` where the engine supports it.
- **Icons.** `src/components/icons.tsx` serves Port's 16px icon set, plus extra glyphs drawn on the same grid, under the names the components already use.

Colour keys saved before Port UI are mapped when loaded: violet and rose become heather, blue becomes cobalt, green becomes Port, amber becomes lichen and slate becomes graphite. Storage keys and the export format keep the `vela` identifier, so existing data and exports still load.

## Known limitations of the web build

These apply to the web build only, not the desktop app. They are limits of running inside a normal browser tab. Port states them in the UI rather than hiding them.

- **Embedding.** Pages are shown in a sandboxed `<iframe>` only as a preview. Many sites send `X-Frame-Options` or CSP `frame-ancestors` headers that forbid this. For well-known sites that do (`src/host/embedPolicy.ts`), Port skips the attempt and shows a fallback with **Open in browser**. Other sites are attempted with a visible note that they may refuse. An iframe `load` event does not prove the page rendered, so Port never reports a page as "supported" because of it. Port does not use a proxy or scraping to get around these restrictions.
- **History.** Cross-origin iframe history can't be observed. Back and forward follow Port's own per-tab history of the addresses you navigated to. Clicks inside an embedded page are not tracked.
- **Background tabs.** Only the visible tab is mounted. Inactive tabs and spaces keep their state (URL, title, history, position), but their pages are not kept running. Port does not fake background playback.
- **Titles and favicons.** Cross-origin page titles can't be read. Titles come from the hostname, or from your rename. Favicons are loaded from `<origin>/favicon.ico`, with a letter tile as fallback. Local URLs are not probed.

## Architecture

```text
src/
├── app/                App root and providers (browser host + navigation context)
├── components/
│   ├── layout/         AppShell, TopBar, ContentArea, view registry
│   ├── sidebar/        Sidebar, space switcher, tab/group tree, drag-and-drop
│   ├── tabs/           TabView (iframe preview / blocked fallback)
│   ├── start/          Start page and quick search
│   ├── dashboard/      Dashboard view, widget cards, widget bodies
│   └── common/         Buttons, tooltip, menus, dialogs, favicon, error boundary
├── features/
│   ├── workspace/      Seed data, selectors, dialog-driven flows, context menu builders
│   ├── navigation/     Navigation controller + omnibox
│   ├── bookmarks/      Bookmark folder workflows, menus, HTML import
│   ├── command-palette/
│   └── settings/       Settings view, export/import, startup behavior
├── host/               BrowserHost interface, WebBrowserHost, embed policy
├── stores/             Zustand stores and persistence (validation, migration)
├── hooks/              Global shortcuts, appearance
├── types/              Domain model
└── utils/              URL normalisation, validation helpers
```

- **State.** `workspaceStore` holds normalised entities (`spaces`, `groups`, `tabs`, `bookmarks`, `dashboards`, each keyed by stable ID) plus `activeSpaceId` and `spaceViews` (the selected view per space). `settingsStore` holds preferences. `uiStore` holds transient state (menus, dialogs, palette, reload keys) and is never persisted.
- **Persistence.** Persisted data is versioned (`WORKSPACE_SCHEMA_VERSION`) with a migration table in `stores/persistence.ts`. On load and on import, every record is validated on its own. Invalid records are dropped and broken references are repaired (for example, a tab whose group no longer exists becomes ungrouped), so one bad entry never wipes the workspace. Unparseable JSON is copied to `vela:workspace:corrupt-backup` before falling back to defaults. Only `http:`/`https:` URLs are accepted. No credentials, cookies or tokens are stored.
- **View routing.** `components/layout/viewRegistry.tsx` maps view kinds (`start`, `tab`, `dashboard`, `settings`) to renderers. To add a view, add a kind to `ContentView` and a renderer.
- **Dashboards.** Widgets are a discriminated union with a `layout` object. v0.1 uses only `colSpan`; the optional `x/y/w/h` fields are reserved for drag-resize layouts. New widget kinds (for example an embedded web panel) slot into the same union.

## Native browser host

All page rendering and navigation goes through `BrowserHost` (`src/host/types.ts`):

```ts
interface BrowserHost {
  kind: 'web' | 'native';
  capabilities: { nativeViews; persistentBackgroundTabs; engineHistory };
  navigate(tabId, url);
  reload(tabId);
  goBack(tabId);
  goForward(tabId);
  openExternal(url);
  disposeTab(tabId);
  getEmbedSupport(url);
}
```

`WebBrowserHost` is the development implementation. A future `NativeBrowserHost` would work as follows:

1. Wrap this UI in a native shell (for example WinUI 3 or WPF with WebView2) that loads the built `dist/` as the chrome UI.
2. Have the shell own one WebView2 controller per tab, positioned over the content area's bounds. The bounds are reported from the UI over `window.chrome.webview.postMessage`.
3. Implement `NativeBrowserHost` by forwarding `navigate`, `reload`, `goBack`, `goForward` and `disposeTab` as bridge messages. Return `{ mode: 'native' }` from `getEmbedSupport`, so `TabView` renders a placeholder slot instead of an iframe.
4. Feed engine events (`NavigationCompleted`, `DocumentTitleChanged`, `FaviconChanged`, history changes) back into `workspaceStore` (`recordNavigation`, title and favicon updates). This replaces Port-managed history with `engineHistory: true`.
5. Keep WebView2 instances alive for inactive tabs and spaces (`persistentBackgroundTabs: true`), optionally with one WebView2 profile per space for cookie isolation.
6. Choose the host in `src/host/createHost.ts` by detecting the bridge.

The stores, sidebar, start page, dashboards and command palette do not change.

## Tests

`npm test` runs the Vitest suites:

- `src/stores/workspaceStore.test.ts`: space switching restores each space's view, space deletion, group deletion (ungroup or close tabs), tab movement between groups and spaces, reordering, pinning, closing with neighbour selection, history, persistence round-trip, per-record sanitising, and recovery from corrupted storage.
- `src/stores/bookmarkFolders.test.ts`: nested folders, moving with cycle prevention, deleting (contents move up, or everything is deleted), bookmark reordering, revealing a folder, HTML import, the v1 to v2 migration, and repair of folder cycles and dangling references.
- `src/utils/url.test.ts`: omnibox normalisation (URLs, localhost, IPs, searches, blocked schemes).
