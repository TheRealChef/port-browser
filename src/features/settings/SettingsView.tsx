import { useMemo, useRef, type ReactNode } from 'react';
import { EntityIcon } from '../../components/common/EntityIcon';
import { Download, Pencil, RotateCcw, Trash2, Upload } from 'lucide-react';
import { useBrowserHost } from '../../app/providers/hostContext';
import { Button } from '../../components/common/Button';
import { IconButton } from '../../components/common/IconButton';
import { Kbd } from '../../components/common/Kbd';
import { AccentPicker } from '../../components/common/Pickers';
import { SIDEBAR_MAX, SIDEBAR_MIN } from '../../stores/persistence';
import { useSettings } from '../../stores/settingsStore';
import { useWorkspace } from '../../stores/workspaceStore';
import { SEARCH_ENGINES } from '../../types/models';
import { cn, MOD_LABEL } from '../../utils/misc';
import { SEARCH_ENGINE_LABELS } from '../../utils/url';
import { ACCENTS } from '../workspace/appearance';
import { deleteSpaceFlow, editSpaceFlow } from '../workspace/actions';
import { sortedSpaces } from '../workspace/selectors';
import { exportConfiguration, importConfiguration, resetApplicationData } from './dataTransfer';

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
    <section className="border-b border-line py-6 last:border-0">
      <h2 className="text-[14px] font-semibold">{title}</h2>
      {description && <p className="mt-0.5 text-[12.5px] text-fg-3">{description}</p>}
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      <div className="min-w-[180px] flex-1">
        <div className="text-[13px]">{label}</div>
        {hint && <div className="text-[12px] text-fg-3">{hint}</div>}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex rounded-lg border border-line bg-surface p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-7 rounded-md px-3 text-[12.5px] transition-ui',
            value === o.value ? 'bg-active text-fg shadow-card' : 'text-fg-2 hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-5 w-9 rounded-full transition-ui',
        checked ? 'bg-accent' : 'bg-hover',
      )}
    >
      <span
        className={cn(
          'absolute left-0 top-0.5 size-4 rounded-full bg-fg shadow transition-transform duration-150',
          checked ? 'translate-x-[18px]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

const selectClass =
  'h-8 rounded-md border border-line-strong bg-surface px-2 text-[13px] text-fg outline-none focus:border-accent';

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
  { keys: `${MOD_LABEL}+R`, action: 'Reload tab preview' },
  { keys: 'Alt+← / Alt+→', action: 'Back / forward' },
  { keys: `${MOD_LABEL}+,`, action: 'Settings' },
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
      <div className="mx-auto max-w-[720px] px-8 pb-16 pt-8">
        <h1 className="text-[20px] font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-[12.5px] text-fg-3">
          Stored locally in this browser. Nothing is sent anywhere.
        </p>

        <Section title="Appearance">
          <Row label="Accent color" hint="Follow the active space, or use one color everywhere.">
            <Segmented
              label="Accent mode"
              value={settings.accentMode}
              onChange={(accentMode) => settings.update({ accentMode })}
              options={[
                { value: 'space', label: 'Per space' },
                { value: 'fixed', label: 'Fixed' },
              ]}
            />
          </Row>
          {settings.accentMode === 'fixed' && (
            <Row label="Fixed accent">
              <AccentPicker
                value={settings.fixedAccent}
                onChange={(fixedAccent) => settings.update({ fixedAccent })}
              />
            </Row>
          )}
          <Row label="Density" hint="Row height in the sidebar.">
            <Segmented
              label="Density"
              value={settings.density}
              onChange={(density) => settings.update({ density })}
              options={[
                { value: 'compact', label: 'Compact' },
                { value: 'comfortable', label: 'Comfortable' },
              ]}
            />
          </Row>
          <Row label="Reduce motion" hint="Turns off transitions and animations.">
            <Toggle
              label="Reduce motion"
              checked={settings.reduceMotion}
              onChange={(reduceMotion) => settings.update({ reduceMotion })}
            />
          </Row>
        </Section>

        <Section title="Sidebar">
          <Row
            label="Width"
            hint={`${settings.sidebarWidth}px · you can also drag the sidebar edge`}
          >
            <input
              type="range"
              aria-label="Sidebar width"
              min={SIDEBAR_MIN}
              max={SIDEBAR_MAX}
              step={4}
              value={settings.sidebarWidth}
              onChange={(e) => settings.setSidebarWidth(Number(e.target.value))}
              className="w-48 accent-[var(--accent)]"
            />
          </Row>
          <Row label="Show sidebar" hint={`${MOD_LABEL}+B toggles it from anywhere.`}>
            <Toggle
              label="Show sidebar"
              checked={!settings.sidebarCollapsed}
              onChange={(show) => settings.update({ sidebarCollapsed: !show })}
            />
          </Row>
        </Section>

        <Section title="Spaces & startup">
          <Row label="Default space" hint="Used when Vela starts on the default space.">
            <select
              aria-label="Default space"
              className={selectClass}
              value={
                settings.defaultSpaceId && spaces[settings.defaultSpaceId]
                  ? settings.defaultSpaceId
                  : ''
              }
              onChange={(e) => settings.update({ defaultSpaceId: e.target.value || null })}
            >
              <option value="">First space ({spaceList[0]?.name})</option>
              {spaceList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Row>
          <Row label="On startup">
            <Segmented
              label="Restore behavior"
              value={settings.restoreBehavior}
              onChange={(restoreBehavior) => settings.update({ restoreBehavior })}
              options={[
                { value: 'restore', label: 'Restore last session' },
                { value: 'defaultSpace', label: 'Open default space' },
              ]}
            />
          </Row>
          <Row label="Search engine" hint="Used for address-bar queries that aren't web addresses.">
            <select
              aria-label="Search engine"
              className={selectClass}
              value={settings.searchEngine}
              onChange={(e) =>
                settings.update({ searchEngine: e.target.value as typeof settings.searchEngine })
              }
            >
              {SEARCH_ENGINES.map((engine) => (
                <option key={engine} value={engine}>
                  {SEARCH_ENGINE_LABELS[engine]}
                </option>
              ))}
            </select>
          </Row>
          <div className="flex flex-col gap-px rounded-lg border border-line">
            {spaceList.map((space) => {
              return (
                <div
                  key={space.id}
                  className="flex items-center gap-2.5 px-3 py-2 [&+&]:border-t [&+&]:border-line"
                >
                  <EntityIcon
                    name={space.icon}
                    size={15}
                    style={{ color: ACCENTS[space.accent].value }}
                  />
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
              );
            })}
          </div>
        </Section>

        <Section
          title="Keyboard shortcuts"
          description="Shortcuts don't fire while focus is inside an embedded page."
        >
          <div className="overflow-hidden rounded-lg border border-line">
            {SHORTCUTS.map((s) => (
              <div
                key={s.action}
                className="flex items-center gap-3 px-3 py-2 text-[13px] [&+&]:border-t [&+&]:border-line"
              >
                <span className="flex-1">
                  {s.action}
                  {s.note && <span className="ml-2 text-[12px] text-fg-3">{s.note}</span>}
                </span>
                <Kbd>{s.keys}</Kbd>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Data management"
          description="Export or restore your spaces, groups, tabs, dashboards, bookmarks and settings as JSON."
        >
          <div className="flex flex-wrap gap-2">
            <Button icon={Download} onClick={exportConfiguration}>
              Export configuration
            </Button>
            <Button icon={Upload} onClick={() => fileInput.current?.click()}>
              Import configuration
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
            <span className="flex-1" />
            <Button variant="danger" icon={RotateCcw} onClick={() => void resetApplicationData()}>
              Reset application data
            </Button>
          </div>
        </Section>

        <Section title="Browser runtime">
          <Row label="Host" hint={host.label}>
            <span className="rounded-md border border-line px-2 py-0.5 text-[12px] text-fg-2">
              {host.kind}
            </span>
          </Row>
          <p className="text-[12.5px] leading-relaxed text-fg-3">
            This development build runs inside your existing browser. Pages are shown as sandboxed
            previews only when the site allows embedding; many sites refuse, and those open in a
            regular browser tab instead. Tabs in inactive spaces keep their place and history, but
            their pages are not kept running in the background. A native host (WebView2) will lift
            these limits.
          </p>
        </Section>
      </div>
    </div>
  );
}
