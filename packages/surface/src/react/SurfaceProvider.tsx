import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createEngine } from '../engine.js';
import { SurfaceContext, type SurfaceService } from './SurfaceContext.js';

export function SurfaceProvider({
  children,
  onError = console.error,
}: {
  children: ReactNode;
  onError?: (error: unknown) => void;
}) {
  const errorHandler = useRef(onError);
  useLayoutEffect(() => {
    errorHandler.current = onError;
  }, [onError]);
  const [service] = useState<SurfaceService>(() => ({
    entries: new Map(),
    invalidate() {},
    requestDraw() {},
    release() {},
    report(error) {
      console.error(error);
    },
  }));
  useLayoutEffect(() => {
    service.report = (error) => errorHandler.current(error);
    const engine = createEngine(service.entries, service.report);
    service.invalidate = engine.invalidate;
    service.requestDraw = engine.requestDraw;
    service.release = engine.release;
    engine.invalidate();
    return () => {
      service.invalidate = () => {};
      service.requestDraw = () => {};
      service.release = () => {};
      engine.dispose();
    };
  }, [service]);
  return <SurfaceContext value={service}>{children}</SurfaceContext>;
}
