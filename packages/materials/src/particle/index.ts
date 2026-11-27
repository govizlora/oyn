import { createParameters } from "@oyn/core";
import type { Material } from "@oyn/core";
import { parseColor } from "../shared/color.js";
import {
  particleShader,
  padding,
  strokeSlots,
  wakeLifetime,
} from "./shader.js";

export type ParticleProps = {
  /** Base sRGB pigment; individual grains retain a small, stable color offset. */
  color?: string;
  /** Consumer-owned motion time in seconds. */
  time?: number;
  /** Instantaneous dispersion progress, from intact (0) to invisible (1). */
  exit?: number;
};

export const particle: Material<ParticleProps> = {
  create(initial) {
    const parameters = createParameters(Array(8 + strokeSlots * 8).fill(0));
    let pigment: string | undefined;
    function update({ color, time = 0, exit = 0 }: ParticleProps) {
      if (
        !Number.isFinite(time) ||
        !Number.isFinite(Math.fround(time)) ||
        !Number.isFinite(exit) ||
        exit < 0 ||
        exit > 1
      )
        throw Error("Particle requires finite f32 time and exit in [0, 1].");
      if (color !== pigment) {
        const [red, green, blue, alpha] = parseColor(color);
        parameters.set(0, red);
        parameters.set(1, green);
        parameters.set(2, blue);
        parameters.set(5, alpha);
        pigment = color;
      }
      parameters.set(3, time);
      parameters.set(4, exit);
    }
    update(initial);
    return {
      parameters,
      shader: particleShader,
      passes: ["grains"],
      update,
      measurePadding: () => ({ x: padding, y: padding }),
      bind({ element, inputs, requestDraw, signal }) {
        let radius = "0px";
        // Keep short local strokes, not animation clocks or particle state.
        let previous: { x: number; y: number } | null = null;
        let lastTime = -Infinity;
        let slot = -1;
        let count = 0;
        let batchStart = -Infinity;
        const unsubscribe = inputs.pointer.subscribe(requestDraw);
        signal.addEventListener("abort", unsubscribe, { once: true });
        return {
          measure() {
            radius = getComputedStyle(element).borderTopLeftRadius;
          },
          frame(frame) {
            const { position, inside, visible, focused } =
              inputs.pointer.getSnapshot();
            const p =
              position && inside && visible && focused
                ? frame.toLocal(position)
                : null;
            const time = parameters.get(3);
            if (time < lastTime) {
              count = 0;
              previous = null;
              slot = -1;
            }
            lastTime = time;
            if (
              p &&
              position &&
              previous &&
              (position.x !== previous.x || position.y !== previous.y)
            ) {
              // Coalesce adjacent frame samples into short continuous segments.
              if (
                slot < 0 ||
                time - batchStart >= 0.08 ||
                Math.hypot(
                  p.x - parameters.get(8 + slot * 8),
                  p.y - parameters.get(9 + slot * 8),
                ) > 36
              ) {
                slot = (slot + 1) % strokeSlots;
                count = Math.min(count + 1, strokeSlots);
                batchStart = time;
                const from = frame.toLocal(previous);
                parameters.set(8 + slot * 8, from.x);
                parameters.set(9 + slot * 8, from.y);
              }
              const base = 8 + slot * 8;
              parameters.set(base + 2, p.x);
              parameters.set(base + 3, p.y);
              parameters.set(base + 4, time);
            }
            if (!p) batchStart = -Infinity;
            previous = p ? position : null;
            const r =
              parseFloat(radius) *
              (radius.endsWith("%")
                ? Math.min(frame.width, frame.height) / 100
                : 1);
            let live = 0;
            for (let i = 0; i < count; i++) {
              if (time - parameters.get(12 + 8 * i) < wakeLifetime)
                live |= 1 << i;
            }
            return [0, 0, r, live];
          },
        };
      },
    };
  },
};
