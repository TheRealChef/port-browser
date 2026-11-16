/**
 * The Port mark: a "P" on a tile in Port's brand colour, with a small block in
 * Port Browser's identity hue (cobalt), the "port" the P docks into. Inline
 * vector so it stays crisp and follows the theme and preset.
 */
export function PortLogo({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      aria-hidden
      focusable="false"
    >
      <rect width="32" height="32" rx="9" fill="var(--brand)" />
      <path
        fillRule="evenodd"
        fill="var(--on-fill)"
        d="M9.5 7h8a6.5 6.5 0 0 1 0 13H14v5H9.5V7Zm4.5 4.25v4.5h3.25a2.25 2.25 0 0 0 0-4.5H14Z"
      />
      <rect x="19.25" y="21.25" width="3.75" height="3.75" rx="1" fill="var(--cobalt)" />
    </svg>
  );
}
