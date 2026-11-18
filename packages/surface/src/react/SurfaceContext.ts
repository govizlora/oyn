import { createContext } from 'react';
import type { Mesh } from '../types/scene.js';

export type SurfaceService = {
  entries: Map<HTMLElement, Mesh>;
  invalidate: () => void;
  requestDraw: () => void;
  release: (mesh: Mesh) => void;
  report: (error: unknown) => void;
};

export const SurfaceContext = createContext<SurfaceService | null>(null);
