import type { KeyboardEvent, ReactNode } from 'react';
import { Check, ChevronDown } from '../icons';
import { showMenuAt } from './menu';
import { cn } from '../../utils/misc';

const toggleKeys = (e: KeyboardEvent, run: () => void) => {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    run();
  }
};

/** Port UI checkbox (`.ck`). */
export function Checkbox({
  checked,
  onChange,
  children,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  const toggle = () => !disabled && onChange(!checked);
  return (
    <span
      role="checkbox"
      tabIndex={disabled ? -1 : 0}
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      onClick={toggle}
      onKeyDown={(e) => toggleKeys(e, toggle)}
      className="ck"
    >
      <span className="bx">
        <Check size={12} strokeWidth={2.25} className="ic" />
      </span>
      <span>
        {children}
        {description && <span className="sub">{description}</span>}
      </span>
    </span>
  );
}

/** Port UI switch (`.toggle`), in the local hue. */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  const toggle = () => !disabled && onChange(!checked);
  return (
    <span
      role="switch"
      tabIndex={disabled ? -1 : 0}
      aria-checked={checked}
      aria-label={label}
      aria-disabled={disabled || undefined}
      onClick={toggle}
      onKeyDown={(e) => toggleKeys(e, toggle)}
      className={cn('toggle', checked && 'on', disabled && 'opacity-50', className)}
    />
  );
}

/** Port UI segmented control (`.seg`): the selected option is a lifted tile. */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: ReactNode }>;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="seg">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={on}
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={cn(on && 'bg-raised shadow-card')}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Port UI select (`.box.sel`): opens a Port menu with the options, current one checked. */
export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  const current = options.find((o) => o.value === value);
  const open = (el: HTMLElement) =>
    showMenuAt(
      el,
      options.map((o) => ({
        type: 'item' as const,
        id: `opt-${o.value}`,
        label: o.label,
        checked: o.value === value,
        onSelect: () => onChange(o.value),
      })),
    );
  return (
    <button
      type="button"
      role="combobox"
      aria-label={label}
      aria-haspopup="listbox"
      aria-expanded={false}
      onClick={(e) => open(e.currentTarget)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          open(e.currentTarget);
        }
      }}
      className={cn(
        'field sel flex h-ctl min-w-[180px] items-center gap-2 px-2.5 text-left',
        className,
      )}
    >
      <span className="val truncate">{current?.label ?? ''}</span>
      <ChevronDown size={14} className="shrink-0 text-fg-3" />
    </button>
  );
}

/** Port UI slider (`.slider`), in the local hue. */
export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  className,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label: string;
  className?: string;
}) {
  const share = ((value - min) / (max - min)) * 100;
  const snap = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  const fromPointer = (el: HTMLElement, clientX: number) => {
    const r = el.getBoundingClientRect();
    onChange(snap(min + ((clientX - r.left) / r.width) * (max - min)));
  };
  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn('slider', className)}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        fromPointer(e.currentTarget, e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) fromPointer(e.currentTarget, e.clientX);
      }}
      onKeyDown={(e) => {
        const next =
          e.key === 'ArrowRight' || e.key === 'ArrowUp'
            ? value + step
            : e.key === 'ArrowLeft' || e.key === 'ArrowDown'
              ? value - step
              : e.key === 'Home'
                ? min
                : e.key === 'End'
                  ? max
                  : null;
        if (next === null) return;
        e.preventDefault();
        onChange(snap(next));
      }}
    >
      <span className="tr" />
      <span className="fill" style={{ width: `${share}%` }} />
      <span className="th" style={{ left: `${share}%` }} />
    </div>
  );
}
