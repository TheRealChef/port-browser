import { ACCENT_COLORS, type AccentColor } from '../../types/models';
import { ACCENTS, ICONS, ICON_NAMES } from '../../features/workspace/appearance';
import { cn } from '../../utils/misc';
import { Check } from '../icons';

export function AccentPicker({
  value,
  onChange,
}: {
  value: AccentColor;
  onChange: (accent: AccentColor) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Colour" className="swatches">
      {ACCENT_COLORS.map((accent) => (
        <button
          key={accent}
          type="button"
          role="radio"
          aria-checked={value === accent}
          aria-label={ACCENTS[accent].label}
          title={ACCENTS[accent].label}
          onClick={() => onChange(accent)}
          className={cn('sw', `h-${accent}`)}
        >
          <Check size={12} strokeWidth={2.5} />
        </button>
      ))}
    </div>
  );
}

export function IconPicker({
  value,
  accent,
  onChange,
}: {
  value: string;
  accent: AccentColor;
  onChange: (icon: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Icon" className="grid grid-cols-10 gap-1">
      {ICON_NAMES.map((name) => {
        const Icon = ICONS[name];
        if (!Icon) return null;
        const selected = value === name;
        return (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={name}
            title={name}
            onClick={() => onChange(name)}
            className={cn(
              'flex size-8 items-center justify-center rounded-lg transition-ui hover:bg-hover',
              `h-${accent}`,
              selected
                ? 'bg-accent-soft text-accent-ink shadow-[inset_0_0_0_1.5px_var(--hue)]'
                : 'text-fg-2',
            )}
          >
            <Icon size={16} />
          </button>
        );
      })}
    </div>
  );
}
