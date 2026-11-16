/*! @port/ui — type definitions */
export type PortTheme = "system" | "light" | "dark";
export type PortPreset = "stone" | "dusk" | "signal" | "pigment" | "contrast";
export type PortPlatform = "mac" | "win" | "linux";
export type PortHue = "brand" | "mineral" | "clay" | "cobalt" | "violet" | "teal" | "amber" | "coral" | "lichen" | "heather" | "graphite";
export type PortIcon =
  | "back" | "fwd" | "reload" | "plus" | "search" | "branch" | "commit" | "merge" | "folder" | "file" | "term" | "spark" | "plug" | "grid" | "gear"
  | "check" | "x" | "alert" | "info" | "play" | "pause" | "stop" | "lock" | "globe" | "layers" | "chevR" | "chevD" | "split" | "link" | "clock" | "cpu"
  | "pin" | "more" | "star" | "book" | "sync" | "eye" | "hub" | "reader" | "share" | "tag" | "stash" | "shield" | "db" | "keyboard" | "drag" | "dock"
  | "bell" | "activity" | "minus" | "sort" | "min" | "max" | "upload" | "filter" | "calendar";
export type StatusKind = "todo" | "run" | "review" | "done" | "warn" | "error" | "blocked";

export interface PortOptions {
  /** "system" follows the OS and updates live. Default "system". */
  theme?: PortTheme;
  /** Curated preset. Omit for the default (Stone & Slate). */
  palette?: PortPreset;
  density?: "compact" | "cozy";
  motion?: "full" | "reduced";
  /** Detected from the user agent when omitted. */
  platform?: PortPlatform;
}
export interface ToastOptions { text: string; hue?: PortHue; icon?: PortIcon; sticky?: boolean; duration?: number }
export interface OpenOptions { transparent?: boolean; onClose?: () => void }

/** Configure a .port root and wire every component inside it (delegated; safe to call once). */
export function init(root?: HTMLElement, options?: PortOptions): HTMLElement;
/** Change theme/preset/density/motion/platform on an existing root. */
export function configure(root: HTMLElement, options?: PortOptions): HTMLElement;
/** Attach behaviour only (no attribute changes). Idempotent. */
export function wire(root: HTMLElement): void;
/** Inline SVG markup for a Port icon. */
export function icon(name: PortIcon, className?: string): string;
/** Render a shortcut ("mod+shift+k") for a platform: ⌘⇧K on mac, Ctrl+Shift+K elsewhere. */
export function keys(combo: string, platform?: PortPlatform): string;
export function applyKeys(root: HTMLElement, platform: PortPlatform): void;
export function detectPlatform(): PortPlatform;
/** Markup for a ring status glyph; pct (0–100) fills "run" and "review". */
export function sglyph(kind: StatusKind, pct?: number): string;
/** Open HTML, an element, or a "#template-id" as an overlay (dialog, sheet, command palette) inside the nearest .win or .port. Focus is trapped; Esc closes. */
export function open(target: Element, content: string | Node, options?: OpenOptions): HTMLElement | null;
export function close(scrim: HTMLElement): void;
export function toast(target: Element, options: ToastOptions): HTMLElement;
export function sortTable(th: HTMLTableCellElement): void;
export function sliderSet(slider: HTMLElement, value: number): void;
/** Button feedback: data-fx="save" shows loading → done; "deny"/"error" shakes. */
export function feedback(button: HTMLElement): void;
/** Markup for Port's Windows/Linux window controls. */
export function windowControls(): string;
export const version: string;
declare const Port: {
  version: string; init: typeof init; configure: typeof configure; wire: typeof wire; icon: typeof icon; iconPaths: Record<PortIcon, string>;
  keys: typeof keys; applyKeys: typeof applyKeys; detectPlatform: typeof detectPlatform; sglyph: typeof sglyph; setThumb(seg: HTMLElement): void;
  sliderSet: typeof sliderSet; sortTable: typeof sortTable; open: typeof open; close: typeof close; toast: typeof toast; feedback: typeof feedback; windowControls: typeof windowControls;
};
export default Port;
