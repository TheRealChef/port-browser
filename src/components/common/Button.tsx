import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/misc';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: LucideIcon;
}

const VARIANTS = {
  primary: 'bg-brand text-on-brand hover:bg-brand-hover active:bg-brand-pressed font-medium',
  secondary:
    'bg-elevated text-fg border border-line hover:border-line-strong hover:bg-[color-mix(in_oklab,var(--surface-raised),white_5%)]',
  ghost: 'text-fg-2 hover:bg-hover hover:text-fg',
  danger: 'bg-danger/14 text-danger border border-danger/35 hover:bg-danger/22',
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
        'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] transition-ui',
        'disabled:pointer-events-none disabled:opacity-45 disabled:saturate-50',
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
