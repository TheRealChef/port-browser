import { ErrorBoundary } from '../common/ErrorBoundary';
import { renderView, useContentView, viewKey } from './viewRegistry';

export function ContentArea() {
  const view = useContentView();
  const key = viewKey(view);
  return (
    <main className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <ErrorBoundary key={key} label="This view">
        {renderView(view)}
      </ErrorBoundary>
    </main>
  );
}
