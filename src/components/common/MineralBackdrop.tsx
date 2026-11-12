import { cn } from '../../utils/misc';

/**
 * Layered mineral ridges for hero areas (start page, dashboard header, empty
 * states). Pure SVG drawn with theme tokens: the nearest ridge carries the
 * active space accent, the far ones stay slate, and the last layer fades into
 * the canvas so text placed over it stays readable.
 */
export function MineralBackdrop({
  className,
  intensity = 1,
}: {
  className?: string;
  /** 0–1 multiplier for quieter placements such as dashboard headers. */
  intensity?: number;
}) {
  const o = (value: number) => Math.min(1, value * intensity);
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-x-0 top-0 overflow-hidden', className)}
    >
      <svg
        className="size-full"
        viewBox="0 0 1200 280"
        preserveAspectRatio="xMidYMax slice"
        focusable="false"
      >
        <defs>
          <linearGradient id="mineral-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--port-steel)" stopOpacity={o(0.1)} />
            <stop offset="0.75" stopColor="var(--port-steel)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="mineral-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--background)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--background)" stopOpacity="1" />
          </linearGradient>
        </defs>
        <rect width="1200" height="280" fill="url(#mineral-sky)" />
        <circle cx="905" cy="92" r="44" fill="var(--port-clay)" fillOpacity={o(0.09)} />
        <path
          d="M0 170 L140 118 L250 150 L380 92 L520 146 L640 104 L780 152 L900 112 L1040 160 L1200 120 V280 H0 Z"
          fill="var(--port-steel)"
          fillOpacity={o(0.1)}
        />
        <path
          d="M0 204 L120 168 L230 192 L360 150 L470 188 L610 160 L720 196 L860 158 L990 194 L1110 170 L1200 186 V280 H0 Z"
          fill="var(--port-stone)"
          fillOpacity={o(0.09)}
        />
        <path
          d="M0 236 L150 200 L290 228 L420 196 L560 230 L700 206 L830 236 L980 204 L1100 226 L1200 212 V280 H0 Z"
          fill="var(--accent)"
          fillOpacity={o(0.13)}
        />
        <rect y="150" width="1200" height="130" fill="url(#mineral-fade)" />
      </svg>
    </div>
  );
}
