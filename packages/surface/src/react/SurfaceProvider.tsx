import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createEngine } from '../engine.js';
import type { SurfaceMode } from '../types/material.js';
import { SurfaceContext, type SurfaceService } from './SurfaceContext.js';
import { ModeContext } from './ModeContext.js';

export function SurfaceProvider({
  children,
  mode = 'system',
  onError = console.error,
}: {
  children: ReactNode;
  mode?: SurfaceMode | 'system';
  onError?: (error: unknown) => void;
}) {
  const [systemMode, setSystemMode] = useState<SurfaceMode>(() =>
    typeof matchMedia !== 'undefined' &&
    matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light',
  );
  useLayoutEffect(() => {
    if (mode !== 'system') return;
    const media = matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemMode(media.matches ? 'dark' : 'light');
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [mode]);
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
  return (
    <ModeContext value={mode === 'system' ? systemMode : mode}>
      <SurfaceContext value={service}>{children}</SurfaceContext>
    </ModeContext>
  );
}
