import { createContext } from 'react';
import type { SurfaceMode } from '../types/material.js';

export const ModeContext = createContext<SurfaceMode>('light');
