import { type Material } from "oyn";
import { OynProvider, useMaterial } from "oyn/react";
import { ceramic, type CeramicProps } from "oyn/materials/ceramic";
const alternate: Material<{ phase: number }> = {
  create() {
    throw Error("type test only");
  },
};
function Generic<P>(material: Material<P>, props: P) {
  return useMaterial({ material, props });
}
function Check() {
  const ref = useMaterial({
    material: ceramic,
    props: { elevation: 12, light: { onBlur: "return" } },
  });
  useMaterial({ material: alternate, props: { phase: 2 } });
  useMaterial({
    material: ceramic,
    props: { color: "#c0c0c0", colorScheme: "dark", lighting: "soft" },
  });
  useMaterial({
    material: ceramic,
    // @ts-expect-error Theme palettes belong upstream.
    props: { color: { light: "#fff", dark: "#000" } },
  });
  // @ts-expect-error Optical branches are not color schemes.
  useMaterial({ material: ceramic, props: { lighting: "dark" } });
  // @ts-expect-error Removed parallel base-color control.
  useMaterial({ material: ceramic, props: { lightSurface: 192 } });
  Generic(ceramic, { elevation: 3 } satisfies CeramicProps);
  useMaterial({
    material: ceramic,
    // @ts-expect-error Animation curves belong to the consumer, not Ceramic.
    props: { elevation: 8, transition: "spring" },
  });
  useMaterial({
    material: ceramic,
    // @ts-expect-error External MotionNumber values use bindMotion, not numeric props.
    props: { elevation: { get: () => 8, on: () => () => {} } },
  });
  const errors = (
    // @ts-expect-error GPU failure handling is not a Provider callback API.
    <OynProvider onError={() => {}}>
      <div />
    </OynProvider>
  );
  // @ts-expect-error Unknown Ceramic prop.
  useMaterial({ material: ceramic, props: { phase: 1 } });
  // @ts-expect-error Numeric elevation required.
  useMaterial({ material: ceramic, props: { elevation: "high" } });
  // @ts-expect-error Material props are not interchangeable.
  useMaterial({ material: alternate, props: { elevation: 3 } });
  // @ts-expect-error Required material prop is missing.
  useMaterial({ material: alternate, props: {} });
  // @ts-expect-error Legacy material-only hook has been removed.
  useMaterial({ material: {} });
  // @ts-expect-error Ref composition belongs to the consumer, not useMaterial.
  useMaterial({ material: ceramic, props: {} }, () => {});
  // @ts-expect-error Surface lifetime is controlled by DOM binding, not an enabled option.
  useMaterial({ material: ceramic, props: {}, enabled: false });
  const provider = (
    // @ts-expect-error Theme is a material prop, not a provider responsibility.
    <OynProvider mode="dark">
      <div />
    </OynProvider>
  );
  // @ts-expect-error Material no longer receives an ambient context.
  ceramic.create({}, { colorScheme: "dark" });
  return <button ref={ref} />;
}

// @ts-expect-error React hooks are not exported by Core.
import { useMaterial as coreHook } from "oyn";
// @ts-expect-error The removed wrapper has no compatibility export.
import type { Appearance } from "oyn";
// @ts-expect-error The instance itself is the drawing object.
ceramic.create({}).material;

// Definitions preserve their concrete instance controls, not just the renderer shape.
ceramic.create({ elevation: 8 }).setElevation(-3);

// @ts-expect-error A material no longer exposes a second GPU backend.
ceramic.create({}).loadWebGL2;
