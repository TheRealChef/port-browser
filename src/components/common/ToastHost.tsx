import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import { useUI } from '../../stores/uiStore';
import { cn } from '../../utils/misc';

const ICONS = { info: Info, success: CircleCheck, error: CircleAlert };

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
      className="fixed bottom-5 left-1/2 z-[110] flex max-w-[min(480px,90vw)] -translate-x-1/2 animate-pop items-center gap-2 rounded-xl bg-elevated py-2 pl-3 pr-2 text-[13px] text-fg shadow-pop"
    >
      <Icon
        size={15}
        className={cn(
          'shrink-0',
          toast.tone === 'success' && 'text-success',
          toast.tone === 'error' && 'text-danger',
          toast.tone === 'info' && 'text-info',
        )}
      />
      <span className="truncate">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            const run = toast.action?.run;
            dismiss();
            run?.();
          }}
          className="ml-1 shrink-0 rounded-md px-2 py-0.5 font-medium text-brand transition-ui hover:bg-hover"
        >
          {toast.action.label}
        </button>
      )}
    </div>,
    document.body,
  );
}
