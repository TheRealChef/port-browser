import { Bookmark, Clock, Layers, Link2, type LucideIcon } from 'lucide-react';
import type { CardVariant } from '../common/Card';
import type { WidgetKind } from '../../types/models';

/**
 * Each widget kind has a semantic tone so a dashboard reads as a set of
 * distinct instruments rather than identical boxes.
 */
export const WIDGET_META: Record<
  WidgetKind,
  { label: string; icon: LucideIcon; description: string; tone: string; variant: CardVariant }
> = {
  bookmarks: {
    label: 'Bookmarks',
    icon: Bookmark,
    description: 'Saved sites in this space',
    tone: 'var(--category)',
    variant: 'neutral',
  },
  quickLinks: {
    label: 'Quick links',
    icon: Link2,
    description: 'Your own list of shortcuts',
    tone: 'var(--hint)',
    variant: 'neutral',
  },
  recentTabs: {
    label: 'Recent tabs',
    icon: Clock,
    description: 'Recently opened tabs',
    tone: 'var(--info)',
    variant: 'neutral',
  },
  groupLauncher: {
    label: 'Group launcher',
    icon: Layers,
    description: 'Jump into a tab group',
    tone: 'var(--accent)',
    variant: 'accent',
  },
};
