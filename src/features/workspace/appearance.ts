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
  type LucideIcon,
} from 'lucide-react';
import type { AccentColor } from '../../types/models';

export const ACCENTS: Record<AccentColor, { label: string; value: string }> = {
  violet: { label: 'Mauve', value: 'var(--tone-violet)' },
  blue: { label: 'Steel blue', value: 'var(--tone-blue)' },
  teal: { label: 'Teal', value: 'var(--tone-teal)' },
  green: { label: 'Sage', value: 'var(--tone-green)' },
  amber: { label: 'Amber', value: 'var(--tone-amber)' },
  orange: { label: 'Clay', value: 'var(--tone-orange)' },
  rose: { label: 'Rose', value: 'var(--tone-rose)' },
  slate: { label: 'Stone', value: 'var(--tone-slate)' },
};

export const ICONS: Record<string, LucideIcon> = {
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

export function iconFor(name: string): LucideIcon {
  return ICONS[name] ?? Folder;
}

export function accentValue(accent: AccentColor): string {
  return ACCENTS[accent].value;
}
