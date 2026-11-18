import type { Appearance, Material } from "@oyn/surface";
import { ceramicDomBinding } from "../interaction.js";
import type { BakedGeometry } from "./geometry.js";
import { bakedCeramic, type BakedOptions } from "./material.js";

export type BakedProps = BakedOptions & { geometry: BakedGeometry };
/** Declarative baked appearance. Pose updates preserve parameters and static GPU data. */
export const baked: Appearance<BakedProps> = {
  create(props) {
    let geometry = props.geometry;
    const config = (props: Readonly<BakedProps>) => {
      const { geometry: _, elevation: __, rotation: ___, ...finish } = props;
      return JSON.stringify(finish);
    };
    let key = config(props);
    let source = bakedCeramic(geometry, props);
    const parameters = source.parameters;
    const material: Material = {
      bind: ceramicDomBinding,
      parameters,
      get shader() {
        return source.shader;
      },
      get passes() {
        return source.passes;
      },
      measurePadding: (w, h) => source.measurePadding(w, h),
      get data() {
        return source.data;
      },
    };
    return {
      material,
      update(next) {
        const nextKey = config(next);
        if (next.geometry !== geometry || nextKey !== key) {
          const replacement = bakedCeramic(next.geometry, next);
          replacement.parameters
            .snapshot()
            .forEach((v, i) => parameters.set(i, v));
          source = replacement;
          geometry = next.geometry;
          key = nextKey;
          return "layout";
        }
        const elevation = next.elevation ?? geometry.height,
          rotation = next.rotation ?? 0;
        if (
          source.parameters.get(8) === elevation &&
          source.parameters.get(9) === rotation
        )
          return;
        source.setElevation(elevation);
        source.setRotation(rotation);
        parameters.set(8, source.parameters.get(8));
        parameters.set(9, source.parameters.get(9));
        return "draw";
      },
    };
  },
};
