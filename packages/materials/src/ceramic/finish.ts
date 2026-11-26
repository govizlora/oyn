import type { CeramicLight } from "./interaction.js";
import { preferredColorScheme, type ColorScheme } from "./environment.js";
import { validateElevation } from "./bounds.js";
import { parseColor } from "../shared/color.js";
import { insetWallSlope } from "./inset.js";
import defaults from "./defaults.json" with { type: "json" };
/** Surface lighting model, independent of the surrounding color scheme. */
export type CeramicLighting = "soft" | "glossy";

/**
 * Ceramic owns environment and lighting policy for each host.
 */
export type CeramicOptions = {
  /**
   * Analytic relief: positive raised, negative recessed, zero flat.
   * @defaultValue 16
   */
  elevation?: number;
  /**
   * Projected-shadow light height; must exceed raised elevation.
   * @defaultValue 480
   */
  shadowLightHeight?: number;
  /**
   * Area-light size controlling shadow blur.
   * @defaultValue 240
   */
  shadowLightSize?: number;
  /**
   * Cast-shadow opacity in light environments only, in [0,1].
   * @defaultValue 0.09
   */
  shadowStrength?: number;
  /**
   * Contact-shadow opacity in light environments only, in [0,1].
   * @defaultValue 0.015
   */
  contactShadowStrength?: number;
  /**
   * Glossy edge width.
   * @defaultValue 6
   */
  rim?: number;
  /**
   * Surface-reflection light height, separate from shadow projection.
   * @defaultValue 24
   */
  lightZ?: number;
  /**
   * Glossy reflection intensity.
   * @defaultValue 1
   */
  reflectionStrength?: number;
  /**
   * Glossy specular sharpness multiplier.
   * @defaultValue 1
   */
  sharpness?: number;
  /** Glossy outer (Fresnel) reflection strength; defaults to reflectionStrength. */
  rimReflectionStrength?: number;
  /**
   * Soft edge width.
   * @defaultValue 3
   */
  lightRim?: number;
  /**
   * Soft highlight intensity.
   * @defaultValue 2.4
   */
  lightReflectionStrength?: number;
  /**
   * Soft highlight spread in [0,1].
   * @defaultValue 0.8
   */
  lightReflectionSpread?: number;
  /**
   * Soft backlit-edge shade in [0,1].
   * @defaultValue 0.025
   */
  lightEdgeShade?: number;
  /**
   * Glossy reflected light on the receiver outside a raised surface.
   * @defaultValue 0.025
   */
  darkFrost?: number;
  /** Outer glow reach in CSS pixels per pixel of positive elevation. */
  frostSpread?: number;
  /**
   * Soft surface illumination in [0,1].
   * @defaultValue 0.2
   */
  lightSurfaceTop?: number;
  /**
   * Soft surface shade in [0,1].
   * @defaultValue 0.012
   */
  lightSurfaceShade?: number;
  /** Pointer/fixed light-source policy, independent of environment and lighting. */
  light?: CeramicLight;
  /**
   * One opaque sRGB base color (#RGB, #RRGGBB or numeric rgb()), or "inverse"
   * for the opposite default pigment without changing the lighting environment.
   * The signed analytic material also accepts "transparent" for relief without pigment.
   * Theme palettes must be resolved by the caller.
   * @defaultValue #f0f0f0 in light environments; #0c0c0c in dark environments.
   */
  color?: string;
  /**
   * Surrounding environment, NOT the surface lighting model.
   * Explicit value wins; otherwise use the target's inherited CSS color-scheme,
   * then browser prefers-color-scheme when CSS is normal or allows both schemes.
   * Automatic selection follows CSS changes and browser preference changes.
   * Without a DOM target use browser preference; without a browser use light.
   * Dark disables cast and contact shadows, even with nonzero shadow strengths.
   */
  colorScheme?: ColorScheme;
  /**
   * Override automatic surface lighting. Soft uses surface gradients and softer
   * highlights; glossy uses specular/Fresnel edge reflection.
   * By default compare relative luminance of the resolved sRGB color against
   * #c0c0c0: strictly above -> soft; equal or below -> glossy.
   * Channels are decoded to linear sRGB before applying Rec.709 weights.
   * Negative elevation retains its concave wall shading without a ground glow.
   */
  lighting?: CeramicLighting;
  /**
   * Maximum raised elevation reserved for canvas padding; not a clamp or target.
   * Omission reserves initial elevation. Cannot shrink below initial height.
   */
  maxElevation?: number;
};

// Own caller-provided nested light policy at every public configuration boundary.
export function snapshotCeramicOptions<T extends CeramicOptions>(
  options: T,
): T {
  return {
    ...options,
    light: options.light
      ? {
          ...options.light,
          position: options.light.position
            ? { ...options.light.position }
            : undefined,
        }
      : undefined,
  };
}

/** Relative luminance of display/sRGB values, not encoded channel brightness. */
export function relativeLuminance(rgb: readonly number[]): number {
  const linear = rgb.map((v) =>
    v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
  );
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}
const lightingThreshold = relativeLuminance([192 / 255, 192 / 255, 192 / 255]);
export function ceramicFinish(options: CeramicOptions = {}) {
  const settings = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof typeof defaults)[]) {
    const value = options[key];
    if (value !== undefined) settings[key] = value;
  }
  for (const [name, value] of Object.entries(settings)) {
    if (
      !Number.isFinite(value) ||
      !Number.isFinite(Math.fround(value)) ||
      (value < 0 && name !== "elevation")
    )
      throw Error(`Invalid Ceramic ${name}.`);
  }
  for (const key of [
    "shadowStrength",
    "contactShadowStrength",
    "lightReflectionSpread",
    "lightEdgeShade",
    "lightSurfaceTop",
    "lightSurfaceShade",
  ] as const) {
    if (settings[key] > 1) throw Error(`Ceramic ${key} must be in [0, 1].`);
  }
  if (
    settings.lightZ < 1 ||
    settings.shadowLightHeight <= 0 ||
    settings.sharpness <= 0
  )
    throw Error("Invalid Ceramic light height or sharpness.");
  const lightHeight = Math.fround(settings.shadowLightHeight);
  const validateSignedElevation = (value: number) => {
    if (!Number.isFinite(value) || !Number.isFinite(Math.fround(value)))
      throw Error("Ceramic elevation must be a finite f32.");
    if (value < 0 && !Number.isFinite(Math.fround(-value / insetWallSlope)))
      throw Error("Ceramic elevation exceeds optical parameter range.");
    validateElevation(Math.max(0, value), lightHeight);
  };
  validateSignedElevation(settings.elevation);
  const elevation = settings.elevation;
  if (options.maxElevation !== undefined)
    validateElevation(options.maxElevation, lightHeight);
  if (
    options.colorScheme !== undefined &&
    !["light", "dark"].includes(options.colorScheme)
  )
    throw Error("Invalid Ceramic colorScheme.");
  if (
    options.lighting !== undefined &&
    !["soft", "glossy"].includes(options.lighting)
  )
    throw Error("Invalid Ceramic lighting.");
  if (options.color !== undefined && typeof options.color !== "string")
    throw Error("Ceramic color must be a single string.");
  const environment = options.colorScheme ?? preferredColorScheme();
  const inverse = options.color === "inverse";
  const clear = options.color === "transparent";
  const defaultColor =
    (environment === "dark") !== inverse ? "#0c0c0c" : "#f0f0f0";
  const rgb = parseColor(
    inverse || clear ? defaultColor : (options.color ?? defaultColor),
  );
  const lighting =
    options.lighting ??
    (relativeLuminance(rgb) > lightingThreshold ? "soft" : "glossy");
  const glossy = lighting === "glossy";
  const shadows = environment === "light";
  const rimStrength =
    options.rimReflectionStrength ?? settings.reflectionStrength;
  if (!Number.isFinite(Math.fround(rimStrength)) || rimStrength < 0)
    throw Error("Invalid Ceramic rimReflectionStrength.");
  const values = [
    0,
    elevation,
    glossy ? settings.rim : settings.lightRim,
    Number(environment === "dark"),
    ...rgb,
    Number(!clear),
    Number(glossy),
    Number(!glossy),
    settings.frostSpread,
    0,
    lightHeight,
    settings.shadowLightSize,
    shadows ? settings.shadowStrength : 0,
    shadows ? settings.contactShadowStrength : 0,
    settings.lightZ,
    settings.reflectionStrength,
    settings.sharpness,
    settings.darkFrost,
    settings.lightReflectionStrength,
    settings.lightReflectionSpread,
    settings.lightEdgeShade,
    0,
    settings.lightSurfaceTop,
    settings.lightSurfaceShade,
    0,
    rimStrength,
  ];
  return {
    values,
    elevation,
    validateSignedElevation,
    shadows,
    lighting,
    frostReachPerHeight:
      glossy && settings.darkFrost > 0 ? settings.frostSpread : 0,
  };
}
