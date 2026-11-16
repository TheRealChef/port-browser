import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CircleAlert, CircleCheck, Info } from '../icons';
import { useUI } from '../../stores/uiStore';
import { cn } from '../../utils/misc';

const ICONS = { info: Info, success: CircleCheck, error: CircleAlert };
/** Signal hue per tone: mineral = success, coral = error, cobalt = information. */
const HUES = { info: 'h-cobalt', success: 'h-mineral', error: 'h-coral' };

export function ToastHost() {
  const toast = useUI((s) => s.toast);
  const dismiss = useUI((s) => s.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const duration = toast.action ? 5000 : toast.tone === 'error' ? 5000 : 2600;
    const timer = window.setTimeout(dismiss, duration);
    return () => window.clearTimeout(timer);
  }, [toast, dismiss]);

  if (!toast) return null;
  const Icon = ICONS[toast.tone];
  return createPortal(
    <div
      key={toast.id}
      role="status"
      aria-live="polite"
      className={cn(
        'toast fixed bottom-5 left-1/2 z-[110] max-w-[min(480px,90vw)] -translate-x-1/2 py-2 pl-2 pr-2 text-fg',
        HUES[toast.tone],
      )}
    >
      <span className="icbox">
        <Icon size={14} />
      </span>
      <span className="truncate pr-1">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            const run = toast.action?.run;
            dismiss();
            run?.();
          }}
          className="btn sm tonal h-cobalt shrink-0"
        >
          {toast.action.label}
        </button>
      )}
    </div>,
    document.body,
  );
}
