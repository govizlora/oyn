import type { CeramicProps } from '@oyn/ceramic';

export const neutralProps = {};
export const panelProps = { elevation: 4 };
export const dialogProps = { elevation: 64 };
export const destructiveProps = { color: { light: '#dc2626', dark: '#ef4444' } };
export const primaryProps: Record<'light'|'dark', CeramicProps> = {
  light: { mode: 'dark', color: '#171717' },
  dark: { mode: 'light', color: '#e5e5e5' },
};

export const insetProps = { elevation: -2.3 };

// Demo hover depth, with the reference story's deeper press.
export const recessElevations = { hover: -4, pressed: -6 } as const;

export const popoverProps = { elevation: 16 };
