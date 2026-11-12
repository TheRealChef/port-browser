import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/misc';

interface DialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'sm' | 'md' | 'lg';
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Modal dialog with focus trap, Escape to close, and focus restoration. */
export function Dialog({ title, onClose, children, footer, width = 'sm' }: DialogProps) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first =
      panel.current?.querySelector<HTMLElement>('[data-autofocus]') ??
      panel.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    return () => {
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !panel.current) return;
    const nodes = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (!nodes.length) return;
    const first = nodes[0] as HTMLElement;
    const last = nodes[nodes.length - 1] as HTMLElement;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex animate-fade items-start justify-center bg-[rgb(6_10_12/0.55)] px-4 pt-[14vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={onKeyDown}
        className={cn(
          'w-full animate-pop rounded-2xl bg-elevated shadow-pop',
          width === 'sm' && 'max-w-[400px]',
          width === 'md' && 'max-w-[520px]',
          width === 'lg' && 'max-w-[680px]',
        )}
      >
        <div className="flex items-center justify-between px-5 pb-1 pt-4">
          <h2 className="text-[15px] font-semibold tracking-tight text-fg">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-6 items-center justify-center rounded-md text-fg-3 transition-ui hover:bg-hover hover:text-fg"
          >
            <X size={14} />
          </button>
        </div>
        <div className="px-5 pb-5 pt-2">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 rounded-b-2xl border-t border-line bg-surface/60 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
