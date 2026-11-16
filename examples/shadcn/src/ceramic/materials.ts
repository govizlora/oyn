import { ceramic } from '@oyn/material-ceramic';

export const neutralMaterial = ceramic();
export const panelMaterial = ceramic({ elevation: 4 });
export const dialogMaterial = ceramic({ elevation: 64 });
export const destructiveMaterial = ceramic({ color: { light: '#dc2626', dark: '#ef4444' } });
export const primaryMaterials = {
  light: ceramic({ mode: 'dark', color: '#171717' }),
  dark: ceramic({ mode: 'light', color: '#e5e5e5' }),
};

export const insetMaterial = ceramic({ elevation: -2.3 });

// Demo hover depth, with the reference story's deeper press.
export const recessElevations = { hover: -4, pressed: -6 } as const;

export const popoverMaterial = ceramic({ elevation: 16 });
