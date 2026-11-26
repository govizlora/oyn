// Isolate one production grain for optical metrology. Other grains would
// overlap it and make a translation indistinguishable from a radius change.
import { createEngine, createSurface } from "@oyn/core";
import { particle, type ParticleProps } from "@oyn/materials";

export function mountProbe(host: HTMLElement) {
  const engine = createEngine();
  const props = { color: "#fff", time: 0 };
  const surface = createSurface(engine, {
    material: {
      create(p: ParticleProps) {
        const instance = particle.create(p);
        const read = "let n = noise(cell, i*1531u);";
        if (!instance.shader.includes(read))
          throw Error("Missing grain identity");
        instance.shader = instance.shader.replace(
          read,
          "if (i != 3u || any(cell != vec2i(0))) { continue; }\n" + read,
        );
        return instance;
      },
    },
    props,
  });
  surface.bind(host);
  engine.start();
  return (time: number) => surface.update({ ...props, time });
}
