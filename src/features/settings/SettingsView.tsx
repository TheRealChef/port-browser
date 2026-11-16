import { useMemo, useRef, type ReactNode } from 'react';
import { NativeBrowserHost } from '../../host/NativeBrowserHost';
import { askConfirm } from '../../components/common/dialogs';
import { useUI } from '../../stores/uiStore';
import { Download, History, Pencil, RotateCcw, Trash2, Upload } from '../../components/icons';
import { EntityIcon } from '../../components/common/EntityIcon';
import { useBrowserHost } from '../../app/providers/hostContext';
import { Button } from '../../components/common/Button';
import { Segmented, Select, Slider, Switch } from '../../components/common/Controls';
import { IconButton } from '../../components/common/IconButton';
import { Kbd } from '../../components/common/Kbd';
import { AccentPicker } from '../../components/common/Pickers';
import { resolveTheme } from '../../hooks/useAppearance';
import {
  SIDEBAR_MAX,
  SIDEBAR_MIN,
  SUSPEND_OPTIONS,
  UNLOAD_OPTIONS,
} from '../../stores/persistence';
import { useSettings } from '../../stores/settingsStore';
import { useWorkspace } from '../../stores/workspaceStore';
import { SEARCH_ENGINES, type Palette } from '../../types/models';
import { cn, MOD_LABEL } from '../../utils/misc';
import { SEARCH_ENGINE_LABELS } from '../../utils/url';
import { hueClass } from '../workspace/appearance';
import { deleteSpaceFlow, editSpaceFlow } from '../workspace/actions';
import { sortedSpaces } from '../workspace/selectors';
import { exportConfiguration, importConfiguration, resetApplicationData } from './dataTransfer';

/** Port UI settings section: title and description on the left, a card on the right. */
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="setsec py-5 max-[760px]:grid-cols-1 max-[760px]:gap-3">
      <header>
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </header>
      <div className="setcard bg-surface">{children}</div>
    </section>
  );
}

function Row({
  label,
  hint,
  children,
  column,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  column?: boolean;
}) {
  return (
    <div className={cn('setrow', column && 'col')}>
      <div>
        <div className="sl">{label}</div>
        {hint && <div className="sd">{hint}</div>}
      </div>
      <div className={cn(column ? '' : 'sc2', 'flex items-center gap-2')}>{children}</div>
    </div>
  );
}

const PRESETS: Array<{ id: Palette; name: string; description: string }> = [
  { id: 'stone', name: 'Stone & Slate', description: 'Warm stone light, cool slate dark' },
  { id: 'dusk', name: 'Dusk', description: 'Peach paper, plum indigo' },
  { id: 'signal', name: 'Signal', description: 'Cooler greys, magenta brand' },
  { id: 'pigment', name: 'Pigment', description: 'Bright paper or ink black, bold hues' },
  { id: 'contrast', name: 'High contrast', description: 'WCAG AAA text and marks' },
];

/** A miniature Port window rendered in the preset's own tokens. */
function PresetPreview({ palette, theme }: { palette: Palette; theme: 'light' | 'dark' }) {
  return (
    <span
      aria-hidden
      className="port mini"
      data-theme={theme}
      data-palette={palette === 'stone' ? undefined : palette}
      style={{ background: 'var(--surface-0)' }}
    >
      <i style={{ background: 'var(--surface-1)' }} />
      <span className="flex min-w-0 flex-col gap-[3px]">
        <i className="h-2.5" style={{ background: 'var(--surface-sunk)' }} />
        <i
          className="flex-1"
          style={{ background: 'var(--surface-2)', boxShadow: 'var(--shadow-tile)' }}
        />
        <span className="flex gap-[3px]">
          <i className="h-1.5 w-5" style={{ background: 'var(--brand)' }} />
          <i className="h-1.5 w-2.5" style={{ background: 'var(--cobalt)' }} />
          <i className="h-1.5 w-2.5" style={{ background: 'var(--clay)' }} />
          <i className="h-1.5 w-2.5" style={{ background: 'var(--heather)' }} />
        </span>
      </span>
    </span>
  );
}

function PresetPicker() {
  const palette = useSettings((s) => s.palette);
  const mode = useSettings((s) => s.theme);
  const update = useSettings((s) => s.update);
  const theme = resolveTheme(mode, document.documentElement.dataset.theme !== 'light');
  return (
    <div
      role="radiogroup"
      aria-label="Theme preset"
      className="grid w-full grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-2"
    >
      {PRESETS.map((p) => (
        <span
          key={p.id}
          role="radio"
          tabIndex={0}
          aria-checked={palette === p.id}
          aria-label={p.name}
          title={p.description}
          onClick={() => update({ palette: p.id })}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              update({ palette: p.id });
            }
          }}
          className="preset"
        >
          <PresetPreview palette={p.id} theme={theme} />
          <span className="lbl2">{p.name}</span>
        </span>
      ))}
    </div>
  );
}

const SHORTCUTS: Array<{ keys: string; action: string; note?: string }> = [
  { keys: `${MOD_LABEL}+L`, action: 'Focus address bar' },
  {
    keys: `${MOD_LABEL}+T  ·  Alt+T`,
    action: 'New tab',
    note: 'Chrome/Edge reserve Ctrl+T; use Alt+T',
  },
  {
    keys: `${MOD_LABEL}+W  ·  Alt+W`,
    action: 'Close tab',
    note: 'Chrome/Edge reserve Ctrl+W; use Alt+W',
  },
  {
    keys: `${MOD_LABEL}+Shift+T  ·  Alt+Shift+T`,
    action: 'Reopen closed tab',
    note: 'Chrome/Edge reserve Ctrl+Shift+T; use Alt+Shift+T',
  },
  { keys: `${MOD_LABEL}+1…9  ·  Alt+1…9`, action: 'Switch space (Work, Personal, …)' },
  { keys: `${MOD_LABEL}+B`, action: 'Toggle sidebar' },
  { keys: `${MOD_LABEL}+K`, action: 'Command palette' },
  { keys: `${MOD_LABEL}+R`, action: 'Reload tab' },
  { keys: 'Alt+← / Alt+→', action: 'Back / forward' },
  { keys: `${MOD_LABEL}+,`, action: 'Settings' },
  { keys: `${MOD_LABEL}+H`, action: 'History' },
  { keys: `${MOD_LABEL}+J`, action: 'Downloads', note: 'Desktop app' },
  { keys: 'Esc', action: 'Close menu, dialog or palette' },
  { keys: 'F2 · Delete · Space', action: 'On a focused tab: rename · close · pick up to reorder' },
];

export function SettingsView() {
  const host = useBrowserHost();
  const settings = useSettings();
  const spaces = useWorkspace((s) => s.spaces);
  const spaceList = useMemo(() => sortedSpaces(spaces), [spaces]);
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[900px] px-8 pb-16 pt-8">
        <h1 className="text-[22px] font-semibold leading-7 tracking-[-0.015em]">Settings</h1>
        <p className="mt-1 text-[12.5px] text-fg-2">
          Stored locally on this device. Nothing is sent anywhere.
        </p>

        <Section
          title="Appearance"
          description="Light and dark are designed separately. Presets change the whole palette in both."
        >
          <Row label="Mode" hint="System follows Windows and switches with it.">
            <Segmented
              label="Mode"
              value={settings.theme}
              onChange={(theme) => settings.update({ theme })}
              options={[
                { value: 'system', label: 'System' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
          </Row>
          <Row label="Preset" column>
            <PresetPicker />
          </Row>
          <Row
            label="Colour"
            hint="Selected rows, rails and indicators take the active space's colour, or one colour everywhere."
          >
            <Segmented
              label="Colour mode"
              value={settings.accentMode}
              onChange={(accentMode) => settings.update({ accentMode })}
              options={[
                { value: 'space', label: 'Per space' },
                { value: 'fixed', label: 'Fixed' },
              ]}
            />
          </Row>
          {settings.accentMode === 'fixed' && (
            <Row label="Fixed colour">
              <AccentPicker
                value={settings.fixedAccent}
                onChange={(fixedAccent) => settings.update({ fixedAccent })}
              />
            </Row>
          )}
          <Row label="Density" hint="Compact rows are 26px, cozy rows 32px.">
            <Segmented
              label="Density"
              value={settings.density}
              onChange={(density) => settings.update({ density })}
              options={[
                { value: 'compact', label: 'Compact' },
                { value: 'comfortable', label: 'Cozy' },
              ]}
            />
          </Row>
          <Row label="Reduce motion" hint="Loops stop and movement becomes fades.">
            <Switch
              label="Reduce motion"
              checked={settings.reduceMotion}
              onChange={(reduceMotion) => settings.update({ reduceMotion })}
            />
          </Row>
        </Section>

        <Section title="Sidebar">
          <Row
            label="Width"
            hint={
              <>
                <span className="num">{settings.sidebarWidth}px</span> · you can also drag the
                sidebar edge
              </>
            }
          >
            <Slider
              label="Sidebar width"
              min={SIDEBAR_MIN}
              max={SIDEBAR_MAX}
              step={4}
              value={settings.sidebarWidth}
              onChange={settings.setSidebarWidth}
              className="w-48"
            />
          </Row>
          <Row label="Show sidebar" hint={`${MOD_LABEL}+B toggles it from anywhere.`}>
            <Switch
              label="Show sidebar"
              checked={!settings.sidebarCollapsed}
              onChange={(show) => settings.update({ sidebarCollapsed: !show })}
            />
          </Row>
        </Section>

        <Section title="Spaces & startup" description="Where Port opens and how it searches.">
          <Row label="Default space" hint="Used when Port starts on the default space.">
            <Select
              label="Default space"
              value={
                settings.defaultSpaceId && spaces[settings.defaultSpaceId]
                  ? settings.defaultSpaceId
                  : ''
              }
              onChange={(id) => settings.update({ defaultSpaceId: id || null })}
              options={[
                { value: '', label: `First space (${spaceList[0]?.name ?? ''})` },
                ...spaceList.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </Row>
          <Row label="On startup">
            <Segmented
              label="Restore behavior"
              value={settings.restoreBehavior}
              onChange={(restoreBehavior) => settings.update({ restoreBehavior })}
              options={[
                { value: 'restore', label: 'Restore session' },
                { value: 'defaultSpace', label: 'Default space' },
              ]}
            />
          </Row>
          <Row label="Search engine" hint="For address-bar text that isn't a web address.">
            <Select
              label="Search engine"
              value={settings.searchEngine}
              onChange={(searchEngine) => settings.update({ searchEngine })}
              options={SEARCH_ENGINES.map((engine) => ({
                value: engine,
                label: SEARCH_ENGINE_LABELS[engine],
              }))}
            />
          </Row>
          <Row label="Spaces" column>
            <div className="flex w-full flex-col gap-px">
              {spaceList.map((space) => (
                <div
                  key={space.id}
                  className="flex h-row items-center gap-2.5 rounded-[7px] px-1 hover:bg-hover"
                >
                  <span className={cn('icbox size-6', hueClass(space.accent))}>
                    <EntityIcon name={space.icon} size={14} />
                  </span>
                  <span className="flex-1 text-[13px]">{space.name}</span>
                  <IconButton
                    size="sm"
                    icon={Pencil}
                    label={`Edit ${space.name}`}
                    onClick={() => void editSpaceFlow(space.id)}
                  />
                  <IconButton
                    size="sm"
                    icon={Trash2}
                    label={`Delete ${space.name}`}
                    disabled={spaceList.length <= 1}
                    onClick={() => void deleteSpaceFlow(space.id)}
                  />
                </div>
              ))}
            </div>
          </Row>
        </Section>

        <Section
          title="Keyboard shortcuts"
          description={
            host.kind === 'web'
              ? "Shortcuts don't fire while focus is inside an embedded page."
              : 'These work even while a page has focus.'
          }
        >
          {SHORTCUTS.map((s) => (
            <div key={s.action} className="setrow py-2">
              <span className="text-[12.5px]">
                {s.action}
                {s.note && (host.kind === 'web' || !s.note.includes('reserve')) && (
                  <span className="ml-2 text-[11.5px] text-fg-3">{s.note}</span>
                )}
              </span>
              <Kbd>{s.keys}</Kbd>
            </div>
          ))}
        </Section>

        <Section
          title="History"
          description="Visited pages are kept only on this device, without sign-in codes or tokens from addresses."
        >
          <Row label="Save browsing history" hint="Turning this off keeps existing history.">
            <Switch
              label="Save browsing history"
              checked={settings.recordHistory}
              onChange={(recordHistory) => settings.update({ recordHistory })}
            />
          </Row>
          <Row label="Browsing history">
            <Button icon={History} onClick={() => useUI.getState().setHistoryOpen(true)}>
              Open history
            </Button>
          </Row>
        </Section>

        {host instanceof NativeBrowserHost && (
          <Section
            title="Sleeping tabs"
            description="Tabs you aren't looking at go to sleep after a while (they wake instantly) and are unloaded later (they reload when opened; sign-ins stay). Audio tabs are left alone and pinned tabs are never unloaded."
          >
            <Row label="Put inactive tabs to sleep">
              <Switch
                label="Put inactive tabs to sleep"
                checked={settings.tabSleep}
                onChange={(tabSleep) => settings.update({ tabSleep })}
              />
            </Row>
            {settings.tabSleep && (
              <>
                <Row label="Sleep after" hint="Stops the page running; it wakes instantly.">
                  <Segmented
                    label="Sleep after"
                    value={settings.tabSuspendMinutes}
                    options={SUSPEND_OPTIONS.map((m) => ({ value: m, label: `${m} min` }))}
                    onChange={(tabSuspendMinutes) => settings.update({ tabSuspendMinutes })}
                  />
                </Row>
                <Row
                  label="Unload after"
                  hint="Frees all its memory; the page reloads when opened."
                >
                  <Segmented
                    label="Unload after"
                    value={settings.tabUnloadMinutes}
                    options={UNLOAD_OPTIONS.map((m) => ({
                      value: m,
                      label: m === 0 ? 'Never' : m >= 60 ? `${m / 60} h` : `${m} min`,
                    }))}
                    onChange={(tabUnloadMinutes) => settings.update({ tabUnloadMinutes })}
                  />
                </Row>
              </>
            )}
          </Section>
        )}

        {host instanceof NativeBrowserHost && (
          <Section
            title="Sign-ins"
            description="Each space has its own cookies and site data, so you can be signed in to different accounts per space. Sign-ins are kept when Port restarts."
          >
            {spaceList.map((space) => (
              <div key={space.id} className="setrow py-2">
                <span
                  className={cn('flex items-center gap-2.5 text-[12.5px]', hueClass(space.accent))}
                >
                  <span className="dot" />
                  {space.name}
                </span>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() =>
                    void askConfirm({
                      title: `Sign out of all sites in ${space.name}?`,
                      message:
                        'Deletes cookies, site storage and cache for this space. Open pages reload signed out. Bookmarks, tabs and history stay.',
                      confirmLabel: 'Sign out',
                      danger: true,
                    }).then(({ ok }) => {
                      if (ok) host.clearSpaceData(space.id);
                    })
                  }
                >
                  Sign out of all sites
                </Button>
              </div>
            ))}
          </Section>
        )}

        <Section
          title="Data"
          description="Export or restore spaces, groups, tabs, dashboards, bookmarks and settings as JSON."
        >
          <Row label="Configuration">
            <Button icon={Download} onClick={exportConfiguration}>
              Export
            </Button>
            <Button icon={Upload} onClick={() => fileInput.current?.click()}>
              Import
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void importConfiguration(file);
              }}
            />
          </Row>
          <Row label="Reset" hint="Removes every space, tab, bookmark and setting.">
            <Button variant="danger" icon={RotateCcw} onClick={() => void resetApplicationData()}>
              Reset application data
            </Button>
          </Row>
        </Section>

        <Section
          title="Browser runtime"
          description={
            host.kind === 'native'
              ? 'Pages run in Microsoft Edge WebView2. Every tab is a real browser view, and each space has its own profile.'
              : 'This development build runs inside your browser. Pages show as sandboxed previews only when the site allows embedding; others open in a regular browser tab.'
          }
        >
          <Row label="Host" hint={host.label}>
            <span className={cn('pill', host.kind === 'web' ? 'h-amber' : 'h-mineral')}>
              {host.kind}
            </span>
          </Row>
        </Section>
      </div>
    </div>
  );
}
