import { useState, type ReactNode } from "react";
import {
  ceramic,
  ceramicDefaults,
  type CeramicLight,
  type CeramicOptions,
} from "oyn/materials/ceramic";
import { useMaterial } from "oyn/react";
import "./card-fantony.css";

const { light, ...preset } = ceramicDefaults;
type Key = keyof typeof preset;
type Dial = [
  label: string,
  min: number,
  max: number,
  step: number,
  help: string,
];
const dials = {
  elevation: [
    "Elevation / depth",
    -16,
    48,
    0.25,
    "Signed height in CSS pixels. Positive raises the face, zero flattens it, and negative values carve a recess.",
  ],
  lightZ: [
    "Reflection light height",
    1,
    160,
    1,
    "Height of the reflection light above the surface. It changes the angle of the highlights, not the cast shadow.",
  ],
  shadowLightHeight: [
    "Shadow light height",
    128,
    960,
    1,
    "Height of the area light above the ground. A lower light projects a longer shadow.",
  ],
  shadowLightSize: [
    "Shadow light size",
    0,
    600,
    1,
    "Size of the area light. Larger sources produce a softer penumbra.",
  ],
  shadowStrength: [
    "Cast shadow",
    0,
    1,
    0.005,
    "Opacity of the shadow projected onto a light environment.",
  ],
  contactShadowStrength: [
    "Contact shadow",
    0,
    1,
    0.001,
    "Darkening near the ground where the raised object almost touches it.",
  ],
  lightRim: [
    "Soft rim width",
    0,
    16,
    0.25,
    "Width of the soft bevel in CSS pixels.",
  ],
  lightReflectionStrength: [
    "Soft highlight",
    0,
    6,
    0.05,
    "Intensity of light reflected by the soft bevel.",
  ],
  lightReflectionSpread: [
    "Highlight spread",
    0,
    1,
    0.01,
    "Broadens the highlight along the soft bevel without changing its geometry.",
  ],
  lightEdgeShade: [
    "Back edge shade",
    0,
    1,
    0.005,
    "Darkens the edge facing away from the reflection light.",
  ],
  lightSurfaceTop: [
    "Face illumination",
    0,
    1,
    0.005,
    "Brightens the lamp-facing side of a pigmented soft face. A transparent face has no pigment to illuminate.",
  ],
  lightSurfaceShade: [
    "Face shade",
    0,
    1,
    0.001,
    "Darkens the far side of a pigmented soft face.",
  ],
  rim: [
    "Glossy rim width",
    0,
    20,
    0.25,
    "Width of the glossy bevel in CSS pixels; this is not the corner radius.",
  ],
  reflectionStrength: [
    "Reflection strength",
    0,
    4,
    0.01,
    "Intensity of the sharp reflection. The outer Fresnel rim follows this unless overridden.",
  ],
  sharpness: [
    "Specular sharpness",
    0.1,
    6,
    0.05,
    "A higher value concentrates the specular reflection into a tighter highlight.",
  ],
  darkFrost: [
    "Backlight strength",
    0,
    0.25,
    0.001,
    "Strength of the ground light. Move slowly across a raised glossy edge: light builds as you move inward and follows the pointer beneath the card. Zero turns it off.",
  ],
  frostSpread: [
    "Backlight reach",
    0,
    2.5,
    0.025,
    "Outer reach per pixel of elevation. Zero disables the glow; it never spreads into the face.",
  ],
} satisfies Record<Key, Dial>;
const groups = [
  [
    "Form & illumination",
    "Shared across both environments.",
    ["elevation", "lightZ"],
  ],
  [
    "Projected shadow",
    "Light environment only, independent of the finish.",
    [
      "shadowLightHeight",
      "shadowLightSize",
      "shadowStrength",
      "contactShadowStrength",
    ],
  ],
  [
    "Soft finish",
    "Usually a light face. A lighting override can use this finish in either environment.",
    [
      "lightRim",
      "lightReflectionStrength",
      "lightReflectionSpread",
      "lightEdgeShade",
      "lightSurfaceTop",
      "lightSurfaceShade",
    ],
  ],
  [
    "Glossy finish",
    "Usually a dark face. Its reflections also work on a dark pigment in a light environment.",
    ["rim", "reflectionStrength", "sharpness", "darkFrost", "frostSpread"],
  ],
] as const;

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help: string;
  children: ReactNode;
}) {
  return (
    <label className="fantony-field">
      <span>{label}</span>
      {children}
      <small>{help}</small>
    </label>
  );
}
function Specimen({
  scheme,
  options,
  width,
  height,
  radius,
}: {
  scheme: "light" | "dark";
  options: CeramicOptions;
  width: number;
  height: number;
  radius: number;
}) {
  const ref = useMaterial({
    appearance: ceramic,
    props: { ...options, colorScheme: scheme },
  });
  return (
    <figure style={{ colorScheme: scheme }}>
      <figcaption>{scheme} environment</figcaption>
      <div className="fantony-stage">
        <div
          ref={ref}
          data-fantony-card={scheme}
          style={{ width, height, borderRadius: radius }}
        />
      </div>
    </figure>
  );
}
const initialLight: Required<CeramicLight> = light;
const initial = {
  values: preset,
  width: 220,
  height: 116,
  radius: 22,
  budget: 48,
  pigment: "auto",
  custom: "#db743b",
  finish: "auto",
  rimOverride: false,
  rimStrength: 1,
  light: initialLight,
};
export function CardFantony() {
  const [state, setState] = useState(initial);
  const update = <K extends keyof typeof initial>(
    key: K,
    value: (typeof initial)[K],
  ) => setState((s) => ({ ...s, [key]: value }));
  const [copy, setCopy] = useState("");
  const options: CeramicOptions = {
    ...state.values,
    maxElevation: state.budget,
    light: state.light,
    color:
      state.pigment === "auto"
        ? undefined
        : state.pigment === "custom"
          ? state.custom
          : state.pigment,
    lighting:
      state.finish === "auto"
        ? undefined
        : (state.finish as CeramicOptions["lighting"]),
    rimReflectionStrength: state.rimOverride ? state.rimStrength : undefined,
  };
  const json = JSON.stringify(
    {
      material: options,
      geometry: {
        width: state.width,
        height: state.height,
        radius: state.radius,
      },
    },
    null,
    2,
  );
  function slider(spec: Dial, value: number, set: (v: number) => void) {
    const [label, min, max, step, help] = spec;
    return (
      <Field key={label} label={label} help={help}>
        <input
          aria-label={label}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => set(e.currentTarget.valueAsNumber)}
        />
        <output>{value}</output>
      </Field>
    );
  }
  function select(
    label: string,
    help: string,
    value: string,
    items: readonly string[],
    set: (v: string) => void,
  ) {
    return (
      <Field key={label} label={label} help={help}>
        <select
          aria-label={label}
          value={value}
          onChange={(e) => set(e.target.value)}
        >
          {items.map((i) => (
            <option key={i}>{i}</option>
          ))}
        </select>
      </Field>
    );
  }
  return (
    <article className="fantony">
      <header>
        <p>OYN / MATERIAL EXPLORATIONS</p>
        <h1>Card Fantony</h1>
        <p>
          One Ceramic recipe, two environments. Hover either card to study the
          light, then move onto the ground to compare its resting edge.
        </p>
      </header>
      <div className="fantony-workspace">
        <aside className="fantony-previews" aria-label="Live comparisons">
          {(["light", "dark"] as const).map((scheme) => (
            <Specimen
              key={scheme}
              scheme={scheme}
              options={options}
              {...{
                width: state.width,
                height: state.height,
                radius: state.radius,
              }}
            />
          ))}
        </aside>
        <div className="fantony-controls">
          {groups.map(([title, caption, keys], i) => (
            <section key={title}>
              <h2>{title}</h2>
              <p>{caption}</p>
              {keys.map((k) =>
                slider(dials[k], state.values[k], (v) =>
                  setState((s) => ({ ...s, values: { ...s.values, [k]: v } })),
                ),
              )}
              {i === 0 && (
                <>
                  {slider(
                    [
                      "Corner radius",
                      0,
                      90,
                      1,
                      "Radius of the DOM silhouette, in CSS pixels.",
                    ],
                    state.radius,
                    (v) => update("radius", v),
                  )}
                  {slider(
                    [
                      "Card width",
                      80,
                      320,
                      1,
                      "Requested width in CSS pixels, limited by the preview stage.",
                    ],
                    state.width,
                    (v) => update("width", v),
                  )}
                  {slider(
                    [
                      "Card height",
                      48,
                      180,
                      1,
                      "Height of the specimen in CSS pixels.",
                    ],
                    state.height,
                    (v) => update("height", v),
                  )}
                  {slider(
                    [
                      "Elevation budget",
                      0,
                      96,
                      1,
                      "Maximum height reserved for exterior light and shadow. Effective reservation is never smaller than the initial height.",
                    ],
                    state.budget,
                    (v) => update("budget", v),
                  )}
                  {select(
                    "Pigment",
                    "Auto uses the environment pigment. Transparent shows only relief; inverse uses the opposite pigment.",
                    state.pigment,
                    ["auto", "transparent", "inverse", "custom"],
                    (v) => update("pigment", v),
                  )}
                  {state.pigment === "custom" && (
                    <Field
                      label="Custom pigment"
                      help="Select the opaque sRGB base color of both cards."
                    >
                      <input
                        type="color"
                        value={state.custom}
                        onChange={(e) => update("custom", e.target.value)}
                      />
                    </Field>
                  )}
                  {select(
                    "Lighting model",
                    "Auto selects soft or glossy from pigment luminance, not from the page theme.",
                    state.finish,
                    ["auto", "soft", "glossy"],
                    (v) => update("finish", v),
                  )}
                </>
              )}
              {i === 3 && (
                <>
                  <Field
                    label="Independent Fresnel rim"
                    help="By default, the outer reflection follows reflection strength. Enable this to tune it independently."
                  >
                    <input
                      type="checkbox"
                      checked={state.rimOverride}
                      onChange={(e) => update("rimOverride", e.target.checked)}
                    />
                  </Field>
                  {state.rimOverride &&
                    slider(
                      [
                        "Fresnel rim strength",
                        0,
                        4,
                        0.01,
                        "Strength of the grazing reflection at the silhouette, separate from the ground glow.",
                      ],
                      state.rimStrength,
                      (v) => update("rimStrength", v),
                    )}
                </>
              )}
            </section>
          ))}
          <section>
            <h2>Light source</h2>
            <p>
              Shared by both specimens. Coordinates are viewport CSS pixels.
            </p>
            {select(
              "Source",
              "Pointer tracks the cursor. Fixed leaves the main light at the specified position; the backlight still requires a pointer over the card.",
              state.light.source,
              ["pointer", "fixed"],
              (v) =>
                update("light", {
                  ...state.light,
                  source: v as "fixed" | "pointer",
                }),
            )}
            {(["x", "y"] as const).map((k) =>
              slider(
                [
                  `Light ${k.toUpperCase()}`,
                  0,
                  Math.max(
                    2000,
                    k === "x" ? window.innerWidth : window.innerHeight,
                  ),
                  1,
                  "Viewport position of the fixed light, or the fallback position for pointer lighting.",
                ],
                state.light.position[k],
                (v) =>
                  update("light", {
                    ...state.light,
                    position: { ...state.light.position, [k]: v },
                  }),
              ),
            )}
            {(["onLeave", "onBlur", "onHidden"] as const).map((k, i) =>
              select(
                ["On pointer exit", "On window blur", "On page hidden"][i],
                "Hold the last main-light position or return to the configured fallback point.",
                state.light[k],
                ["hold", "return"],
                (v) => update("light", { ...state.light, [k]: v }),
              ),
            )}
          </section>
          <section>
            <h2>Recipe</h2>
            <p>
              Copy these values to keep or share a candidate. Experiments do not
              change the library defaults.
            </p>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(json);
                  setCopy("Copied.");
                } catch {
                  setCopy("Select the recipe below to copy it.");
                }
              }}
            >
              Copy recipe
            </button>{" "}
            <button
              onClick={() => {
                setState(initial);
                setCopy("");
              }}
            >
              Reset controls
            </button>{" "}
            <span role="status">{copy}</span>
            <details>
              <summary>View recipe JSON</summary>
              <textarea aria-label="Recipe JSON" readOnly value={json} />
            </details>
          </section>
        </div>
      </div>
    </article>
  );
}
