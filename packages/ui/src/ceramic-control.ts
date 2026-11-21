import { useMemo, type Ref } from "react";
import { mergeProps } from "@ui-sdk/react/primitive";
import {
  useSurface,
  type Appearance,
  type Material,
  type SurfaceBindingContext,
} from "@oyn/surface";
import { createCeramicMaterial } from "@oyn/ceramic";
import { bindMotion } from "@oyn/surface/adapters/motion";
import { createControlMotion } from "./control-motion.js";

// Zero relief is exactly unpainted; there is no signed-program sentinel.
const flat = 0;
const unavailable =
  ":disabled,[aria-disabled=true],[data-disabled],[aria-busy=true],[data-pending]";
const actionable =
  "button,a[href],summary,[role=button],[role=switch],[role=tab]";

/** UI owns gestures and animation values; Surface only binds and renders them. */
const control: Appearance<number | null> = {
  create(initial) {
    let rest = initial;
    // Selected keys may start recessed and become raised without a new canvas.
    const maxElevation = Math.max(8, initial ?? 0);
    const source = createCeramicMaterial({
      elevation: rest ?? flat,
      maxElevation,
    });
    let respond: (() => void) | undefined;
    // Extend only the binding, preserving the source material's live contract.
    const material: Material = Object.create(source, {
      bind: {
        value(context: SurfaceBindingContext) {
          const binding = source.bind!(context);
          const element = context.element;
          const doc = element.ownerDocument;
          const view = doc.defaultView!;
          const options = { signal: context.signal };
          const motion = createControlMotion(view, rest ?? flat);
          const disconnect = bindMotion(motion, source.setElevation);
          context.signal.addEventListener(
            "abort",
            () => {
              disconnect();
              motion.dispose();
            },
            { once: true },
          );
          let hovered =
            view.matchMedia("(hover: hover)").matches &&
            element.matches(":hover");
          let focused = element.matches(":focus-visible");
          let key: string | undefined;
          let pointer: { id: number; inside: boolean } | undefined;

          function releasePointer() {
            pointer = undefined;
            doc.removeEventListener("pointerup", endPointer, true);
            doc.removeEventListener("pointercancel", endPointer, true);
          }
          function update() {
            const disabled =
              element.matches(unavailable) || !!element.closest("[inert]");
            if (disabled) {
              releasePointer();
              key = undefined;
              hovered = focused = false;
            }
            const idle = rest ?? flat;
            const enabled = !disabled && element.matches(actionable);
            const pressed = key !== undefined || !!pointer?.inside;
            const target = !enabled
              ? idle
              : pressed
                ? Math.min(-6, idle - 4)
                : hovered || focused
                  ? Math.min(-2.8, idle - 1.6)
                  : idle;
            motion.setTarget(target);
          }
          function endPointer(event: PointerEvent) {
            if (event.pointerId !== pointer?.id) return;
            if (event.type === "pointercancel") hovered = false;
            releasePointer();
            update();
          }
          element.addEventListener(
            "pointerenter",
            (event) => {
              hovered = event.pointerType !== "touch";
              if (pointer?.id === event.pointerId) pointer.inside = true;
              update();
            },
            options,
          );
          element.addEventListener(
            "pointerleave",
            () => {
              hovered = false;
              if (pointer) pointer.inside = false;
              update();
            },
            options,
          );
          element.addEventListener(
            "pointerdown",
            (event) => {
              if (event.button !== 0 || !event.isPrimary || pointer) return;
              pointer = { id: event.pointerId, inside: true };
              doc.addEventListener("pointerup", endPointer, true);
              doc.addEventListener("pointercancel", endPointer, true);
              update();
            },
            options,
          );
          // Pointer capture can suppress enter/leave. It must not extend the
          // material's hit area or leave a key pressed after an outside release.
          element.addEventListener(
            "pointermove",
            (event) => {
              if (pointer?.id !== event.pointerId) return;
              const bounds = element.getBoundingClientRect();
              pointer.inside =
                event.clientX >= bounds.left &&
                event.clientX < bounds.right &&
                event.clientY >= bounds.top &&
                event.clientY < bounds.bottom;
              hovered = event.pointerType !== "touch" && pointer.inside;
              update();
            },
            options,
          );
          element.addEventListener(
            "lostpointercapture",
            () => {
              releasePointer();
              update();
            },
            options,
          );
          element.addEventListener(
            "focus",
            () => {
              focused = element.matches(":focus-visible");
              update();
            },
            options,
          );
          element.addEventListener(
            "blur",
            () => {
              focused = false;
              key = undefined;
              update();
            },
            options,
          );
          element.addEventListener(
            "keydown",
            (event) => {
              if (
                event.target !== element ||
                event.altKey ||
                event.ctrlKey ||
                event.metaKey
              )
                return;
              if (
                event.key === "Enter" ||
                (event.key === " " && !element.matches("a[href]"))
              ) {
                key = event.key;
                update();
              }
            },
            options,
          );
          element.addEventListener(
            "keyup",
            (event) => {
              if (event.key !== key) return;
              key = undefined;
              update();
            },
            options,
          );
          view.addEventListener(
            "blur",
            () => {
              releasePointer();
              key = undefined;
              hovered = focused = false;
              update();
            },
            options,
          );
          // Pending/disabled can change without another gesture, including an
          // inherited disabled fieldset. They are facts from the DOM/SDK, not state here.
          const observer = new MutationObserver((records) => {
            if (
              records.some((record) =>
                (record.target as Element).contains(element),
              )
            )
              update();
          });
          observer.observe(doc.documentElement, {
            subtree: true,
            attributes: true,
            attributeFilter: [
              "disabled",
              "aria-disabled",
              "data-disabled",
              "aria-busy",
              "data-pending",
              "inert",
            ],
          });
          respond = update;
          update();
          context.signal.addEventListener(
            "abort",
            () => {
              releasePointer();
              observer.disconnect();
              respond = undefined;
            },
            { once: true },
          );
          const target = binding.material!;
          return {
            ...binding,
            material: Object.create(target, {
              // Presence is derived from the existing motion value, not another
              // visible/enabled state or a second ref-lifetime controller.
              passes: {
                get: () =>
                  rest === null && motion.get() === flat ? [] : target.passes,
              },
            }),
          };
        },
      },
    });
    return {
      material,
      update(next) {
        if (rest === next) return;
        rest = next;
        if (respond) respond();
        return "draw";
      },
    };
  },
};

export function useCeramicControl(rest: number | null, ref?: Ref<HTMLElement>) {
  const bind = useSurface({ appearance: control, props: rest });
  return {
    ...useMemo(() => mergeProps({ ref: bind }, { ref }), [bind, ref]),
    "data-oyn-control": "",
    "data-oyn-face": rest === null ? "outline" : rest < 0 ? "well" : "key",
  } as const;
}
