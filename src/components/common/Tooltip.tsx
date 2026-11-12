import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Kbd } from './Kbd';

type Side = 'top' | 'bottom' | 'right';

interface TooltipProps {
  label: string;
  shortcut?: string;
  side?: Side;
  children: ReactNode;
}

const DELAY = 450;

/** Hover/focus tooltip rendered in a portal so scroll containers never clip it. */
export function Tooltip({ label, shortcut, side = 'bottom', children }: TooltipProps) {
  const wrapper = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const show = useCallback(
    (delay: number) => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        const target = wrapper.current?.firstElementChild;
        if (!target) return;
        const r = target.getBoundingClientRect();
        if (side === 'right') setPos({ x: r.right + 8, y: r.top + r.height / 2 });
        else if (side === 'top') setPos({ x: r.left + r.width / 2, y: r.top - 8 });
        else setPos({ x: r.left + r.width / 2, y: r.bottom + 8 });
      }, delay);
    },
    [side],
  );

  const hide = useCallback(() => {
    window.clearTimeout(timer.current);
    setPos(null);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const transform =
    side === 'right'
      ? 'translate(0, -50%)'
      : side === 'top'
        ? 'translate(-50%, -100%)'
        : 'translate(-50%, 0)';

  return (
    <span
      ref={wrapper}
      className="contents"
      onMouseEnter={() => show(DELAY)}
      onMouseLeave={hide}
      onFocus={(e) => {
        if (e.target.matches(':focus-visible')) show(150);
      }}
      onBlur={hide}
      onPointerDown={hide}
    >
      {children}
      {pos &&
        createPortal(
          <div
            role="tooltip"
            className="pointer-events-none fixed z-[100] flex animate-fade items-center gap-2 whitespace-nowrap rounded-md border border-line-strong bg-raised px-2 py-1 text-xs text-fg shadow-pop"
            style={{
              left: Math.max(8, Math.min(pos.x, window.innerWidth - 8)),
              top: pos.y,
              transform,
            }}
          >
            {label}
            {shortcut && <Kbd>{shortcut}</Kbd>}
          </div>,
          document.body,
        )}
    </span>
  );
}
