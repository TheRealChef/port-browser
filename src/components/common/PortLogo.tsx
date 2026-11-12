/**
 * The Port mark: an ivory geometric "P" on a mineral tile with a small sage
 * block, the "port" the P docks into. Kept as inline vector so it stays crisp
 * at any size and follows the theme tokens.
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
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx="8"
        fill="var(--port-surface)"
        stroke="var(--port-border)"
      />
      <path
        fillRule="evenodd"
        fill="var(--port-ivory)"
        d="M9.5 7h8a6.5 6.5 0 0 1 0 13H14v5H9.5V7Zm4.5 4.25v4.5h3.25a2.25 2.25 0 0 0 0-4.5H14Z"
      />
      <rect x="19.25" y="21.25" width="3.75" height="3.75" rx="1" fill="var(--port-sage)" />
    </svg>
  );
}
