import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/misc';

/**
 * neutral     - default surface card on the canvas
 * elevated    - lifted one step (secondary panels, popover-like content)
 * accent      - tinted with `tone` (decks, highlighted areas)
 * interactive - the whole card is a target: hover lift and focus ring
 * status      - a tone bar on the leading edge (running services, warnings)
 */
export type CardVariant = 'neutral' | 'elevated' | 'accent' | 'interactive' | 'status';

interface CardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Any CSS color, usually a token such as `var(--hint)`. Colors the icon chip. */
  tone?: string;
  variant?: CardVariant;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  headerProps?: HTMLAttributes<HTMLDivElement>;
}

const VARIANTS: Record<CardVariant, string> = {
  neutral: 'border-line bg-surface',
  elevated: 'border-line-strong/70 bg-elevated',
  accent: 'border-[color:var(--card-tone-border)] bg-surface',
  interactive:
    'border-line bg-surface hover:border-line-strong hover:bg-[color-mix(in_oklab,var(--surface),white_3%)] focus-within:border-focus/60',
  status: 'border-line bg-surface',
};

export function Card({
  title,
  description,
  icon: Icon,
  tone = 'var(--text-muted)',
  variant = 'neutral',
  actions,
  children,
  className,
  headerProps,
}: CardProps) {
  const style = {
    '--card-tone': tone,
    '--card-tone-border': `color-mix(in oklab, ${tone} 28%, var(--border))`,
    ...(variant === 'accent'
      ? {
          backgroundImage: `linear-gradient(180deg, color-mix(in oklab, ${tone} 11%, transparent) 0, transparent 88px)`,
        }
      : {}),
  } as CSSProperties;

  return (
    <section
      style={style}
      className={cn(
        'relative flex min-w-0 flex-col overflow-hidden rounded-xl border shadow-card transition-ui',
        VARIANTS[variant],
        className,
      )}
    >
      {variant === 'status' && (
        <span
          aria-hidden
          className="absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-[var(--card-tone)]"
        />
      )}
      <div
        {...headerProps}
        className={cn(
          'flex min-h-11 items-center gap-2.5 pl-3.5 pr-1.5 pt-1',
          headerProps?.className,
        )}
      >
        {Icon && (
          <span
            aria-hidden
            className="flex size-6 shrink-0 items-center justify-center rounded-md"
            style={{
              color: tone,
              background: `color-mix(in oklab, ${tone} 19%, transparent)`,
            }}
          >
            <Icon size={13} strokeWidth={2.1} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[13.5px] font-semibold tracking-[-0.005em] text-fg">
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
