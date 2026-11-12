import { forwardRef, type ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/misc';
import { Tooltip } from './Tooltip';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  size?: 'sm' | 'md';
  active?: boolean;
  tooltipSide?: 'top' | 'bottom' | 'right';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, shortcut, size = 'md', active, tooltipSide, className, ...rest },
  ref,
) {
  return (
    <Tooltip label={label} shortcut={shortcut} side={tooltipSide}>
      <button
        ref={ref}
        type="button"
        aria-label={label}
        aria-pressed={active}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-md text-fg-3 transition-ui',
          'hover:bg-hover hover:text-fg active:bg-active disabled:pointer-events-none disabled:text-fg-disabled',
          size === 'md' ? 'size-8' : 'size-6',
          active && 'bg-hover text-fg',
          className,
        )}
        {...rest}
      >
        <Icon size={size === 'md' ? 16 : 14} strokeWidth={1.9} />
      </button>
    </Tooltip>
  );
});
