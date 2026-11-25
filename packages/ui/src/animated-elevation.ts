import type { CeramicMaterial } from "@oyn/ceramic";
import type { SurfaceBindingContext } from "@oyn/surface";
import { bindMotion } from "@oyn/surface/adapters/motion";
import { createControlMotion } from "./control-motion.js";

/** A bound control has one elevation writer; a relief-only face vanishes at zero. */
export function bindAnimatedElevation(
  source: CeramicMaterial,
  context: SurfaceBindingContext,
  initial: number,
  omitFlat: () => boolean,
) {
  const binding = source.bind!(context);
  const motion = createControlMotion(
    context.element.ownerDocument.defaultView!,
    initial,
  );
  const disconnect = bindMotion(motion, source.setElevation);
  context.signal.addEventListener(
    "abort",
    () => {
      disconnect();
      motion.dispose();
    },
    { once: true },
  );
  const target = binding.material!;
  return {
    motion,
    binding: {
      ...binding,
      material: Object.create(target, {
        passes: {
          get: () => (omitFlat() && motion.get() === 0 ? [] : target.passes),
        },
      }) as typeof target,
    },
  };
}
