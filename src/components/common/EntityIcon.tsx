import { createElement } from 'react';
import type { LucideProps } from 'lucide-react';
import { iconFor } from '../../features/workspace/appearance';

/** Renders a space/group/dashboard icon by its stored name. */
export function EntityIcon({ name, ...props }: { name: string } & LucideProps) {
  return createElement(iconFor(name), props);
}
