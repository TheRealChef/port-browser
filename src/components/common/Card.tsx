import type { HTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/misc';

interface CardProps {
  title: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  headerProps?: HTMLAttributes<HTMLDivElement>;
}

export function Card({ title, icon: Icon, actions, children, className, headerProps }: CardProps) {
  return (
    <section
      className={cn(
        'flex min-w-0 flex-col rounded-xl border border-line bg-raised/60 shadow-card',
        className,
      )}
    >
      <div
        {...headerProps}
        className={cn('flex h-10 items-center gap-2 pl-3.5 pr-1.5', headerProps?.className)}
      >
        {Icon && <Icon size={14} className="text-fg-3" strokeWidth={2} />}
        <h2 className="flex-1 truncate text-[12px] font-semibold uppercase tracking-[0.06em] text-fg-3">
          {title}
        </h2>
        {actions}
      </div>
      <div className="min-w-0 flex-1 px-2 pb-2">{children}</div>
    </section>
  );
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return <p className="px-2 py-3 text-[12.5px] text-fg-3">{children}</p>;
}
