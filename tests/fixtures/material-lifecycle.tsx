import {
  StrictMode,
  Suspense,
  startTransition,
  useLayoutEffect,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import { type Material, type SurfaceBinding } from "@oyn/core";
import { OynProvider, useMaterial } from "@oyn/react";
import type { ColorScheme } from "@oyn/materials";
import { ceramic, type CeramicProps } from "@oyn/materials";

const records = {
  failUpdate: false,
  creates: 0,
  disposes: 0,
  createdElevations: [] as (number | undefined)[],
  updatedElevations: [] as (number | undefined)[],
  frames: [] as number[][],
  errors: [] as string[],
};
const probe: Material<CeramicProps> = {
  create(props) {
    records.creates++;
    records.createdElevations.push(props.elevation);
    const instance = ceramic.create(props);
    const cache = new Map<
      NonNullable<typeof instance.bind>,
      NonNullable<typeof instance.bind>
    >();
    let binder = instance.bind;
    const update = instance.update!,
      dispose = instance.dispose;
    Object.defineProperty(instance, "bind", {
      configurable: true,
      get() {
        if (!binder) return;
        const original = binder;
        if (!cache.has(original))
          cache.set(original, (ctx) => {
            const binding = original(ctx);
            return {
              ...binding,
              frame(frame) {
                const extras = binding.frame!(frame);
                records.frames.push([...extras]);
                return extras;
              },
            } satisfies SurfaceBinding;
          });
        return cache.get(original)!;
      },
      set(next) {
        binder = next;
      },
    });
    instance.update = (next) => {
      if (records.failUpdate) throw Error("test material failure");
      records.updatedElevations.push(next.elevation);
      return update(next);
    };
    instance.dispose = () => {
      records.disposes++;
      dispose?.();
    };
    return instance;
  },
};
const other: Material<CeramicProps> = { create: probe.create };
// No bind hook: a surface with no pointer consumer must not subscribe or redraw on it.
const inert: Material<{}> = {
  create() {
    const source = ceramic.create({
      light: { source: "fixed" },
      colorScheme: "light",
    });
    return { ...source, bind: undefined, update() {} };
  },
};
const pending = new Promise<never>(() => {});
function App() {
  const [suspended, setSuspended] = useState(false);
  const [attached, setAttached] = useState(true);
  const [props, setProps] = useState<CeramicProps>({ elevation: 16 });
  const [colorScheme, setMode] = useState<ColorScheme>("light");
  const [mounted, setMounted] = useState(true),
    [alternate, setAlternate] = useState(false),
    [tag, setTag] = useState(false);
  const [quiet, setQuiet] = useState(false),
    [tick, setTick] = useState(0);
  useLayoutEffect(() => {
    Object.assign(window, {
      api: {
        records,
        prepare: () =>
          startTransition(() => {
            setProps({ elevation: 77 });
            setSuspended(true);
          }),
        cancel: () => {
          setProps({ elevation: 16 });
          setSuspended(false);
        },
        setAttached,
        setProps,
        setMode,
        setMounted,
        setAlternate,
        setTag,
        setQuiet,
        rerender: () => setTick((t) => t + 1),
      },
    });
  });
  return (
    <OynProvider>
      <span data-tick={tick} />
      <Suspense fallback={null}>
        {mounted && (
          <Sample
            suspended={suspended}
            material={quiet ? inert : alternate ? other : probe}
            props={{ ...props, colorScheme }}
            attached={attached}
            tag={tag}
          />
        )}
      </Suspense>
    </OynProvider>
  );
}
function Sample({
  material,
  props,
  attached,
  tag,
  suspended,
}: {
  suspended: boolean;
  material: Material<CeramicProps>;
  props: CeramicProps;
  attached: boolean;
  tag: boolean;
}) {
  const surfaceRef = useMaterial({ material, props });
  if (suspended) throw pending;
  const ref = attached ? surfaceRef : undefined;
  return tag ? (
    <section
      id="sample"
      ref={ref}
      style={{ width: 240, height: 140, borderRadius: 24, margin: 150 }}
    />
  ) : (
    <div
      id="sample"
      ref={ref}
      style={{ width: 240, height: 140, borderRadius: 24, margin: 150 }}
    />
  );
}
const root = createRoot(document.getElementById("root")!);
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
Object.assign(window, { unmountSurface: () => root.unmount() });
