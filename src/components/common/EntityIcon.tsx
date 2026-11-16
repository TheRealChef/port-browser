import { createElement } from 'react';
import { iconFor } from '../../features/workspace/appearance';
import type { IconProps } from '../icons';

/** Renders a space/group/dashboard icon by its stored name. */
export function EntityIcon({ name, ...props }: { name: string } & IconProps) {
  return createElement(iconFor(name), props);
}
