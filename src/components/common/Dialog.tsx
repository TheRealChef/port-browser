import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from '../icons';
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
      className="scrim fixed z-[95] flex items-start justify-center px-4 pt-[14vh]"
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
          'dlg w-full',
          width === 'sm' && 'max-w-[440px]',
          width === 'md' && 'max-w-[520px]',
          width === 'lg' && 'max-w-[680px]',
        )}
      >
        <div className="flex items-center justify-between gap-3 px-[18px] pt-[18px]">
          <h2 className="text-[15px] font-semibold leading-5 text-fg">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="btn icon quiet sm size-6"
          >
            <X size={14} />
          </button>
        </div>
        <div className="px-[18px] pb-[18px] pt-3">{children}</div>
        {footer && <div className="dlg-f">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
