import { Bookmark, Clock, Layers, Link2, type LucideIcon } from 'lucide-react';
import type { WidgetKind } from '../../types/models';

export const WIDGET_META: Record<
  WidgetKind,
  { label: string; icon: LucideIcon; description: string }
> = {
  bookmarks: { label: 'Bookmarks', icon: Bookmark, description: 'Saved sites in this space' },
  quickLinks: { label: 'Quick links', icon: Link2, description: 'Your own list of shortcuts' },
  recentTabs: { label: 'Recent tabs', icon: Clock, description: 'Recently opened tabs' },
  groupLauncher: { label: 'Group launcher', icon: Layers, description: 'Jump into a tab group' },
};
