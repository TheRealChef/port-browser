import { Bookmark, Clock, Layers, Link2, type Icon } from '../icons';
import type { CardVariant } from '../common/Card';
import type { WidgetKind } from '../../types/models';

/**
 * Widgets are neutral Port tiles; the group launcher is the dashboard's
 * headline cell and takes the space hue.
 */
export const WIDGET_META: Record<
  WidgetKind,
  { label: string; icon: Icon; description: string; space?: boolean; variant: CardVariant }
> = {
  bookmarks: {
    label: 'Bookmarks',
    icon: Bookmark,
    description: 'Saved sites in this space',
    variant: 'neutral',
  },
  quickLinks: {
    label: 'Quick links',
    icon: Link2,
    description: 'Your own list of shortcuts',
    variant: 'neutral',
  },
  recentTabs: {
    label: 'Recent tabs',
    icon: Clock,
    description: 'Recently opened tabs',
    variant: 'neutral',
  },
  groupLauncher: {
    label: 'Group launcher',
    icon: Layers,
    description: 'Jump into a tab group',
    space: true,
    variant: 'accent',
  },
};
