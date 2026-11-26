import { useMemo, type Ref } from "react";
import { mergeProps } from "@ui-sdk/react/primitive";
import {
  type Material,
  type MaterialInstance,
  type SurfaceBindingContext,
} from "@oyn/core";
import { createCeramicMaterial, useMaterial } from "@oyn/react";
import { bindAnimatedElevation } from "./animated-elevation.js";

// Unpigmented controls have nothing to draw at zero relief.
const flat = 0;
const unavailable =
  ":disabled,[aria-disabled=true],[data-disabled],[aria-busy=true],[data-pending]";
const actionable =
  "button,a[href],summary,[role=button],[role=switch],[role=tab]";

/** UI owns gestures and animation values; Surface only binds and renders them. */
type ControlState = {
  rest: number | null;
  hoverOffset?: number;
  pressElevation?: number;
  maxElevation?: number;
};

const control: Material<ControlState> = {
  create(initial) {
    let { rest, hoverOffset, pressElevation } = initial;
    // Selected keys may start recessed and become raised without a new canvas.
    const maxElevation = Math.max(8, rest ?? flat, initial.maxElevation ?? 0);
    const source = createCeramicMaterial({
      color: "transparent",
      elevation: rest ?? flat,
      maxElevation,
    });
    let respond: (() => void) | undefined;
    // Extend only the binding, preserving the source material's live contract.
    const material: MaterialInstance<ControlState> = Object.create(source, {
      bind: {
        value(context: SurfaceBindingContext) {
          const { motion, binding } = bindAnimatedElevation(
            source,
            context,
            rest ?? flat,
            () => rest === null,
          );
          const element = context.element;
          const doc = element.ownerDocument;
          const view = doc.defaultView!;
          const options = { signal: context.signal };
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
                ? (pressElevation ?? Math.min(-6, idle - 4))
                : hovered || focused
                  ? hoverOffset === undefined
                    ? Math.min(-2.8, idle - 1.6)
                    : idle + hoverOffset
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
          return binding;
        },
      },
    });
    return Object.assign(material, {
      update(next: Readonly<ControlState>) {
        if (
          rest === next.rest &&
          hoverOffset === next.hoverOffset &&
          pressElevation === next.pressElevation
        )
          return;
        ({ rest, hoverOffset, pressElevation } = next);
        if (respond) respond();
        return "draw";
      },
    });
  },
};

export function useCeramicControl(
  rest: number | null,
  ref?: Ref<HTMLElement>,
  options?: Pick<
    ControlState,
    "hoverOffset" | "pressElevation" | "maxElevation"
  >,
) {
  const bind = useMaterial({ material: control, props: { rest, ...options } });
  return {
    ...useMemo(() => mergeProps({ ref: bind }, { ref }), [bind, ref]),
    "data-oyn-control": "",
    "data-oyn-face": rest === null ? "outline" : rest < 0 ? "well" : "key",
  } as const;
}
