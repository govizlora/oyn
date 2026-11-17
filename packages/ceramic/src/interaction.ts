import type { Material, Point, SurfaceBindingContext, SurfaceBinding } from '@oyn/surface';
/** Ceramic policy, not a Surface input default. Positions are viewport CSS pixels. */
export type CeramicLight = Readonly<{
  source?: 'pointer' | 'fixed';
  position?: Point;
  onLeave?: 'hold' | 'return';
  onBlur?: 'hold' | 'return';
  onHidden?: 'hold' | 'return';
}>;
/** Explicit public defaults; omission and explicit undefined have the same meaning. */
export const ceramicLightDefaults = Object.freeze({
  source: 'pointer',
  position: Object.freeze({ x: 100, y: 100 }),
  onLeave: 'hold',
  onBlur: 'hold',
  onHidden: 'hold',
} satisfies Required<CeramicLight>);
export function validateLight(light: CeramicLight = {}) {
  if (light.source !== undefined && !['pointer','fixed'].includes(light.source)) throw Error('Invalid Ceramic light source.');
  for (const policy of [light.onLeave, light.onBlur, light.onHidden]) if (policy !== undefined && policy !== 'hold' && policy !== 'return') throw Error('Invalid Ceramic light policy.');
  if (light.position && ![light.position.x,light.position.y].every(v=>Number.isFinite(v)&&Number.isFinite(Math.fround(v)))) throw Error('Invalid Ceramic light position.');
}
export function ceramicBinding(light: CeramicLight = {}): NonNullable<Material['bind']> {
  validateLight(light);
  // Own the policy snapshot; never mutate or depend on a caller's mutable object.
  const config = {
    source: light.source ?? ceramicLightDefaults.source,
    position: { ...(light.position ?? ceramicLightDefaults.position) },
    onLeave: light.onLeave ?? ceramicLightDefaults.onLeave,
    onBlur: light.onBlur ?? ceramicLightDefaults.onBlur,
    onHidden: light.onHidden ?? ceramicLightDefaults.onHidden,
  };
  return (context: SurfaceBindingContext): SurfaceBinding => {
    let radius = 0;
    if (config.source !== 'fixed') {
      const unsubscribe = context.inputs.pointer.subscribe(context.requestDraw);
      context.signal.addEventListener('abort', unsubscribe, { once: true });
    }
    return {
      measure() { radius = parseFloat(getComputedStyle(context.element).borderTopLeftRadius) || 0; },
      frame(frame) {
        const pointer = context.inputs.pointer.getSnapshot();
        const returning = (!pointer.inside && config.onLeave === 'return') || (!pointer.focused && config.onBlur === 'return') || (!pointer.visible && config.onHidden === 'return');
        const point = config.source === 'fixed' || returning ? config.position : pointer.position ?? config.position;
        const local = frame.toLocal(point);
        return [local.x, local.y, radius];
      },
    };
  };
}
/** Shared adapter for existing Ceramic program assemblies; same input service. */
export const ceramicDomBinding = ceramicBinding();
