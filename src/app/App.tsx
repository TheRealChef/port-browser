import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { AppShell } from '../components/layout/AppShell';
import { AppProviders } from './providers/AppProviders';

export function App() {
  return (
    <ErrorBoundary label="Vela">
      <AppProviders>
        <AppShell />
      </AppProviders>
    </ErrorBoundary>
  );
}
