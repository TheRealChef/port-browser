import { createContext, useContext } from 'react';
import type { BrowserHost } from '../../host/types';
import type { Navigation } from '../../features/navigation/navigation';

export interface HostContextValue {
  host: BrowserHost;
  navigation: Navigation;
}

export const HostContext = createContext<HostContextValue | null>(null);

function useHostContext(): HostContextValue {
  const value = useContext(HostContext);
  if (!value) throw new Error('HostContext is missing. Wrap the app in <AppProviders>.');
  return value;
}

export function useBrowserHost(): BrowserHost {
  return useHostContext().host;
}

export function useNavigation(): Navigation {
  return useHostContext().navigation;
}
