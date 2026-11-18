import type { Material, SurfaceBindingContext } from "@oyn/surface";

/** The surrounding page/section environment, independent of surface lighting. */
export type ColorScheme = "light" | "dark";

/** No DOM: use browser preference if available, otherwise light (including SSR). */
export function preferredColorScheme(): ColorScheme {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function elementColorScheme(
  element: HTMLElement,
  preferred: ColorScheme,
): ColorScheme {
  const tokens = getComputedStyle(element).colorScheme.split(/\s+/);
  const light = tokens.includes("light"),
    dark = tokens.includes("dark");
  return light !== dark ? (dark ? "dark" : "light") : preferred;
}

/**
 * Attach one target-local material without leaking theme policy into Surface.
 * Both automatic and explicit configurations use this same binding path.
 */
export function environmentBinding(
  explicit: ColorScheme | undefined,
  create: (scheme: ColorScheme) => Material,
  connect?: (update: () => void) => () => void,
): NonNullable<Material["bind"]> {
  return (context: SurfaceBindingContext) => {
    const media =
      explicit === undefined
        ? context.element.ownerDocument.defaultView!.matchMedia(
            "(prefers-color-scheme: dark)",
          )
        : undefined;
    const read = () =>
      explicit ??
      elementColorScheme(context.element, media?.matches ? "dark" : "light");
    let scheme = read();
    let source = create(scheme);
    const parameters = source.parameters;
    const material: Material = {
      parameters,
      get loadWebGL2() {
        return source.loadWebGL2;
      },
      get shader() {
        return source.shader;
      },
      get passes() {
        return source.passes;
      },
      get data() {
        return source.data;
      },
      measurePadding: (w, h) => source.measurePadding(w, h),
    };
    // Light input policy is independent of theme; its subscription stays stable.
    const input = source.bind?.(context);
    const refresh = () => {
      const next = create(scheme);
      next.parameters.snapshot().forEach((v, i) => parameters.set(i, v));
      source = next;
    };
    const measure = () => {
      const next = read();
      if (scheme !== next) {
        scheme = next;
        refresh();
      }
      input?.measure?.();
    };
    const request = () => context.requestMeasure();
    media?.addEventListener("change", request);
    // CSS inheritance can change on any ancestor, including html outside Surface's
    // body observer. Stylesheet edits/load and class/style changes invalidate reads.
    const observer = media
      ? new MutationObserver((records) => {
          if (
            records.some((record) => {
              if (record.type === "attributes") {
                const target = record.target as Element;
                return (
                  target.contains(context.element) ||
                  target.matches("style,link")
                );
              }
              const target =
                record.target instanceof Element
                  ? record.target
                  : record.target.parentElement;
              return (
                !!target?.closest("style,head") || !context.element.isConnected
              );
            })
          )
            request();
        })
      : undefined;
    observer?.observe(context.element.ownerDocument.documentElement, {
      subtree: true,
      attributes: true,
      childList: true,
      characterData: true,
    });
    const doc = context.element.ownerDocument;
    if (media) {
      doc.addEventListener("load", request, true);
      doc.defaultView?.addEventListener("resize", request);
    }
    const unsubscribe = connect?.(refresh);
    context.signal.addEventListener(
      "abort",
      () => {
        observer?.disconnect();
        media?.removeEventListener("change", request);
        doc.removeEventListener("load", request, true);
        doc.defaultView?.removeEventListener("resize", request);
        unsubscribe?.();
      },
      { once: true },
    );
    return { material, measure, frame: input?.frame, dispose: input?.dispose };
  };
}
