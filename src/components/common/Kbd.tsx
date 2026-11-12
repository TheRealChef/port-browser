import type { ReactNode } from 'react';

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="tabular rounded-[5px] border border-line bg-canvas/50 px-1 font-sans text-[10.5px] leading-4 text-fg-3">
      {children}
    </kbd>
  );
}
