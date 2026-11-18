import { environmentBinding, preferredColorScheme } from "./environment.js";
import { ceramicBinding } from "./interaction.js";
import { ceramicSurfaceWGSL } from "./effects/ceramic-surface.js";
import { createParameters, type Material } from "@oyn/surface";
import { frameWGSL } from "./effects/frame.js";
import {
  ceramicFinish,
  snapshotCeramicOptions,
  type CeramicOptions,
} from "./finish.js";
import { shadowBounds } from "./bounds.js";
import { geometryWGSL } from "./effects/geometry.js";
import { ceramicLightingWGSL } from "./effects/ceramic-lighting.js";
import { ceramicGeometryWGSL } from "./effects/ceramic-geometry.js";
import { gaussianCoverageWGSL, ceramicShadowWGSL } from "./effects/shadow.js";

export const cardWGSL = /* wgsl */ `
${frameWGSL}
${geometryWGSL}
${ceramicLightingWGSL}
${ceramicGeometryWGSL}
${gaussianCoverageWGSL}
struct Parameters { card:vec4f, scene:vec4f, ceramic:CeramicOptics }
@group(0) @binding(1) var<uniform> m:Parameters;
fn sceneScale()->f32 {return min(frame.rect.z/m.scene.x,frame.rect.w/m.scene.y);}
fn geometryShadowCoverage(p:vec2f,projection:f32,blur:f32,height:f32)->f32 {
 let scale=sceneScale();return roundedCoverage(p,m.card.xy*scale*projection,m.card.z*scale*projection,blur);
}
fn geometryShadowDistance(p:vec2f)->f32 {
 let scale=sceneScale();return roundedRect(p,m.card.xy*scale,m.card.z*scale);
}
${ceramicShadowWGSL}
@fragment fn shadow(in:VertexOut)->@location(0) vec4f {
 let b=in.card.zw*0.5;
 return ceramicShadow(in.local-b,in.card.xy+b-frame.viewportLight.zw,m.card.w*sceneScale(),m.ceramic.shadow);
}
fn ceramicGeometry(in:VertexOut)->CeramicGeometry {
 let scale=sceneScale();let center=in.card.xy+in.card.zw*0.5;
 let g=roundedCeramicGeometry(in.local-in.card.zw*0.5,m.card.xy*scale,m.card.z*scale,max(1,m.ceramic.shape.z),center);
 return g;
}
fn ceramicOptics()->CeramicOptics {return m.ceramic;}
${ceramicSurfaceWGSL}
`;
/** An analytic, already-authored geometry adapter. No compiler or CSG tree. */
function resolvedCardCeramic(options: {
  width: number;
  height: number;
  radius: number;
  elevation: number;
  maxElevation?: number;
  finish?: Omit<CeramicOptions, "elevation" | "maxElevation">;
}) {
  const { width, height, radius, elevation } = options;
  const maxElevation = options.maxElevation ?? elevation;
  const finish = ceramicFinish({ ...options.finish, elevation, maxElevation });
  function validate(r: number, e: number) {
    if (
      ![width, height].every((v) => Number.isFinite(v) && v > 0) ||
      !Number.isFinite(r) ||
      r < 0 ||
      r > Math.min(width, height) / 2 ||
      e < 0 ||
      e > maxElevation
    )
      throw Error("Invalid card geometry.");
    finish.validateSignedElevation(e);
  }
  validate(radius, elevation);
  const parameters = createParameters([
    width / 2,
    height / 2,
    radius,
    elevation,
    width,
    height,
    0,
    0,
    ...finish.values,
  ]);
  const shadow = new Float32Array(finish.values.slice(12, 16));
  const material: Material = {
    bind: ceramicBinding(options.finish?.light),
    shader: cardWGSL,
    loadWebGL2: loadCard,
    parameters,
    passes: finish.shadows ? ["shadow", "surface"] : ["surface"],
    measurePadding: (w, h) =>
      finish.shadows
        ? shadowBounds(
            w,
            h,
            maxElevation * Math.min(w / width, h / height),
            shadow,
          )
        : { x: 0, y: 0 },
  };
  return {
    ...material,
    setDimensions(radius: number, elevation: number) {
      validate(radius, elevation);
      parameters.set(2, radius);
      parameters.set(3, elevation);
    },
  };
}

export function cardCeramic(
  options: Parameters<typeof resolvedCardCeramic>[0],
) {
  const config = {
    ...options,
    finish: snapshotCeramicOptions(options.finish ?? {}),
  };
  let radius = config.radius,
    elevation = config.elevation;
  const maxElevation = config.maxElevation ?? elevation;
  const listeners = new Set<() => void>();
  const create = (colorScheme: import("./environment.js").ColorScheme) =>
    resolvedCardCeramic({
      ...config,
      radius,
      elevation,
      maxElevation,
      finish: { ...config.finish, colorScheme },
    });
  const material = create(config.finish.colorScheme ?? preferredColorScheme());
  const setDimensions = material.setDimensions;
  material.setDimensions = (r, e) => {
    setDimensions(r, e);
    radius = r;
    elevation = e;
    listeners.forEach((update) => update());
  };
  Object.defineProperty(material, "bind", {
    value: environmentBinding(config.finish.colorScheme, create, (update) => {
      listeners.add(update);
      return () => listeners.delete(update);
    }),
  });
  return material;
}

function loadCard() {
  return import("./generated/card.js").then((m) => m.default);
}
