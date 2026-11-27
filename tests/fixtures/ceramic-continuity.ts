import { createCeramicMaterial, type CeramicOptions } from "@oyn/materials";
import { createEngine } from "../../packages/core/src/engine";
import { ceramicBinding } from "../../packages/materials/src/ceramic/interaction";

const elevations = [
  8, 6, 4, 2, 1, 0.5, 0.25, 0.1, 0.01, 0.001, 0, -0.001, -0.01, -0.1, -0.25,
  -0.5, -1, -2, -3.2, -4, -6,
];
const cases: (CeramicOptions & { name: string; background: string })[] = [
  { name: "light", color: "#f0f0f0", colorScheme: "light", background: "#e8e8e8" },
  {
    name: "clear",
    colorScheme: "light",
    background: "#b98477",
  },
  {
    name: "frost",
    darkFrost: 0.1, // Resolve the spatial profile above 8-bit readback noise.
    colorScheme: "dark",
    reflectionStrength: 0,
    background: "#101010",
  },
  { name: "dark", color: "#0c0c0c", colorScheme: "dark", background: "#181818" },
  {
    name: "contrast",
    lighting: "glossy",
    colorScheme: "light",
    color: "#171717",
    background: "#e8e8e8",
  },
  {
    name: "color",
    colorScheme: "light",
    color: "#b56338",
    background: "#8794a4",
  },
  {
    name: "ao",
    colorScheme: "light",
    shadowStrength: 0,
    contactShadowStrength: 1,
    background: "#fff",
  },
];
const engine = createEngine();
const samples = cases
  .map(({ name, background, ...options }) => {
    const row = document.createElement("section");
    row.className = "row";
    row.style.setProperty("--background", background);
    row.style.setProperty(
      "--ink",
      options.colorScheme === "dark" ? "#eee" : "#222",
    );
    document.body.append(row);
    return elevations.map((elevation) => {
      const cell = document.createElement("div");
      cell.className = "cell";
      const label = document.createElement("span");
      label.textContent = `${name} · ${elevation > 0 ? "+" : ""}${elevation}`;
      const element = document.createElement("div");
      element.className = "host";
      if (name === "frost") element.dataset.frostHeight = String(elevation);
      cell.append(element, label);
      row.append(cell);
      const rect = element.getBoundingClientRect();
      const source = createCeramicMaterial({
        ...options,
        elevation,
        maxElevation: 8,
        light: {
          source: "fixed",
          position: { x: rect.left - 30, y: rect.top - 40 },
        },
      });
      // Observe the same production AO function without the face covering it.
      const material =
        name === "ao"
          ? {
              ...source,
              bind: ceramicBinding({ source: "fixed" }),
              // A test-only entry invokes production AO without the face pass.
              shader: source.shader + `
@fragment fn aoProbe(in:VertexOut)->@location(0) vec4f {
  let b=in.card.zw*0.5;
  return ceramicShadow(in.local-b,in.card.xy+b-frame.viewportLight.zw,material.shape.y,material.shadow);
}`,
              passes: ["aoProbe"],
            }
          : source;
      engine.entries.set(element, { element, material });
      return { name, elevation, element, material };
    });
  })
  .flat();
engine.start();
Object.assign(window, {
  continuity: {
    samples,
    engine,
    ready: () =>
      samples.every(({ element }) => element.hasAttribute("data-oyn-active")),
    capture: (only?: HTMLElement) =>
      samples
        .filter((s) => !only || s.element === only)
        .map(({ name, elevation, element }) => {
          const canvas = element.querySelector("canvas")!;
          return {
            name,
            elevation,
            png: canvas.toDataURL(),
            pad: -parseFloat(canvas.style.left),
            scale: canvas.width / parseFloat(canvas.style.width),
          };
        }),
  },
});
