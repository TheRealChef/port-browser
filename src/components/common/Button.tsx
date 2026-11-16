import type { ButtonHTMLAttributes } from 'react';
import type { Icon as IconType } from '../icons';
import { cn } from '../../utils/misc';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'tonal';
  size?: 'sm' | 'md' | 'lg';
  icon?: IconType;
}

/**
 * Port UI button (`.btn`). Primary takes Port Browser's identity hue (cobalt);
 * use one per view.
 */
const VARIANTS = {
  primary: 'primary h-cobalt',
  secondary: '',
  ghost: 'quiet',
  danger: 'danger',
  tonal: 'tonal',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn('btn', VARIANTS[variant], size !== 'md' && size, className)}
      {...rest}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  );
}
