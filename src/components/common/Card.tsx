import type { HTMLAttributes, ReactNode } from 'react';
import type { Icon as IconType } from '../icons';
import type { Hue } from '../../features/workspace/appearance';
import { cn } from '../../utils/misc';

/**
 * Port UI tiles. Colour has a job: cards are neutral unless they are the
 * screen's headline cell or carry a status.
 *
 * neutral     - a tile on the content panel
 * elevated    - floats above its neighbours
 * accent      - the screen's headline cell: a wash of the hue at the top
 * interactive - the whole tile is a target: it lifts on hover
 * status      - a hue rail on the leading edge
 */
export type CardVariant = 'neutral' | 'elevated' | 'accent' | 'interactive' | 'status';

interface CardProps {
  title: string;
  description?: string;
  icon?: IconType;
  /** Local hue for the icon box, wash and rail. `space` follows the active space; omit for neutral. */
  hue?: Hue | 'space';
  variant?: CardVariant;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  headerProps?: HTMLAttributes<HTMLDivElement>;
}

export function Card({
  title,
  description,
  icon: Icon,
  hue,
  variant = 'neutral',
  actions,
  children,
  className,
  headerProps,
}: CardProps) {
  return (
    <section
      className={cn(
        'relative flex min-w-0 flex-col overflow-hidden rounded-[14px] bg-surface shadow-card transition-ui',
        hue && hue !== 'space' && `h-${hue}`,
        variant === 'accent' && 'bg-[linear-gradient(180deg,var(--wash-2),var(--card)_112px)]',
        variant === 'elevated' && 'shadow-pop',
        variant === 'interactive' && 'hover:-translate-y-0.5 hover:shadow-pop',
        className,
      )}
    >
      {variant === 'status' && (
        <span aria-hidden className="absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-accent" />
      )}
      <div
        {...headerProps}
        className={cn(
          'flex min-h-11 items-center gap-2.5 pl-3.5 pr-2 pt-1',
          headerProps?.className,
        )}
      >
        {Icon && (
          <span aria-hidden className={cn('icbox', !hue && 'bg-hover text-fg-2')}>
            <Icon size={14} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[13px] font-semibold tracking-[-0.005em] text-fg">
            {title}
          </h2>
          {description && <p className="truncate text-[11.5px] text-fg-3">{description}</p>}
        </div>
        {actions}
      </div>
      <div className="min-w-0 flex-1 px-2 pb-2">{children}</div>
    </section>
  );
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return <p className="px-2 py-3 text-[12.5px] text-fg-3">{children}</p>;
}
