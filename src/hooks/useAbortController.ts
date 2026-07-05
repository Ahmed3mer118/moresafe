import { useEffect, useRef } from 'react';

/** Returns an AbortSignal that aborts when the component unmounts or deps change. */
export function useAbortController(deps: unknown[] = []) {
  const controllerRef = useRef<AbortController | null>(null);

  if (!controllerRef.current) {
    controllerRef.current = new AbortController();
  }

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return controllerRef.current.signal;
}

/** Run an async effect with automatic abort on unmount / dependency change. */
export function useAbortableEffect(
  effect: (signal: AbortSignal) => void | Promise<void>,
  deps: unknown[],
) {
  useEffect(() => {
    const controller = new AbortController();
    void effect(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
