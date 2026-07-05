import { Suspense, type ReactNode } from 'react';
import { PageLoader } from './PageLoader';

export function RouteSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}
