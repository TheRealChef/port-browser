/*! @port/ui/react — controlled React components that render Port's markup and classes.
    Import the CSS once (e.g. `import "@port/ui/port.css"`), wrap your app in <PortRoot>, then use these.
    State lives in React; the vanilla behaviour layer (Port.init / wire) is not needed here. */
import * as React from "react";
import { keys as fmtKeys, detectPlatform, configure } from "../dist/port.mjs";
import { iconPaths } from "../dist/icons.mjs";
import type { PortHue, PortIcon, PortOptions, PortPlatform, PortPreset, PortTheme, StatusKind } from "../dist/port";

export type { PortHue, PortIcon, PortOptions, PortPlatform, PortPreset, PortTheme, StatusKind };

const useIsoLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;
const cx = (...a: Array<string | false | null | undefined>) => a.filter(Boolean).join(" ");
const hueCls = (h?: PortHue) => (h ? `h-${h}` : undefined);

/* ------------------------------------------------------------------ root */
const PlatformCtx = React.createContext<PortPlatform>("mac");
export const usePortPlatform = () => React.useContext(PlatformCtx);

export interface PortRootProps extends PortOptions, React.HTMLAttributes<HTMLDivElement> {}
/** Scope for every Port token and component. Theme "system" follows the OS live. */
export function PortRoot({ theme = "system", palette, density = "compact", motion = "full", platform, className, children, ...rest }: PortRootProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const plat = React.useMemo(() => platform ?? (typeof navigator !== "undefined" ? detectPlatform() : "mac"), [platform]);
  React.useEffect(() => { if (ref.current) configure(ref.current, { theme, palette, density, motion, platform: plat }); }, [theme, palette, density, motion, plat]);
  return (
    <PlatformCtx.Provider value={plat}>
      <div ref={ref} className={cx("port", className)} data-palette={palette} data-density={density} data-motion={motion} data-platform={plat} data-theme={theme === "system" ? undefined : theme} {...rest}>
        {children}
      </div>
    </PlatformCtx.Provider>
  );
}

/* ------------------------------------------------------------------ primitives */
export function Icon({ name, size, className, label }: { name: PortIcon; size?: "sm" | "lg"; className?: string; label?: string }) {
  return (
    <svg className={cx("ic", `i-${name}`, size, className)} viewBox="0 0 16 16" aria-hidden={label ? undefined : true} role={label ? "img" : undefined} aria-label={label}>
      <path d={(iconPaths as Record<string, string>)[name]} />
    </svg>
  );
}
/** Keyboard shortcut written once ("mod+shift+k"); renders ⌘⇧K on macOS, Ctrl+Shift+K elsewhere. */
export function Kbd({ keys }: { keys: string }) { const p = usePortPlatform(); return <kbd className="kbd">{fmtKeys(keys, p)}</kbd>; }

type ButtonVariant = "default" | "primary" | "tonal" | "quiet" | "danger" | "link";
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant; size?: "sm" | "md" | "lg"; hue?: PortHue; icon?: PortIcon; loading?: boolean; done?: boolean;
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = "default", size = "md", hue, icon, loading, done, className, children, type = "button", ...rest }, ref) {
  return (
    <button ref={ref} type={type} aria-busy={loading || undefined} className={cx("btn", variant !== "default" && variant, size !== "md" && size, hueCls(hue), loading && "is-loading", done && "is-done", className)} {...rest}>
      {icon && <Icon name={done ? "check" : icon} size="sm" />}
      {children}
    </button>
  );
});
export function IconButton({ icon, label, tooltip, shortcut, variant = "quiet", size, ...rest }: Omit<ButtonProps, "children"> & { icon: PortIcon; label: string; tooltip?: boolean; shortcut?: string }) {
  const b = <Button aria-label={label} variant={variant} size={size} className="icon" {...rest}><Icon name={icon} /></Button>;
  return tooltip ? <Tooltip content={label} shortcut={shortcut}>{b}</Tooltip> : b;
}
export const ButtonGroup = ({ children }: { children: React.ReactNode }) => <div className="bgroup" role="group">{children}</div>;
export const Toolbar = ({ children, label }: { children: React.ReactNode; label: string }) => <div className="toolbar" role="toolbar" aria-label={label}>{children}</div>;
export const ToolbarSeparator = () => <span className="vsep" aria-hidden />;

/* ------------------------------------------------------------------ text fields */
export interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label?: string; help?: string; error?: string; success?: string; optional?: boolean; icon?: PortIcon; prefix?: string; suffix?: string; shortcut?: string; multiline?: boolean; rows?: number;
}
export function TextField({ label, help, error, success, optional, icon, prefix, suffix, shortcut, multiline, rows = 3, disabled, id, className, ...rest }: TextFieldProps) {
  const auto = React.useId(); const fid = id ?? auto; const hid = `${fid}-help`;
  const state = error ? "is-error" : success ? "is-ok" : disabled ? "is-disabled" : undefined;
  const msg = error ?? success ?? help;
  return (
    <div className={cx("tf", state, className)}>
      {label && <label className="tf-l" htmlFor={fid}>{label}{optional && <span className="opt">optional</span>}</label>}
      <span className={cx("box", multiline && "ta")}>
        {icon && <Icon name={icon} size="sm" />}
        {prefix && <span className="affix">{prefix}</span>}
        {multiline
          ? <textarea id={fid} className="inp" rows={rows} disabled={disabled} aria-invalid={!!error} aria-describedby={msg ? hid : undefined} {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} />
          : <input id={fid} className="inp" disabled={disabled} aria-invalid={!!error} aria-describedby={msg ? hid : undefined} {...rest} />}
        {suffix && <span className="affix">{suffix}</span>}
        {shortcut && <Kbd keys={shortcut} />}
      </span>
      {msg && <span className="tf-h" id={hid}>{error && <Icon name="alert" size="sm" />}{success && <Icon name="check" size="sm" />}{msg}</span>}
    </div>
  );
}
export function TokenField({ label, values, onChange, hue = "brand", placeholder = "Add, then Enter" }: { label?: string; values: string[]; onChange: (v: string[]) => void; hue?: PortHue; placeholder?: string }) {
  const [draft, setDraft] = React.useState(""); const id = React.useId();
  return (
    <div className="tf">
      {label && <label className="tf-l" htmlFor={id}>{label}</label>}
      <span className="box tokens">
        {values.map((v) => <span key={v} className={cx("tag", hueCls(hue))}>{v}<button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}><Icon name="x" /></button></span>)}
        <input id={id} className="inp" style={{ minWidth: 80, height: 22 }} value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { e.preventDefault(); onChange([...values, draft.trim()]); setDraft(""); } if (e.key === "Backspace" && !draft && values.length) onChange(values.slice(0, -1)); }} />
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ choices */
export function Checkbox({ checked, onChange, label, description, disabled, hue }: { checked: boolean | "mixed"; onChange: (v: boolean) => void; label?: React.ReactNode; description?: string; disabled?: boolean; hue?: PortHue }) {
  const toggle = () => !disabled && onChange(checked !== true);
  return (
    <span className={cx("ck", hueCls(hue))} role="checkbox" tabIndex={disabled ? -1 : 0} aria-checked={checked === "mixed" ? "mixed" : checked} aria-disabled={disabled || undefined}
      onClick={toggle} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); } }}>
      <span className="bx"><Icon name={checked === "mixed" ? "minus" : "check"} /></span>
      {label !== undefined && <span>{label}{description && <span className="sub">{description}</span>}</span>}
    </span>
  );
}
export function RadioGroup<T extends string>({ value, onChange, options, label, hue }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string; description?: string; disabled?: boolean }>; label: string; hue?: PortHue }) {
  const refs = React.useRef<Array<HTMLSpanElement | null>>([]);
  const move = (i: number, d: number) => { const n = (i + d + options.length) % options.length; refs.current[n]?.focus(); onChange(options[n].value); };
  return (
    <div role="radiogroup" aria-label={label} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {options.map((o, i) => (
        <span key={o.value} ref={(el) => { refs.current[i] = el; }} className={cx("ck radio", hueCls(hue))} role="radio" aria-checked={value === o.value} aria-disabled={o.disabled || undefined}
          tabIndex={value === o.value ? 0 : -1} onClick={() => !o.disabled && onChange(o.value)}
          onKeyDown={(e) => { if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); move(i, 1); } if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); move(i, -1); } if (e.key === " ") { e.preventDefault(); onChange(o.value); } }}>
          <span className="bx" /><span>{o.label}{o.description && <span className="sub">{o.description}</span>}</span>
        </span>
      ))}
    </div>
  );
}
export function Switch({ checked, onChange, label, hue = "brand" }: { checked: boolean; onChange: (v: boolean) => void; label: string; hue?: PortHue }) {
  return <span className={cx("toggle", hueCls(hue), checked && "on")} role="switch" aria-checked={checked} aria-label={label} tabIndex={0}
    onClick={() => onChange(!checked)} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onChange(!checked); } }} />;
}
export function Slider({ value, onChange, min = 0, max = 100, step = 1, ticks, label, format = String, hue }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; ticks?: number[]; label: string; format?: (v: number) => string; hue?: PortHue }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const clamp = (v: number) => Math.max(min, Math.min(max, Math.round(v / step) * step));
  const at = (x: number) => { const r = ref.current!.getBoundingClientRect(); onChange(clamp(min + ((x - r.left) / r.width) * (max - min))); };
  const pc = ((value - min) / (max - min)) * 100;
  return (
    <div ref={ref} className={cx("slider", hueCls(hue))} role="slider" tabIndex={0} aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} aria-valuetext={format(value)}
      onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); at(e.clientX); }}
      onPointerMove={(e) => { if (e.buttons) at(e.clientX); }}
      onKeyDown={(e) => { if (["ArrowRight", "ArrowUp"].includes(e.key)) { e.preventDefault(); onChange(clamp(value + step)); } if (["ArrowLeft", "ArrowDown"].includes(e.key)) { e.preventDefault(); onChange(clamp(value - step)); } if (e.key === "Home") onChange(min); if (e.key === "End") onChange(max); }}>
      <span className="tr" /><span className="fill" style={{ width: `${pc}%` }} /><span className="th" style={{ left: `${pc}%` }} />
      {ticks?.map((t) => <span key={t} className="tick" style={{ left: `${((t - min) / (max - min)) * 100}%` }}>{t}</span>)}
    </div>
  );
}
export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string; icon?: PortIcon }>; label: string }) {
  const ref = React.useRef<HTMLDivElement>(null); const [thumb, setThumb] = React.useState<{ x: number; w: number }>({ x: 0, w: 0 });
  useIsoLayoutEffect(() => {
    const el = ref.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]');
    if (el) setThumb({ x: el.offsetLeft, w: el.offsetWidth });
  }, [value, options.length]);
  return (
    <div ref={ref} className="seg" role="radiogroup" aria-label={label}>
      <span className="thumb" style={{ width: thumb.w, transform: `translateX(${thumb.x}px)` }} />
      {options.map((o) => <button key={o.value} type="button" role="radio" aria-checked={o.value === value} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>{o.icon && <Icon name={o.icon} size="sm" />}{o.label}</button>)}
    </div>
  );
}
export function Swatches({ value, onChange, hues, label }: { value: PortHue; onChange: (h: PortHue) => void; hues: PortHue[]; label: string }) {
  return <div className="swatches" role="radiogroup" aria-label={label}>{hues.map((h) => <span key={h} className={cx("sw", hueCls(h))} role="radio" aria-label={h} aria-checked={h === value} tabIndex={h === value ? 0 : -1} onClick={() => onChange(h)} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onChange(h); } }}><Icon name="check" /></span>)}</div>;
}

/* ------------------------------------------------------------------ menus & select */
function useOutside(ref: React.RefObject<HTMLElement>, on: boolean, close: () => void) {
  React.useEffect(() => {
    if (!on) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [on, close, ref]);
}
export interface MenuItemDef { id: string; label: React.ReactNode; icon?: PortIcon; shortcut?: string; danger?: boolean; disabled?: boolean; onSelect?: () => void; children?: MenuItemDef[] }
export type MenuEntry = MenuItemDef | "separator" | { section: string };
/** Keyboard-driven menu: ↑/↓ move, Enter picks, → opens a submenu, Esc closes. */
export function Menu({ items, onClose, style }: { items: MenuEntry[]; onClose?: () => void; style?: React.CSSProperties }) {
  const ref = React.useRef<HTMLDivElement>(null); const [hi, setHi] = React.useState(-1);
  const flat = items.map((it, i) => ({ it, i })).filter((x) => typeof x.it === "object" && "id" in x.it && !x.it.disabled);
  React.useEffect(() => { ref.current?.focus(); }, []);
  const pick = (it: MenuItemDef) => { if (it.disabled || it.children) return; it.onSelect?.(); onClose?.(); };
  return (
    <div ref={ref} className="menu" role="menu" tabIndex={-1} style={style}
      onKeyDown={(e) => {
        const pos = flat.findIndex((f) => f.i === hi);
        if (e.key === "ArrowDown") { e.preventDefault(); setHi(flat[(pos + 1) % flat.length]?.i ?? -1); }
        if (e.key === "ArrowUp") { e.preventDefault(); setHi(flat[(pos - 1 + flat.length) % flat.length]?.i ?? -1); }
        if (e.key === "Enter" && hi >= 0) { e.preventDefault(); pick(items[hi] as MenuItemDef); }
        if (e.key === "Escape") { e.preventDefault(); onClose?.(); }
      }}>
      {items.map((it, i) => {
        if (it === "separator") return <div key={i} className="msep" role="separator" />;
        if ("section" in it) return <div key={i} className="mlab">{it.section}</div>;
        return (
          <div key={it.id} role="menuitem" aria-disabled={it.disabled || undefined} aria-haspopup={it.children ? "menu" : undefined} className={cx("mi", it.danger && "danger", hi === i && "is-hi")} onMouseEnter={() => setHi(i)} onClick={() => pick(it)}>
            {it.icon ? <Icon name={it.icon} size="sm" /> : <span style={{ width: 14 }} />}
            <span className="grow">{it.label}</span>
            {it.shortcut && <span className="sc"><Kbd keys={it.shortcut} /></span>}
            {it.children && <><Icon name="chevR" size="sm" /><div className="menu submenu" role="menu">{it.children.map((c) => <div key={c.id} role="menuitem" className="mi" onClick={(e) => { e.stopPropagation(); pick(c); }}>{c.icon ? <Icon name={c.icon} size="sm" /> : <span style={{ width: 14 }} />}<span className="grow">{c.label}</span></div>)}</div></>}
          </div>
        );
      })}
    </div>
  );
}
export interface SelectOption<T extends string> { value: T; label: string; lead?: React.ReactNode; disabled?: boolean }
export function Select<T extends string>({ value, onChange, options, label, width = 200 }: { value: T; onChange: (v: T) => void; options: Array<SelectOption<T>>; label?: string; width?: number | string }) {
  const [open, setOpen] = React.useState(false); const [hi, setHi] = React.useState(0);
  const wrap = React.useRef<HTMLDivElement>(null); const btn = React.useRef<HTMLDivElement>(null); const id = React.useId();
  const cur = options.find((o) => o.value === value) ?? options[0];
  const close = React.useCallback(() => setOpen(false), []);
  useOutside(wrap, open, close);
  const choose = (o: SelectOption<T>) => { if (o.disabled) return; onChange(o.value); setOpen(false); btn.current?.focus(); };
  return (
    <div className="tf">
      {label && <span className="tf-l" id={`${id}-l`}>{label}</span>}
      <div className="dd" ref={wrap}>
        <div ref={btn} className="box sel" role="combobox" tabIndex={0} aria-haspopup="listbox" aria-expanded={open} aria-labelledby={label ? `${id}-l` : undefined} aria-controls={`${id}-lb`} style={{ minWidth: width }}
          onClick={() => { setOpen(!open); setHi(Math.max(0, options.indexOf(cur))); }}
          onKeyDown={(e) => {
            if (!open && ["ArrowDown", "Enter", " "].includes(e.key)) { e.preventDefault(); setOpen(true); setHi(Math.max(0, options.indexOf(cur))); return; }
            if (!open) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setHi((hi + 1) % options.length); }
            if (e.key === "ArrowUp") { e.preventDefault(); setHi((hi - 1 + options.length) % options.length); }
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(options[hi]); }
            if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
          }}>
          <span className="val">{cur.lead}{cur.label}</span><Icon name="chevD" size="sm" className="chev2" />
        </div>
        {open && (
          <div className="menu" role="listbox" id={`${id}-lb`}>
            {options.map((o, i) => (
              <div key={o.value} role="option" aria-selected={o.value === value} aria-disabled={o.disabled || undefined} className={cx("mi", i === hi && "is-hi")} onMouseEnter={() => setHi(i)} onClick={() => choose(o)}>
                {o.lead}<span className="grow">{o.label}</span><Icon name="check" size="sm" className="chkm" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
/** Right-click anywhere inside children to open a Port menu at the pointer. */
export function ContextMenu({ items, children }: { items: MenuEntry[]; children: React.ReactNode }) {
  const [at, setAt] = React.useState<{ x: number; y: number } | null>(null); const ref = React.useRef<HTMLDivElement>(null);
  const close = React.useCallback(() => setAt(null), []); useOutside(ref, !!at, close);
  return (
    <div ref={ref} style={{ position: "relative" }} onContextMenu={(e) => { e.preventDefault(); const r = ref.current!.getBoundingClientRect(); setAt({ x: e.clientX - r.left, y: e.clientY - r.top }); }}>
      {children}
      {at && <div style={{ position: "absolute", left: at.x, top: at.y, zIndex: 60 }}><Menu items={items} onClose={close} /></div>}
    </div>
  );
}

/* ------------------------------------------------------------------ overlays */
export function Tooltip({ content, shortcut, children }: { content: string; shortcut?: string; children: React.ReactElement }) {
  const id = React.useId();
  return <span className="tipwrap">{React.cloneElement(children, { "aria-describedby": id } as Record<string, string>)}<span className="tip" role="tooltip" id={id}>{content}{shortcut && <Kbd keys={shortcut} />}</span></span>;
}
export function Popover({ open, onOpenChange, trigger, children, width = 280 }: { open: boolean; onOpenChange: (o: boolean) => void; trigger: React.ReactElement; children: React.ReactNode; width?: number }) {
  const ref = React.useRef<HTMLDivElement>(null); const close = React.useCallback(() => onOpenChange(false), [onOpenChange]); useOutside(ref, open, close);
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }} onKeyDown={(e) => { if (e.key === "Escape") close(); }}>
      {React.cloneElement(trigger, { onClick: () => onOpenChange(!open), "aria-expanded": open } as Record<string, unknown>)}
      {open && <div className="pop" role="dialog" style={{ top: "calc(100% + 10px)", left: 0, width }}>{children}</div>}
    </div>
  );
}
function useFocusTrap(ref: React.RefObject<HTMLElement>, active: boolean, onEscape: () => void) {
  React.useEffect(() => {
    if (!active || !ref.current) return;
    const prev = document.activeElement as HTMLElement | null; const el = ref.current;
    const fs = () => Array.from(el.querySelectorAll<HTMLElement>('input,button,textarea,select,[tabindex]:not([tabindex="-1"]),a[href]')).filter((x) => !x.hasAttribute("disabled"));
    (el.querySelector<HTMLElement>("[autofocus]") ?? fs()[0])?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onEscape(); }
      if (e.key === "Tab") { const f = fs(); if (!f.length) return; const i = f.indexOf(document.activeElement as HTMLElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
    };
    el.addEventListener("keydown", key); return () => { el.removeEventListener("keydown", key); prev?.focus?.(); };
  }, [active, onEscape, ref]);
}
/** Overlays render inside the nearest positioned container (a Window, or your app shell). */
export function Dialog({ open, onClose, title, children, actions, tone, icon, footerNote }: { open: boolean; onClose: () => void; title: string; children?: React.ReactNode; actions?: React.ReactNode; tone?: PortHue; icon?: PortIcon; footerNote?: string }) {
  const ref = React.useRef<HTMLDivElement>(null); const id = React.useId(); useFocusTrap(ref, open, onClose);
  if (!open) return null;
  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className={cx("dlg", hueCls(tone))} role={tone === "coral" ? "alertdialog" : "dialog"} aria-modal="true" aria-labelledby={id}>
        <div className="dlg-b">{icon && <span className="icbox big"><Icon name={icon} /></span>}<div><h3 id={id}>{title}</h3>{children}</div></div>
        {actions && <div className="dlg-f">{footerNote && <span className="meta grow">{footerNote}</span>}{actions}</div>}
      </div>
    </div>
  );
}
export function Sheet({ open, onClose, title, children, footer, hue }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; hue?: PortHue }) {
  const ref = React.useRef<HTMLDivElement>(null); useFocusTrap(ref, open, onClose);
  if (!open) return null;
  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className={cx("sheet", hueCls(hue))} role="dialog" aria-modal="true" aria-label={title}>
        <header className="ph"><span className="ttl">{title}</span><span className="grow" /><IconButton icon="x" label="Close" onClick={onClose} /></header>
        <div className="pb" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
        {footer && <div className="dlg-f">{footer}</div>}
      </div>
    </div>
  );
}
export interface CommandItem { id: string; label: string; group: string; icon: PortIcon; hue?: PortHue; meta?: string; shortcut?: string; onRun: () => void }
/** ⌘K palette: type to filter (matches highlighted), ↑/↓ to move, Enter to run, Esc to close. */
export function CommandPalette({ open, onClose, items, placeholder = "Search Port, run a command, ask an agent…" }: { open: boolean; onClose: () => void; items: CommandItem[]; placeholder?: string }) {
  const [q, setQ] = React.useState(""); const [hi, setHi] = React.useState(0); const ref = React.useRef<HTMLDivElement>(null); useFocusTrap(ref, open, onClose);
  React.useEffect(() => { if (open) { setQ(""); setHi(0); } }, [open]);
  const list = items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase()));
  if (!open) return null;
  const mark = (s: string) => { const i = q ? s.toLowerCase().indexOf(q.toLowerCase()) : -1; return i < 0 ? s : <>{s.slice(0, i)}<mark>{s.slice(i, i + q.length)}</mark>{s.slice(i + q.length)}</>; };
  let last = "";
  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className="cmdk" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="cmdk-in"><Icon name="search" /><input className="inp" autoFocus value={q} placeholder={placeholder} aria-label="Command" role="combobox" aria-expanded="true"
          onChange={(e) => { setQ(e.target.value); setHi(0); }}
          onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setHi((hi + 1) % Math.max(1, list.length)); } if (e.key === "ArrowUp") { e.preventDefault(); setHi((hi - 1 + list.length) % Math.max(1, list.length)); } if (e.key === "Enter" && list[hi]) { e.preventDefault(); list[hi].onRun(); onClose(); } }} />
          <Kbd keys="esc" /></div>
        <div className="cmdk-l" role="listbox">
          {list.length === 0 && <div className="empty"><p>No matches for “{q}”.</p></div>}
          {list.map((it, i) => {
            const head = it.group !== last ? <div className="mlab" key={`g-${it.group}`}>{it.group}</div> : null; last = it.group;
            return (
              <React.Fragment key={it.id}>{head}
                <div role="option" aria-selected={i === hi} className={cx("mi", i === hi && "is-hi")} onMouseEnter={() => setHi(i)} onClick={() => { it.onRun(); onClose(); }}>
                  <span className={cx("icbox", hueCls(it.hue))}><Icon name={it.icon} size="sm" /></span><span className="grow">{mark(it.label)}</span>{it.meta && <span className="meta">{it.meta}</span>}{it.shortcut && <span className="sc"><Kbd keys={it.shortcut} /></span>}
                </div>
              </React.Fragment>
            );
          })}
        </div>
        <div className="cmdk-f"><span><Kbd keys="↑" /><Kbd keys="↓" />navigate</span><span><Kbd keys="enter" />open</span></div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ feedback */
export const Pill = ({ hue = "brand", icon, solid, outline, children }: { hue?: PortHue; icon?: PortIcon; solid?: boolean; outline?: boolean; children: React.ReactNode }) =>
  <span className={cx("pill", hueCls(hue), solid && "solid", outline && "line")}>{icon && <Icon name={icon} />}{children}</span>;
export const Tag = ({ hue = "brand", children, onRemove }: { hue?: PortHue; children: string; onRemove?: () => void }) =>
  <span className={cx("tag", hueCls(hue))}>{children}{onRemove && <button type="button" aria-label={`Remove ${children}`} onClick={onRemove}><Icon name="x" /></button>}</span>;
export const Count = ({ children }: { children: React.ReactNode }) => <span className="count">{children}</span>;
export function Banner({ hue = "cobalt", icon = "info", title, children, actions }: { hue?: PortHue; icon?: PortIcon; title: string; children?: React.ReactNode; actions?: React.ReactNode }) {
  return <div className={cx("banner", hueCls(hue))} role={hue === "coral" ? "alert" : "status"}><Icon name={icon} /><div><b>{title}</b> {children}</div>{actions && <div className="acts">{actions}</div>}</div>;
}
export function Toast({ hue = "mineral", icon = "check", children, action }: { hue?: PortHue; icon?: PortIcon; children: React.ReactNode; action?: React.ReactNode }) {
  return <div className={cx("toast", hueCls(hue))} role="status"><span className="icbox"><Icon name={icon} size="sm" /></span><span className="grow">{children}</span>{action}</div>;
}
export const Progress = ({ value, hue = "brand", label }: { value?: number; hue?: PortHue; label: string }) =>
  <div className={cx("bar", hueCls(hue), value === undefined && "indet")} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><i style={value !== undefined ? { width: `${value}%` } : undefined} /></div>;
export const Ring = ({ value, label, hue = "brand" }: { value: number; label: string; hue?: PortHue }) =>
  <span className={cx("ring", hueCls(hue))} style={{ ["--p" as string]: value }} data-l={label} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label} />;
export const Spinner = ({ hue = "brand", label = "Loading" }: { hue?: PortHue; label?: string }) => <span className={cx("spinner", hueCls(hue))} role="status" aria-label={label} />;
export const AgentActivity = ({ label = "Agent working" }: { label?: string }) => <span className="weave" role="status" aria-label={label}><i /><i /><i /></span>;
const STATUS_HUE: Record<StatusKind, PortHue> = { todo: "graphite", run: "cobalt", review: "violet", done: "mineral", warn: "amber", error: "coral", blocked: "graphite" };
export const StatusGlyph = ({ kind, progress = 0, label }: { kind: StatusKind; progress?: number; label?: string }) =>
  <span className={cx("sglyph", `s-${kind}`, hueCls(STATUS_HUE[kind]))} style={{ ["--p" as string]: progress }} role="img" aria-label={label ?? kind} />;
export const Skeleton = ({ width = "100%", height = 9 }: { width?: number | string; height?: number }) => <span className="skel" style={{ width, height, display: "block" }} aria-hidden />;
export function EmptyState({ title, children, actions, hue = "brand" }: { title: string; children?: React.ReactNode; actions?: React.ReactNode; hue?: PortHue }) {
  return <div className={cx("empty", hueCls(hue))}><h4>{title}</h4>{children && <p>{children}</p>}{actions && <div className="row-flex" style={{ justifyContent: "center" }}>{actions}</div>}</div>;
}

/* ------------------------------------------------------------------ navigation & lists */
export function Tabs<T extends string>({ value, onChange, tabs, hue }: { value: T; onChange: (v: T) => void; tabs: Array<{ value: T; label: string; icon?: PortIcon; badge?: React.ReactNode }>; hue?: PortHue }) {
  return (
    <div className={cx("tabs", hueCls(hue))} role="tablist">
      {tabs.map((t, i) => (
        <span key={t.value} role="tab" aria-selected={t.value === value} tabIndex={t.value === value ? 0 : -1} className={cx("tab", t.value === value && "is-active")} onClick={() => onChange(t.value)}
          onKeyDown={(e) => { const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0; if (d) { e.preventDefault(); onChange(tabs[(i + d + tabs.length) % tabs.length].value); } }}>
          {t.icon && <Icon name={t.icon} size="sm" />}<span className="tl">{t.label}</span>{t.badge}
        </span>
      ))}
    </div>
  );
}
export const Breadcrumbs = ({ items }: { items: Array<{ label: string; onClick?: () => void }> }) => (
  <nav className="crumbs" aria-label="Breadcrumb">{items.map((c, i) => <React.Fragment key={i}>{i > 0 && <Icon name="chevR" />}<a onClick={c.onClick} aria-current={i === items.length - 1 ? "page" : undefined} tabIndex={0}>{c.label}</a></React.Fragment>)}</nav>
);
export const Steps = ({ steps, current }: { steps: string[]; current: number }) => (
  <ol className="steps" style={{ listStyle: "none", margin: 0, padding: 0 }}>
    {steps.map((s, i) => <React.Fragment key={s}>{i > 0 && <span className={cx("stp-c", i <= current && "done")} aria-hidden />}<li className={cx("stp", i < current && "done", i === current && "cur")} aria-current={i === current ? "step" : undefined}><span className="n">{i < current ? <Icon name="check" size="sm" /> : i + 1}</span>{s}</li></React.Fragment>)}
  </ol>
);
export interface RowProps { label: React.ReactNode; lead?: React.ReactNode; trail?: React.ReactNode; hue?: PortHue; selected?: boolean; active?: boolean; running?: boolean; disabled?: boolean; blocked?: boolean; error?: boolean; onSelect?: (e: React.MouseEvent | React.KeyboardEvent) => void; nested?: boolean }
/** List/tree row. selected = wash (+ rail); active = raised + border + 600; running = moving conveyor; focus = ring. */
export function Row({ label, lead, trail, hue, selected, active, running, disabled, blocked, error, onSelect, nested }: RowProps) {
  return (
    <div role="treeitem" aria-selected={!!selected} aria-disabled={disabled || undefined} tabIndex={disabled ? -1 : 0}
      className={cx("row", hueCls(hue), selected && "is-selected", active && "is-active", running && "is-running", disabled && "is-disabled", blocked && "is-blocked", error && "is-error")}
      onClick={(e) => !disabled && onSelect?.(e)} onKeyDown={(e) => { if (!disabled && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onSelect?.(e); } }}>
      {nested && <i className="elb" />}{lead}<span className="lbl">{label}</span>{trail}
    </div>
  );
}
export const Children = ({ children }: { children: React.ReactNode }) => <div className="kids" role="group">{children}</div>;
export function Group({ title, hue = "brand", count, children, defaultOpen = true, open: o, onOpenChange }: { title: string; hue?: PortHue; count?: number; children: React.ReactNode; defaultOpen?: boolean; open?: boolean; onOpenChange?: (o: boolean) => void }) {
  const [inner, setInner] = React.useState(defaultOpen); const open = o ?? inner; const set = (v: boolean) => { setInner(v); onOpenChange?.(v); };
  return (
    <div className={cx("grp", hueCls(hue), !open && "is-collapsed")}>
      <div className="grp-h" role="button" tabIndex={0} aria-expanded={open} onClick={() => set(!open)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); set(!open); } if (e.key === "ArrowLeft" && open) set(false); if (e.key === "ArrowRight" && !open) set(true); }}>
        <Icon name="chevD" size="sm" className="chev" /><span className="grow trunc">{title}</span>{count !== undefined && <Count>{count}</Count>}
      </div>
      <div className="grp-b"><div className="grp-in" role="group">{children}</div></div>
    </div>
  );
}
export function Panel({ title, hue, tools, children, flush, style }: { title?: string; hue?: PortHue; tools?: React.ReactNode; children: React.ReactNode; flush?: boolean; style?: React.CSSProperties }) {
  return <section className={cx("panel", hueCls(hue))} style={style}>{title !== undefined && <header className="ph"><span className="ttl">{title}</span><span className="grow" />{tools}</header>}<div className={cx("pb", flush && "flush")}>{children}</div></section>;
}
export const SettingsSection = ({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) =>
  <section className="setsec"><header><h3>{title}</h3>{description && <p>{description}</p>}</header><div className="setcard">{children}</div></section>;
export const SettingsRow = ({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) =>
  <div className="setrow"><div><div className="sl">{label}</div>{description && <div className="sd">{description}</div>}</div><div className="sc2">{children}</div></div>;

/* ------------------------------------------------------------------ data table with smart grouping */
export interface Column<R> { key: string; header: string; width?: number | string; sortable?: boolean; value?: (r: R) => string | number; render?: (r: R) => React.ReactNode; mono?: boolean; numeric?: boolean }
export interface DataTableProps<R> {
  rows: R[]; columns: Array<Column<R>>; rowKey: (r: R) => string;
  /** Group rows into collapsible sections with counts. */
  groupBy?: (r: R) => string; groupOrder?: string[]; groupLead?: (group: string) => React.ReactNode; groupHue?: (group: string) => PortHue;
  selectable?: boolean; selected?: string[]; onSelectedChange?: (ids: string[]) => void; rowActions?: (r: R) => React.ReactNode; maxHeight?: number;
}
export function DataTable<R>({ rows, columns, rowKey, groupBy, groupOrder, groupLead, groupHue, selectable, selected = [], onSelectedChange, rowActions, maxHeight = 420 }: DataTableProps<R>) {
  const [sort, setSort] = React.useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const col = sort && columns.find((c) => c.key === sort.key);
  const sorted = React.useMemo(() => {
    if (!col || !sort) return rows;
    const v = col.value ?? ((r: R) => String((r as Record<string, unknown>)[col.key] ?? ""));
    return [...rows].sort((a, b) => { const x = v(a), y = v(b); return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * sort.dir; });
  }, [rows, col, sort]);
  const groups = React.useMemo(() => {
    if (!groupBy) return [["", sorted] as [string, R[]]];
    const m = new Map<string, R[]>(); for (const r of sorted) { const g = groupBy(r); m.set(g, [...(m.get(g) ?? []), r]); }
    const keys = groupOrder ? [...groupOrder.filter((g) => m.has(g)), ...[...m.keys()].filter((g) => !groupOrder.includes(g))] : [...m.keys()];
    return keys.map((k) => [k, m.get(k)!] as [string, R[]]);
  }, [sorted, groupBy, groupOrder]);
  const all = rows.map(rowKey); const allState: boolean | "mixed" = selected.length === 0 ? false : selected.length === all.length ? true : "mixed";
  const toggle = (id: string, on: boolean) => onSelectedChange?.(on ? [...selected, id] : selected.filter((x) => x !== id));
  const span = columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0);
  return (
    <div style={{ borderRadius: 12, boxShadow: "inset 0 0 0 1px var(--line)", overflow: "auto", maxHeight }}>
      <table className="grid">
        <thead><tr>
          {selectable && <th className="chkc"><Checkbox checked={allState} onChange={(on) => onSelectedChange?.(on ? all : [])} label={undefined} /></th>}
          {columns.map((c) => <th key={c.key} style={{ width: c.width }} data-sort={c.sortable ? "" : undefined} aria-sort={sort?.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}
            onClick={c.sortable ? () => setSort((s) => (s?.key === c.key ? { key: c.key, dir: (s.dir * -1) as 1 | -1 } : { key: c.key, dir: 1 })) : undefined}>{c.header}</th>)}
          {rowActions && <th style={{ width: 70 }} aria-label="Actions" />}
        </tr></thead>
        <tbody>
          {groups.map(([g, rs]) => (
            <React.Fragment key={g}>
              {groupBy && <tr className={cx("tgrp", hueCls(groupHue?.(g)), collapsed[g] && "is-collapsed")} onClick={() => setCollapsed((c) => ({ ...c, [g]: !c[g] }))}>
                <td colSpan={span}><span className="row-flex"><Icon name="chevD" size="sm" className="chev" />{groupLead?.(g)}{g}<Count>{rs.length}</Count></span></td></tr>}
              {!collapsed[g] && rs.map((r) => {
                const id = rowKey(r); const on = selected.includes(id);
                return (
                  <tr key={id} tabIndex={0} className={cx(on && "is-selected")} aria-selected={on}>
                    {selectable && <td className="chkc"><Checkbox checked={on} onChange={(v) => toggle(id, v)} /></td>}
                    {columns.map((c) => <td key={c.key} className={cx(c.mono && "mono faint", c.numeric && "num")}>{c.render ? c.render(r) : String((c.value ?? ((x: R) => (x as Record<string, unknown>)[c.key] as string))(r) ?? "")}</td>)}
                    {rowActions && <td><span className="ra">{rowActions(r)}</span></td>}
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ data display */
export const Avatar = ({ initials, hue, presence, size }: { initials: string; hue?: PortHue; presence?: boolean; size?: "lg" }) =>
  <span className={cx("avatar", presence && "presence", size)} style={hue ? { background: `var(--${hue}-tint)`, color: `var(--${hue}-ink)` } : undefined} aria-label={initials}>{initials}</span>;
export const AvatarGroup = ({ children }: { children: React.ReactNode }) => <div className="avg">{children}</div>;
export const KeyValue = ({ items }: { items: Array<[string, React.ReactNode]> }) => <dl className="kv">{items.map(([k, v]) => <React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}</dl>;
export function DropZone({ onFiles, children = "Drop files here" }: { onFiles: (f: FileList) => void; children?: React.ReactNode }) {
  const [over, setOver] = React.useState(false);
  return <div className={cx("drop", over && "is-over")} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); onFiles(e.dataTransfer.files); }}><Icon name="upload" /><span>{children}</span></div>;
}

/* ------------------------------------------------------------------ window chrome */
export interface WindowProps { app: string; appIcon: PortIcon; hue?: PortHue; titleExtras?: React.ReactNode; children: React.ReactNode; status?: React.ReactNode; onMinimize?: () => void; onMaximize?: () => void; onClose?: () => void; style?: React.CSSProperties }
/** Frameless app window. macOS leaves room for native traffic lights; Windows/Linux get Port's controls. */
export function Window({ app, appIcon, hue = "brand", titleExtras, children, status, onMinimize, onMaximize, onClose, style }: WindowProps) {
  const p = usePortPlatform();
  return (
    <div className={cx("win", hueCls(hue))} style={style}>
      <header className="tb">
        <div className="tb-key"><Icon name={appIcon} /><span className="app-name">{app}</span></div>
        {titleExtras}
        {p !== "mac" && <div className="wctl"><button aria-label="Minimise" onClick={onMinimize}><Icon name="min" /></button><button aria-label="Maximise" onClick={onMaximize}><Icon name="max" /></button><button className="cls" aria-label="Close" onClick={onClose}><Icon name="x" /></button></div>}
      </header>
      <div className="wb">{children}</div>
      {status && <footer className="sb">{status}</footer>}
    </div>
  );
}
