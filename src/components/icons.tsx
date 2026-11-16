/**
 * Port's icon set. Glyphs come from Port UI (16px grid, 1.6 stroke, round caps
 * and joins). The few a browser needs that Port UI doesn't ship are drawn here
 * in the same style. Space icons that only decorate (film, coffee, rocket …)
 * still come from lucide, rendered at the same optical stroke.
 *
 * Every icon takes `size` (px), `className`, `fill` and `strokeWidth`
 * (in 16-unit grid terms), so components can accept any of them as `Icon`.
 */
import {
  forwardRef,
  type ForwardRefExoticComponent,
  type RefAttributes,
  type SVGProps,
} from 'react';
import { iconPaths } from '@port/ui/icons';
import * as Lucide from 'lucide-react';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  size?: number;
  strokeWidth?: number;
}

export type Icon = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

/** Glyphs Port UI doesn't include, drawn on its grid. */
const EXTRA: Record<string, string> = {
  download: 'M8 2.5v8M5 7.5l3 3 3-3M3 10v3.5h10V10',
  trash: 'M2.5 4.25h11M6.25 4.25V2.5h3.5v1.75M4 4.25l.6 9.25h6.8l.6-9.25M6.75 7v4M9.25 7v4',
  pencil: 'M10.5 2.5l3 3-8 8H2.5v-3ZM9 4l3 3',
  copy: 'M5.5 5.5h8v8h-8ZM10.5 5.5V2.5h-8v8h3',
  volume: 'M2.5 6h2.5l3.5-3v10L5 10H2.5ZM11 5.5a3.5 3.5 0 0 1 0 5M12.75 3.75a6 6 0 0 1 0 8.5',
  volumeOff: 'M2.5 6h2.5l3.5-3v10L5 10H2.5ZM11 6l3.5 4M14.5 6 11 10',
  skipBack: 'M4 3v10M12.5 3.5v9L6 8Z',
  skipFwd: 'M12 3v10M3.5 3.5v9L10 8Z',
  sidebar: 'M2 3h12v10H2ZM6 3v10',
  history: 'M2.5 8a5.5 5.5 0 1 0 1.6-3.9M2.25 2.5v2.25H4.5M8 5v3.25l2.25 1.5',
  external: 'M9 2.5h4.5V7M13.5 2.5 7.5 8.5M11.5 9.5v4h-9v-9h4',
  checkCircle: 'M8 14.25A6.25 6.25 0 1 0 8 1.75a6.25 6.25 0 0 0 0 12.5ZM5.25 8.25l1.9 1.9 3.6-4',
  alertCircle: 'M8 14.25A6.25 6.25 0 1 0 8 1.75a6.25 6.25 0 0 0 0 12.5ZM8 4.75v4M8 11v.25',
  bookmark: 'M4 2h8v12l-4-3-4 3Z',
  compass:
    'M8 14.25A6.25 6.25 0 1 0 8 1.75a6.25 6.25 0 0 0 0 12.5ZM10.5 5.5 9.25 9.25 5.5 10.5l1.25-3.75Z',
  home: 'M2.5 7.25 8 2.5l5.5 4.75v6.25H9.75V10h-3.5v3.5H2.5Z',
  enter: 'M13 3v5.5H3.5M6.5 5.5l-3 3 3 3',
  repeat: 'M3 7V5.5h9.5M10.5 3.5l2 2-2 2M13 9v1.5H3.5M5.5 12.5l-2-2 2-2',
  dashboard: 'M2.5 2.5h5v6h-5ZM9.5 2.5h4v3.5h-4ZM9.5 8h4v5.5h-4ZM2.5 10.5h5v3h-5Z',
  list: 'M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01',
  tree: 'M2.5 3h5M5 3v9.5h3.5M5 7.75h3.5M10.5 7.75h3M10.5 12.5h3',
  folderOpen: 'M2 12V4.5C2 3.7 2.7 3 3.5 3h3L8 4.5h4c.8 0 1.5.7 1.5 1.5v1M2 12l1.75-4.5h11L13 12Z',
  folderPlus:
    'M2 4.5c0-.8.7-1.5 1.5-1.5h3l1.5 1.5h4.5c.8 0 1.5.7 1.5 1.5v5.5c0 .8-.7 1.5-1.5 1.5h-9c-.8 0-1.5-.7-1.5-1.5ZM8 6.75v4M6 8.75h4',
  folderMove:
    'M2 4.5c0-.8.7-1.5 1.5-1.5h3l1.5 1.5h4.5c.8 0 1.5.7 1.5 1.5v5.5c0 .8-.7 1.5-1.5 1.5h-9c-.8 0-1.5-.7-1.5-1.5ZM6 8.75h4M8.5 7l1.5 1.75-1.5 1.75',
  folderMinus:
    'M2 4.5c0-.8.7-1.5 1.5-1.5h3l1.5 1.5h4.5c.8 0 1.5.7 1.5 1.5v5.5c0 .8-.7 1.5-1.5 1.5h-9c-.8 0-1.5-.7-1.5-1.5ZM6 8.75h4',
  tabPlus: 'M2.5 2.5h11v11h-11ZM8 5.5v5M5.5 8h5',
  unpin:
    'M10 1.75 14.25 6l-2.5.75L9 9.5l.5 3-1.25 1.25L2.25 7.75 3.5 6.5l3 .5 2.75-2.75ZM2 2l12 12',
  ban: 'M8 14.25A6.25 6.25 0 1 0 8 1.75a6.25 6.25 0 0 0 0 12.5ZM3.6 3.6l8.8 8.8',
  undo: 'M3 8a5 5 0 1 0 1.5-3.5M3 2.5V5h2.5',
  lightbulb:
    'M6 12.25h4M6.75 14.25h2.5M5.75 10.5C4.5 9.6 3.75 8.3 3.75 6.75a4.25 4.25 0 0 1 8.5 0c0 1.55-.75 2.85-2 3.75Z',
  command:
    'M6 6V4.25A1.75 1.75 0 1 0 4.25 6H6Zm0 0h4m-4 0v4m4-4V4.25A1.75 1.75 0 1 1 11.75 6H10Zm0 0v4m0 0h1.75A1.75 1.75 0 1 1 10 11.75V10Zm0 0H6m0 0v1.75A1.75 1.75 0 1 1 4.25 10H6Z',
};

function make(name: string, d: string): Icon {
  const C = forwardRef<SVGSVGElement, IconProps>(function PortIcon(
    { size = 16, strokeWidth = 1.6, className, fill = 'none', ...rest },
    ref,
  ) {
    return (
      <svg
        ref={ref}
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        focusable="false"
        className={className ? `ic-${name} ${className}` : `ic-${name}`}
        {...rest}
      >
        <path d={d} />
      </svg>
    );
  });
  C.displayName = `Icon(${name})`;
  return C;
}

function port(name: string): Icon {
  const d = iconPaths[name] ?? EXTRA[name];
  if (!d) throw new Error(`Unknown Port icon: ${name}`);
  return make(name, d);
}

/** A lucide glyph at Port's optical weight (1.6 on a 16 grid at any size). */
function soft(L: Lucide.LucideIcon): Icon {
  const C = forwardRef<SVGSVGElement, IconProps>(function SoftIcon(
    { size = 16, strokeWidth = 1.6, ...rest },
    ref,
  ) {
    return (
      <L
        ref={ref}
        size={size}
        absoluteStrokeWidth
        strokeWidth={(strokeWidth * size) / 16}
        {...(rest as Lucide.LucideProps)}
      />
    );
  });
  C.displayName = `Icon(${L.displayName ?? 'lucide'})`;
  return C;
}

// Navigation and chrome
export const ArrowLeft = port('back');
export const ArrowRight = port('fwd');
export const ChevronDown = port('chevD');
export const ChevronRight = port('chevR');
export const RotateCw = port('reload');
export const RotateCcw = port('undo');
export const Search = port('search');
export const Settings = port('gear');
export const Plus = port('plus');
export const X = port('x');
export const Check = port('check');
export const MoreHorizontal = port('more');
export const GripVertical = port('drag');
export const PanelLeft = port('sidebar');
export const PanelLeftClose = port('sidebar');
export const PanelLeftOpen = port('sidebar');
export const Columns2 = port('split');
export const Command = port('command');
export const CornerDownLeft = port('enter');
export const ExternalLink = port('external');
export const SquareArrowOutUpRight = port('external');
export const SquarePlus = port('tabPlus');
export const Lock = port('lock');
export const Globe = port('globe');
export const Compass = port('compass');
export const House = port('home');
export const History = port('history');
export const Clock = port('clock');

// Content
export const Bookmark = port('bookmark');
export const Star = port('star');
export const Library = port('book');
export const BookOpen = port('book');
export const File = port('file');
export const Folder = port('folder');
export const FolderOpen = port('folderOpen');
export const FolderPlus = port('folderPlus');
export const FolderInput = port('folderMove');
export const FolderMinus = port('folderMinus');
export const LayoutGrid = port('grid');
export const LayoutDashboard = port('dashboard');
export const List = port('list');
export const ListTree = port('tree');
export const Layers = port('layers');
export const Link2 = port('link');
export const Pin = port('pin');
export const PinOff = port('unpin');
export const Pencil = port('pencil');
export const Copy = port('copy');
export const Trash2 = port('trash');
export const Download = port('download');
export const Upload = port('upload');
export const Terminal = port('term');
export const Sparkles = port('spark');
export const Lightbulb = port('lightbulb');

// Status
export const Info = port('info');
export const TriangleAlert = port('alert');
export const CircleAlert = port('alertCircle');
export const CircleCheck = port('checkCircle');
export const ShieldAlert = port('shield');
export const Ban = port('ban');

// Media
export const Play = port('play');
export const Pause = port('pause');
export const Square = port('stop');
export const SkipBack = port('skipBack');
export const SkipForward = port('skipFwd');
export const Repeat = port('repeat');
export const Volume2 = port('volume');
export const VolumeX = port('volumeOff');

// Space icons that only decorate: lucide glyphs at Port's weight.
export const AppWindow = soft(Lucide.AppWindow);
export const Briefcase = soft(Lucide.Briefcase);
export const Clapperboard = soft(Lucide.Clapperboard);
export const Code = soft(Lucide.Code);
export const Coffee = soft(Lucide.Coffee);
export const FlaskConical = soft(Lucide.FlaskConical);
export const Gamepad2 = soft(Lucide.Gamepad2);
export const GraduationCap = soft(Lucide.GraduationCap);
export const Heart = soft(Lucide.Heart);
export const Music = soft(Lucide.Music);
export const Newspaper = soft(Lucide.Newspaper);
export const Palette = soft(Lucide.Palette);
export const Plane = soft(Lucide.Plane);
export const Rocket = soft(Lucide.Rocket);
export const Server = soft(Lucide.Server);
export const ShoppingBag = soft(Lucide.ShoppingBag);
export const SquareKanban = soft(Lucide.SquareKanban);
export const Zap = soft(Lucide.Zap);
