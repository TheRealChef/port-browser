import { ACCENT_COLORS, type AccentColor } from '../../types/models';
import { ACCENTS, ICONS, ICON_NAMES } from '../../features/workspace/appearance';
import { cn } from '../../utils/misc';

export function AccentPicker({
  value,
  onChange,
}: {
  value: AccentColor;
  onChange: (accent: AccentColor) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Accent color" className="flex flex-wrap gap-2">
      {ACCENT_COLORS.map((accent) => (
        <button
          key={accent}
          type="button"
          role="radio"
          aria-checked={value === accent}
          aria-label={ACCENTS[accent].label}
          title={ACCENTS[accent].label}
          onClick={() => onChange(accent)}
          className={cn(
            'size-6 rounded-full transition-ui hover:scale-110',
            value === accent && 'ring-2 ring-fg ring-offset-2 ring-offset-raised',
          )}
          style={{ background: ACCENTS[accent].value }}
        />
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
              'flex size-8 items-center justify-center rounded-md transition-ui hover:bg-hover',
              selected ? 'bg-active' : 'text-fg-2',
            )}
            style={selected ? { color: ACCENTS[accent].value } : undefined}
          >
            <Icon size={16} strokeWidth={1.9} />
          </button>
        );
      })}
    </div>
  );
}
