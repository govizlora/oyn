import type { SurfaceMode } from '@oyn/surface';
import { validateElevation } from './bounds.js';
import { parseColor } from './color.js';
import defaults from './defaults.json' with { type: 'json' };
export type CeramicOptions = Partial<Omit<typeof defaults, 'lightWorkspace' | 'darkWorkspace'>> & {
  color?: string | Record<SurfaceMode, string>;
  mode?: 'light' | 'dark';
  maxElevation?: number;
};
export function ceramicFinish(options: CeramicOptions = {}) {
  const settings = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof typeof defaults)[]) {
    if (key === 'lightWorkspace' || key === 'darkWorkspace') continue;
    const value = options[key];
    if (value !== undefined) settings[key] = value;
  }
  for (const [name, value] of Object.entries(settings)) {
    if (!Number.isFinite(value) || !Number.isFinite(Math.fround(value)) || (value < 0 && name !== 'elevation')) throw Error(`Invalid Ceramic ${name}.`);
  }
  for (const key of ['shadowStrength', 'contactShadowStrength', 'lightReflectionSpread', 'lightEdgeShade', 'lightSurfaceTop', 'lightSurfaceShade'] as const) {
    if (settings[key] > 1) throw Error(`Ceramic ${key} must be in [0, 1].`);
  }
  if (settings.lightSurface > 255 || settings.darkSurface > 255) throw Error('Ceramic surface brightness must be in [0, 255].');
  if (settings.lightZ < 1 || settings.shadowLightHeight <= 0 || settings.sharpness <= 0) throw Error('Invalid Ceramic light height or sharpness.');
  const lightHeight = Math.fround(settings.shadowLightHeight);
  const validateSignedElevation = (value: number) => {
    if (!Number.isFinite(value) || !Number.isFinite(Math.fround(value))) throw Error('Ceramic elevation must be a finite f32.');
    validateElevation(Math.max(0, value), lightHeight);
  };
  validateSignedElevation(settings.elevation);
  const elevation = settings.elevation;
  if (options.maxElevation !== undefined) validateElevation(options.maxElevation, lightHeight);
  const dark = options.mode === 'dark';
  const brightness = dark ? settings.darkSurface : settings.lightSurface;
  const rgb = parseColor((typeof options.color === 'string' ? options.color : options.color?.[dark ? 'dark' : 'light']) ?? `rgb(${brightness} ${brightness} ${brightness})`);
  const values = [
    0, Math.max(0, elevation), dark ? settings.rim : settings.lightRim, 0,
    ...rgb, 0, Number(dark), Number(!dark), 0, 0,
    lightHeight, settings.shadowLightSize, settings.shadowStrength, settings.contactShadowStrength,
    settings.lightZ, settings.reflectionStrength, settings.sharpness, settings.darkFrost,
    settings.lightReflectionStrength, settings.lightReflectionSpread, settings.lightEdgeShade, 0,
    settings.lightSurfaceTop, settings.lightSurfaceShade, 0, 0,
  ];
  return { values, rgb, elevation, validateSignedElevation };
}
