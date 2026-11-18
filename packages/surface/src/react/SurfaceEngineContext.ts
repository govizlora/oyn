import { createContext } from 'react';
import type { Engine } from '../engine.js';

export const SurfaceEngineContext = createContext<Engine | null>(null);
