import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/misc';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: LucideIcon;
}

const VARIANTS = {
  primary: 'bg-accent text-[#14121c] hover:bg-accent-hover font-medium',
  secondary: 'bg-raised text-fg border border-line-strong hover:bg-hover',
  ghost: 'text-fg-2 hover:bg-hover hover:text-fg',
  danger: 'bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25',
};

export function Button({
  variant = 'secondary',
  icon: Icon,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-[13px] transition-ui',
        'disabled:pointer-events-none disabled:opacity-40',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {Icon && <Icon size={15} strokeWidth={1.9} />}
      {children}
    </button>
  );
}
