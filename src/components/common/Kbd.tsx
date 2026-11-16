import type { ReactNode } from 'react';
import { cn } from '../../utils/misc';

/** Port UI key cap (`.kbd`). `onInk` for use inside tooltips. */
export function Kbd({ children, onInk }: { children: ReactNode; onInk?: boolean }) {
  return (
    <kbd
      className={cn(
        'kbd',
        onInk &&
          'border-[color-mix(in_oklab,var(--surface-1)_40%,transparent)] bg-transparent text-inherit',
      )}
    >
      {children}
    </kbd>
  );
}
