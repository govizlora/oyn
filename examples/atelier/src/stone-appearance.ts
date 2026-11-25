import type { Appearance, Material, SurfaceBindingContext } from "oyn";
import { sampleControlMotion } from "@oyn/ui/control-motion";
import { bindMotion, type MotionNumber } from "oyn/adapters/motion";
import {
  createFlipDiscMaterial,
  type FlipDiscOptions,
} from "oyn/materials/ceramic/flip-disc";

export type StoneProps = FlipDiscOptions & {
  stroke: number;
  pose: (now: number, reduced: boolean) => { angle: number; active: boolean };
};

// Three numeric channels, one consumer clock. The adapter is each channel's sole
// material writer. Ceramic never samples time or decides what pressing means.
function channel(initial: number) {
  let value = initial;
  const listeners = new Set<(value: number) => void>();
  return {
    get: () => value,
    on(_event: "change", listener: (value: number) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set(next: number) {
      if (value === next) return;
      value = next;
      listeners.forEach((listener) => listener(value));
    },
  } satisfies MotionNumber & { set(value: number): void };
}

export const stoneAppearance: Appearance<StoneProps> = {
  create(initial) {
    let props = initial;
    let refresh: (() => void) | undefined;
    const source = createFlipDiscMaterial(initial);
    const material: Material = Object.create(source, {
      bind: {
        value(context: SurfaceBindingContext) {
          const binding = source.bind!(context);
          const el = context.element,
            view = el.ownerDocument.defaultView!;
          const options = { signal: context.signal };
          const reduced = view.matchMedia("(prefers-reduced-motion: reduce)");
          const angle = channel(
            props.pose(view.performance.now(), reduced.matches).angle,
          );
          const travel = channel(0),
            glow = channel(0);
          const disconnect = [
            bindMotion(angle, source.setAngle),
            bindMotion(travel, source.setTravel),
            bindMotion(glow, source.setGlow),
          ];
          let hovering = false,
            pressed = false,
            holdUntil = 0,
            origin = 0,
            destination = 0,
            started = 0,
            frame = 0;
          function tick() {
            frame = 0;
            const now = view.performance.now();
            const target = pressed || now < holdUntil ? 1 : hovering ? 0.46 : 0;
            let position = sampleControlMotion(
              origin,
              destination,
              now - started,
            );
            if (reduced.matches) {
              origin = destination = position = target;
            } else if (target !== destination) {
              origin = position;
              destination = target;
              started = now;
            }
            const { depth, gap } = props.profile;
            travel.set(position * props.stroke * (gap - depth));
            glow.set(Number(el.matches(":focus-visible")));
            const pose = props.pose(now, reduced.matches);
            angle.set(pose.angle);
            if (pose.active || position !== target || now < holdUntil)
              frame = view.requestAnimationFrame(tick);
          }
          function wake() {
            if (!frame) frame = view.requestAnimationFrame(tick);
          }
          const begin = () => {
            if (pressed) return;
            pressed = true;
            holdUntil = view.performance.now() + 75;
            wake();
          };
          const release = () => {
            pressed = false;
            wake();
          };
          const leave = () => {
            hovering = pressed = false;
            holdUntil = 0;
            wake();
          };
          el.addEventListener(
            "pointerenter",
            (event) => {
              hovering = event.pointerType !== "touch";
              wake();
            },
            options,
          );
          el.addEventListener(
            "pointerleave",
            (event) => {
              if (event.pointerType === "touch") {
                hovering = false;
                release();
              } else leave();
            },
            options,
          );
          el.addEventListener(
            "pointerdown",
            (event) => {
              if (event.isPrimary && event.button === 0) begin();
            },
            options,
          );
          el.addEventListener("pointerup", release, options);
          el.addEventListener("pointercancel", leave, options);
          el.addEventListener(
            "keydown",
            (event) => {
              if (event.key === "Enter" || event.key === " ") begin();
            },
            options,
          );
          el.addEventListener(
            "keyup",
            (event) => {
              if (event.key === "Enter" || event.key === " ") release();
            },
            options,
          );
          el.addEventListener("focus", wake, options);
          el.addEventListener("blur", leave, options);
          view.addEventListener("blur", leave, options);
          // Publish configuration changes atomically with the new optics. A
          // pending draw must not see the old travel with a new socket profile.
          const sampleNow = () => {
            view.cancelAnimationFrame(frame);
            tick();
          };
          reduced.addEventListener("change", sampleNow, options);
          refresh = sampleNow;
          sampleNow();
          context.signal.addEventListener(
            "abort",
            () => {
              refresh = undefined;
              view.cancelAnimationFrame(frame);
              disconnect.forEach((off) => off());
            },
            { once: true },
          );
          return binding;
        },
      },
    });
    return {
      material,
      update(next) {
        const opticalUpdate = source.update(next);
        const moved =
          props.pose !== next.pose ||
          props.stroke !== next.stroke ||
          props.profile !== next.profile;
        props = next;
        if (moved) refresh?.();
        return opticalUpdate;
      },
    };
  },
};
