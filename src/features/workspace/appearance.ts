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
  violet: { label: 'Violet', value: '#a78bfa' },
  blue: { label: 'Blue', value: '#7aa2f7' },
  teal: { label: 'Teal', value: '#4fd1c5' },
  green: { label: 'Green', value: '#5bc69d' },
  amber: { label: 'Amber', value: '#e6ae68' },
  orange: { label: 'Orange', value: '#f0956a' },
  rose: { label: 'Rose', value: '#f08ba0' },
  slate: { label: 'Slate', value: '#a3a9bd' },
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
