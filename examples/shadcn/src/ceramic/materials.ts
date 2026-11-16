import { ceramic, inset } from '@oyn/material-ceramic';

export const neutralMaterial = ceramic();
export const panelMaterial = ceramic({ elevation: 8 });
export const dialogMaterial = ceramic({ elevation: 64 });
export const destructiveMaterial = ceramic({ color: { light: '#dc2626', dark: '#ef4444' } });
export const primaryMaterials = {
  light: ceramic({ mode: 'dark', color: '#171717' }),
  dark: ceramic({ mode: 'light', color: '#e5e5e5' }),
};

export const insetMaterial = inset();
