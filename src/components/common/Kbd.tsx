import type { ReactNode } from 'react';

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line-strong bg-surface px-1 font-sans text-[10.5px] leading-4 text-fg-3">
      {children}
    </kbd>
  );
}
