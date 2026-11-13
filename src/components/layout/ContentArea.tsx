import { ErrorBoundary } from '../common/ErrorBoundary';
import { renderView, useContentView, viewKey } from './viewRegistry';

export function ContentArea() {
  const view = useContentView();
  const key = viewKey(view);
  return (
    <main className="relative min-h-0 flex-1 overflow-hidden rounded-[14px] border has-[[data-native-slot]]:rounded-none border-line bg-canvas shadow-[inset_0_1px_0_rgb(233_231_224/0.03)]">
      <ErrorBoundary key={key} label="This view">
        {renderView(view)}
      </ErrorBoundary>
    </main>
  );
}
