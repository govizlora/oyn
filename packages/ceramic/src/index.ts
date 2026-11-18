import { ceramicDomBinding, ceramicBinding, ceramicLightDefaults, type CeramicLight } from './interaction.js';
import type { Appearance } from '@oyn/surface';
import { createParameters, type Material, type SurfaceMode } from '@oyn/surface';
import { insetWGSL, insetParameters } from './inset.js';
import { ceramicWGSL } from './shaders.js';
import { shadowBounds } from './bounds.js';
import { ceramicFinish, type CeramicOptions } from './finish.js';
export type { CeramicOptions } from './finish.js';
import defaults from './defaults.json' with { type: 'json' };

/** Tuned defaults based on the GPU Surfaces story. Workspace colors are application guidance. */
export const ceramicDefaults = Object.freeze({ ...defaults, light: ceramicLightDefaults });
export type CeramicMaterial = Material & { setElevation(value: number): void };
/** Configuration is numeric. Animation libraries explicitly bind to setElevation. */
export function createCeramicMaterial(options: CeramicOptions = {}): CeramicMaterial {
  return createMaterial(options);
}
function createMaterial(options: CeramicOptions, reservedElevation?: number): CeramicMaterial {
  const { values, rgb, elevation: initialElevation, validateSignedElevation } = ceramicFinish(options);
  const paddingElevation = Math.max(0, reservedElevation ?? initialElevation, options.maxElevation ?? 0);
  let elevation = initialElevation;
  const parameters = createParameters(values);
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
    bind: ceramicDomBinding,
    resolveMode: options.mode === undefined ? mode => {
      let material = variants.get(mode);
      if (!material) {
        material = createMaterial({ ...options, mode, elevation, maxElevation: paddingElevation }, paddingElevation);
        variants.set(mode, material);
      }
      return material;
    } : undefined,
    get shader() { return elevation < 0 ? insetWGSL : ceramicWGSL; }, parameters,
    get passes() { return elevation < 0 ? insetPasses : raisedPasses; },
    measurePadding: (width, height) => shadowBounds(width, height, paddingElevation, shadow),
    setElevation(value: number) { updateElevation(value); variants.forEach(material => material.setElevation(value)); },
  };
}

export type CeramicProps = CeramicOptions & { light?: CeramicLight };
export type { CeramicLight } from './interaction.js';
/** Stable visual definition. Each committed node owns its own parameter block. */
export const ceramic: Appearance<CeramicProps> = {
  create(props, context) {
    const read = (props: Readonly<CeramicProps>, mode: SurfaceMode) => ({
      ...props, mode: props.mode ?? mode,
      color: typeof props.color === 'object' ? { ...props.color } : props.color,
      light: props.light ? { ...props.light, position: props.light.position ? { ...props.light.position } : undefined } : undefined,
    });
    let configuration = read(props, context.mode);
    let key = JSON.stringify(configuration);
    // Reserve the initial exterior height for this appearance instance only.
    const initialPaddingElevation = Math.max(0, configuration.elevation ?? ceramicDefaults.elevation);
    const createOptical = (config: typeof configuration) => createMaterial(config, initialPaddingElevation);
    let optical = createOptical(configuration);
    let binding = ceramicBinding(configuration.light);
    const parameters = optical.parameters;
    const material: Material = {
      get shader() { return optical.shader; }, get passes() { return optical.passes; },
      measurePadding: (width, height) => optical.measurePadding(width, height), get bind() { return binding; }, parameters,
    };
    return {
      material,
      update(next, context) {
        const config = read(next, context.mode), nextKey = JSON.stringify(config);
        if (key === nextKey) return;
        // Validate the complete next configuration before applying any change.
        const nextOptical = createOptical(config);
        const lightKey = JSON.stringify(config.light);
        const lightChanged = lightKey !== JSON.stringify(configuration.light);
        const nextBinding = lightChanged ? ceramicBinding(config.light) : binding;
        const layout = config.maxElevation !== configuration.maxElevation ||
          config.shadowLightHeight !== configuration.shadowLightHeight || config.shadowLightSize !== configuration.shadowLightSize ||
          config.shadowStrength !== configuration.shadowStrength || config.contactShadowStrength !== configuration.contactShadowStrength;
        nextOptical.parameters.snapshot().forEach((value,index)=>parameters.set(index,value));
        optical = nextOptical; binding = nextBinding; configuration = config; key = nextKey;
        return layout ? 'layout' : 'draw';
      },
    };
  },
};
