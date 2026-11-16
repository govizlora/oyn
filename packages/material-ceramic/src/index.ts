import { createParameters, type Material, type SurfaceMode } from '@oyn/surface';
import { insetWGSL, insetParameters } from './inset.js';
import { ceramicWGSL } from './shaders.js';
import { shadowBounds, validateElevation } from './bounds.js';
import { parseColor } from './color.js';
import defaults from './defaults.json' with { type: 'json' };

/** Tuned defaults based on the GPU Surfaces story. Workspace colors are application guidance. */
export const ceramicDefaults = Object.freeze(defaults);
export type CeramicOptions = Partial<Omit<typeof defaults, 'lightWorkspace' | 'darkWorkspace'>> & {
  color?: string | Record<SurfaceMode, string>;
  mode?: 'light' | 'dark';
  maxElevation?: number;
};
export type CeramicMaterial = Material & { setElevation(value: number): void };
/** Configuration is numeric. Animation libraries explicitly bind to setElevation. */
export function ceramic(options: CeramicOptions = {}): CeramicMaterial {
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
  let elevation = settings.elevation;
  if (options.maxElevation !== undefined) validateElevation(options.maxElevation, lightHeight);
  const dark = options.mode === 'dark';
  const brightness = dark ? settings.darkSurface : settings.lightSurface;
  const rgb = parseColor((typeof options.color === 'string' ? options.color : options.color?.[dark ? 'dark' : 'light']) ?? `rgb(${brightness} ${brightness} ${brightness})`);
  const parameters = createParameters([
    0, Math.max(0, elevation), dark ? settings.rim : settings.lightRim, 0,
    ...rgb, 0, Number(dark), Number(!dark), 0, 0,
    lightHeight, settings.shadowLightSize, settings.shadowStrength, settings.contactShadowStrength,
    settings.lightZ, settings.reflectionStrength, settings.sharpness, settings.darkFrost,
    settings.lightReflectionStrength, settings.lightReflectionSpread, settings.lightEdgeShade, 0,
    settings.lightSurfaceTop, settings.lightSurfaceShade, 0, 0,
  ]);
  // Bounds and GPU consume the same f32 optical parameters.
  const raised = parameters.snapshot();
  const shadow = raised.slice(12, 16);
  const raisedPasses = ['shadow', 'surface'];
  const insetPasses = ['surface'];
  function updateElevation(value: number) {
    validateSignedElevation(value);
    const wasInset = elevation < 0;
    if (value >= 0 && !wasInset) { elevation = value; parameters.set(1, value); return; }
    const values = value < 0
      ? [...insetParameters(-value, rgb), ...Array(12).fill(0)]
      : Array.from(raised);
    if (value >= 0) values[1] = value;
    if (!values.every(v => Number.isFinite(Math.fround(v)))) throw Error('Ceramic elevation exceeds optical parameter range.');
    elevation = value;
    values.forEach((v, i) => parameters.set(i, v));
  }
  updateElevation(elevation);
  // Cache per-mode instances: sharing the source across differently themed providers is safe.
  const variants = new Map<SurfaceMode, CeramicMaterial>();
  return {
    resolveMode: options.mode === undefined ? mode => {
      let material = variants.get(mode);
      if (!material) {
        material = ceramic({ ...options, mode, elevation });
        variants.set(mode, material);
      }
      return material;
    } : undefined,
    get shader() { return elevation < 0 ? insetWGSL : ceramicWGSL; }, parameters,
    get passes() { return elevation < 0 ? insetPasses : raisedPasses; },
    bounds: {
      get initial() { return Math.max(0, elevation); }, max: options.maxElevation,
      measure: (width, height, budget) => shadowBounds(width, height, budget, shadow),
    },
    setElevation(value: number) { updateElevation(value); variants.forEach(material => material.setElevation(value)); },
  };
}
