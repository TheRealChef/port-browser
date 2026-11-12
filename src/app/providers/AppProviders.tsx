import { useState, type ReactNode } from 'react';
import { createBrowserHost } from '../../host/createHost';
import { createNavigation } from '../../features/navigation/navigation';
import { HostContext, type HostContextValue } from './hostContext';

export function AppProviders({ children }: { children: ReactNode }) {
  const [value] = useState<HostContextValue>(() => {
    const host = createBrowserHost();
    return { host, navigation: createNavigation(host) };
  });
  return <HostContext.Provider value={value}>{children}</HostContext.Provider>;
}
