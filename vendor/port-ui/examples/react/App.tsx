// React example: a small Port Git screen built only from @port/ui/react.
// In your app: import "@port/ui/fonts.css"; import "@port/ui/port.css"; import { … } from "@port/ui/react";
import * as React from "react";
import {
  PortRoot, Window, Panel, Group, Row, Children, Button, IconButton, Toolbar, ToolbarSeparator, TextField, Checkbox, Switch, Select, Segmented,
  Tabs, DataTable, StatusGlyph, Pill, Banner, Dialog, CommandPalette, ContextMenu, Kbd, Icon, Toast, type CommandItem, type PortPreset,
} from "../../react/index";

type Issue = { key: string; title: string; owner: string; status: "In progress" | "In review" | "Done"; est: number };
const ISSUES: Issue[] = [
  { key: "PORT-311", title: "Tab restore after crash", owner: "Mara", status: "In progress", est: 3 },
  { key: "PORT-318", title: "Hub launcher keyboard nav", owner: "Jonas", status: "In progress", est: 1 },
  { key: "PORT-302", title: "Merge semantics", owner: "Hrvoje", status: "In review", est: 5 },
  { key: "PORT-297", title: "Debounce terminal resize", owner: "Jonas", status: "Done", est: 0.5 },
];
const STATUS = { "In progress": ["run", 50, "cobalt"], "In review": ["review", 66, "violet"], Done: ["done", 100, "mineral"] } as const;

export function App() {
  const [theme, setTheme] = React.useState<"system" | "light" | "dark">("system");
  const [preset, setPreset] = React.useState<PortPreset>("stone");
  const [branch, setBranch] = React.useState("feat/sync-engine");
  const [view, setView] = React.useState<"files" | "tree">("files");
  const [tab, setTab] = React.useState("merge");
  const [sign, setSign] = React.useState(true);
  const [push, setPush] = React.useState(false);
  const [base, setBase] = React.useState<"main" | "develop">("main");
  const [selected, setSelected] = React.useState<string[]>([]);
  const [discard, setDiscard] = React.useState(false);
  const [palette, setPalette] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette(true); } };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, []);
  const commands: CommandItem[] = [
    { id: "pr", group: "Jump to", label: "Open PR #482 · sync-engine", icon: "merge", hue: "clay", meta: "Git", onRun: () => setToast("Opened PR #482") },
    { id: "ws", group: "Actions", label: "Switch workspace…", icon: "grid", hue: "brand", shortcut: "mod+shift+w", onRun: () => setToast("Workspace switcher") },
    { id: "th", group: "Actions", label: "Toggle light / dark", icon: "eye", hue: "graphite", onRun: () => setTheme((t) => (t === "dark" ? "light" : "dark")) },
  ];

  return (
    <PortRoot theme={theme} palette={preset === "stone" ? undefined : preset} style={{ height: "100vh", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="row-flex" style={{ flexWrap: "wrap", gap: 16 }}>
        <Segmented label="Theme" value={theme} onChange={setTheme} options={[{ value: "system", label: "System", icon: "cpu" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />
        <Segmented label="Preset" value={preset} onChange={setPreset} options={[{ value: "stone", label: "Stone & Slate" }, { value: "dusk", label: "Dusk" }, { value: "signal", label: "Signal" }, { value: "pigment", label: "Pigment" }, { value: "contrast", label: "High contrast" }]} />
      </div>
      <Window app="Port Git" appIcon="branch" hue="clay" style={{ flex: 1, minHeight: 0 }}
        titleExtras={<button className="tb-cmd" onClick={() => setPalette(true)}><Icon name="search" size="sm" /><span className="grow">Jump to anything…</span><Kbd keys="mod+k" /></button>}
        status={<><span>{branch}</span><span>↑3 ↓1</span><span className="grow" /><span>fetched 2m ago</span></>}>
        <Panel title="Branches" hue="clay" style={{ width: 260, flex: "none" }} tools={<IconButton icon="plus" label="New branch" tooltip shortcut="mod+shift+b" size="sm" />}>
          <ContextMenu items={[{ id: "co", label: "Check out", icon: "branch" }, { id: "mg", label: "Merge into current", icon: "merge" }, "separator", { id: "del", label: "Delete branch", icon: "x", danger: true, shortcut: "mod+backspace" }]}>
            <Group title="Local" hue="clay" count={3}>
              {["feat/sync-engine", "main", "fix/tab-restore"].map((b) => (
                <Row key={b} hue="clay" label={b} lead={<Icon name="branch" size="sm" />} selected={b === branch} active={b === branch} onSelect={() => setBranch(b)} trail={b === "feat/sync-engine" ? <span className="meta">↑3 ↓1</span> : undefined} />
              ))}
              <Row hue="violet" label="agent/refactor-ipc" running lead={<Icon name="spark" size="sm" className="ic-hue" />} trail={<Pill hue="violet">agent</Pill>} />
            </Group>
            <Group title="origin" hue="teal" count={1} defaultOpen={false}><Row label="main" hue="teal" /><Children><Row nested label="sync-engine" hue="teal" /></Children></Group>
          </ContextMenu>
        </Panel>
        <Panel title="Issues" style={{ flex: 1 }} flush tools={<><Toolbar label="View"><Segmented label="View" value={view} onChange={setView} options={[{ value: "files", label: "Files" }, { value: "tree", label: "Tree" }]} /><ToolbarSeparator /></Toolbar><Button variant="danger" icon="x" onClick={() => setDiscard(true)}>Discard…</Button></>}>
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
            <Banner hue="cobalt" title="Rebase in progress.">2 of 3 commits applied.</Banner>
            <Tabs hue="clay" value={tab} onChange={setTab} tabs={[{ value: "merge", label: "merge.ts", icon: "file" }, { value: "clock", label: "clock.ts" }]} />
            <DataTable rows={ISSUES} rowKey={(r) => r.key} groupBy={(r) => r.status} groupOrder={["In progress", "In review", "Done"]}
              groupLead={(g) => { const s = STATUS[g as Issue["status"]]; return <StatusGlyph kind={s[0]} progress={s[1]} />; }}
              selectable selected={selected} onSelectedChange={setSelected}
              rowActions={() => <IconButton icon="more" label="More" size="sm" />}
              columns={[
                { key: "key", header: "Key", width: 110, mono: true, sortable: true },
                { key: "title", header: "Title", sortable: true },
                { key: "owner", header: "Owner", width: 100, sortable: true },
                { key: "est", header: "Est.", width: 70, numeric: true, sortable: true, value: (r) => r.est, render: (r) => `${r.est}d` },
              ]} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 640 }}>
              <TextField label="Commit message" defaultValue="Guard tombstones until all peers ack" help="Shown in history and pull requests." />
              <Select label="Base branch" value={base} onChange={setBase} options={[{ value: "main", label: "main", lead: <Icon name="branch" size="sm" /> }, { value: "develop", label: "develop", lead: <Icon name="branch" size="sm" /> }]} />
              <Checkbox checked={sign} onChange={setSign} label="Sign commit" hue="clay" />
              <div className="row-flex"><span className="grow">Push after commit</span><Switch label="Push after commit" checked={push} onChange={setPush} /></div>
            </div>
            <div><Button variant="primary" hue="clay" icon="commit" onClick={() => setToast("Committed 3 files")}>Commit <Kbd keys="mod+enter" /></Button></div>
          </div>
        </Panel>
        <Dialog open={discard} onClose={() => setDiscard(false)} tone="coral" icon="alert" title="Discard 2 unstaged changes?" footerNote="esc to cancel"
          actions={<><Button onClick={() => setDiscard(false)}>Cancel</Button><Button variant="primary" hue="coral" onClick={() => { setDiscard(false); setToast("Discarded 2 changes"); }}>Discard changes</Button></>}>
          <p>registry.ts and legacy-channels.ts go back to their last commit. Port keeps a copy in Stashes for 7 days.</p>
        </Dialog>
        <CommandPalette open={palette} onClose={() => setPalette(false)} items={commands} />
      </Window>
      {toast && <div className="toasts-stack"><Toast action={<Button size="sm" variant="quiet" onClick={() => setToast(null)}>Dismiss</Button>}>{toast}</Toast></div>}
    </PortRoot>
  );
}
