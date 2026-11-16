import {
  AppWindow,
  BookOpen,
  Briefcase,
  Clapperboard,
  Code,
  Coffee,
  Compass,
  FlaskConical,
  Folder,
  Gamepad2,
  Globe,
  GraduationCap,
  Heart,
  House,
  LayoutDashboard,
  Library,
  Music,
  Newspaper,
  Palette,
  Plane,
  Rocket,
  Server,
  ShoppingBag,
  Sparkles,
  SquareKanban,
  Star,
  Terminal,
  Zap,
  type Icon,
} from '../../components/icons';
import type { AccentColor } from '../../types/models';

/** Workspace hues. `hue` is the Port UI class suffix (`h-<hue>`). */
export const ACCENTS: Record<AccentColor, { label: string; value: string }> = {
  brand: { label: 'Port', value: 'var(--brand)' },
  cobalt: { label: 'Cobalt', value: 'var(--cobalt)' },
  teal: { label: 'Teal', value: 'var(--teal)' },
  lichen: { label: 'Lichen', value: 'var(--lichen)' },
  clay: { label: 'Clay', value: 'var(--clay)' },
  heather: { label: 'Heather', value: 'var(--heather)' },
  graphite: { label: 'Graphite', value: 'var(--graphite)' },
};

/** Port UI class that makes an element take a workspace hue (mark, wash, ink). */
export function hueClass(accent: AccentColor): string {
  return `h-${accent}`;
}

export const ICONS: Record<string, Icon> = {
  briefcase: Briefcase,
  home: House,
  book: BookOpen,
  code: Code,
  terminal: Terminal,
  kanban: SquareKanban,
  film: Clapperboard,
  music: Music,
  gamepad: Gamepad2,
  coffee: Coffee,
  globe: Globe,
  star: Star,
  heart: Heart,
  folder: Folder,
  rocket: Rocket,
  palette: Palette,
  education: GraduationCap,
  travel: Plane,
  shopping: ShoppingBag,
  lab: FlaskConical,
  news: Newspaper,
  sparkles: Sparkles,
  dashboard: LayoutDashboard,
  library: Library,
  server: Server,
  compass: Compass,
  window: AppWindow,
  bolt: Zap,
};

export const ICON_NAMES = Object.keys(ICONS);

export function iconFor(name: string): Icon {
  return ICONS[name] ?? Folder;
}

export function accentValue(accent: AccentColor): string {
  return ACCENTS[accent].value;
}

/**
 * Any Port UI hue: a workspace hue, or a signal (mineral = success,
 * amber = warning, coral = error, violet = AI only).
 */
export type Hue = AccentColor | 'mineral' | 'amber' | 'coral' | 'violet';
