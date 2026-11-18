import { useContext } from 'react';
import { ModeContext } from './ModeContext.js';

export function useSurfaceMode() {
  return useContext(ModeContext);
}
