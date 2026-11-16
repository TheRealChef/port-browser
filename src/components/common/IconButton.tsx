import { forwardRef, type ButtonHTMLAttributes } from 'react';
import type { Icon as IconType } from '../icons';
import { cn } from '../../utils/misc';
import { Tooltip } from './Tooltip';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconType;
  label: string;
  shortcut?: string;
  size?: 'sm' | 'md';
  active?: boolean;
  tooltipSide?: 'top' | 'bottom' | 'right';
}

/** Quiet Port UI icon button (`.btn.icon.quiet`) with a tooltip. */
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
          'btn icon quiet shrink-0 disabled:border-transparent disabled:text-fg-disabled',
          size === 'md' ? 'size-7' : 'sm size-6',
          active && 'bg-raised text-fg shadow-card',
          className,
        )}
        {...rest}
      >
        <Icon size={size === 'md' ? 16 : 14} />
      </button>
    </Tooltip>
  );
});
