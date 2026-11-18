import { useLayoutEffect, useState, type ReactNode } from 'react';
import { createEngine } from '../engine.js';
import { SurfaceEngineContext } from './SurfaceEngineContext.js';

export function SurfaceProvider({ children }: { children: ReactNode }) {
  const [engine] = useState(createEngine);

  useLayoutEffect(() => {
    engine.start();
    return () => engine.stop();
  }, [engine]);

  return <SurfaceEngineContext value={engine}>{children}</SurfaceEngineContext>;
}
