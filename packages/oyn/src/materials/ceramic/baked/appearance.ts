import type { Appearance } from "../../../core/index.js";
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
    return {
      get material() {
        return source;
      },
      update(next) {
        const nextKey = config(next);
        if (next.geometry !== geometry || nextKey !== key) {
          const replacement = bakedCeramic(next.geometry, next);
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
        return "draw";
      },
    };
  },
};
