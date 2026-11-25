/// <reference types="vite/client" />
import { ProjectSwitch } from "./projects";
import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { OynProvider, useMaterial } from "oyn/react";
import { stoneMaterial, type StoneProps } from "./stone-material";
import { atRest, lattice, sample, stones, strike } from "./ripple-field";
import "./flip-disc.css";

import { controls } from "./ripple-controls";
import defaults from "./ripple-defaults.json";

const storageKey = "oyn:ripple-field:tuning:v1";
function readTuning(): typeof defaults {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (!saved) return defaults;
    const values = { ...defaults };
    if (typeof saved.hdr === "boolean") values.hdr = saved.hdr;
    for (const group of controls)
      for (const c of group.items) {
        const v = saved[c.key];
        if (Number.isFinite(v) && v >= c.min && v <= c.max) values[c.key] = v;
      }
    return values.depth < values.gap ? values : defaults;
  } catch {
    return defaults; // Storage unavailable or malformed.
  }
}

function Stone({
  index,
  props,
  onStrike,
}: {
  index: number;
  props: StoneProps;
  onStrike: (index: number) => void;
}) {
  const ref = useMaterial({ material: stoneMaterial, props });
  const { x, y, row, col } = stones[index];
  return (
    <button
      ref={ref}
      onClick={() => onStrike(index)}
      type="button"
      className="stone"
      data-index={index}
      aria-label={`Start a ripple at row ${row + 1}, column ${col + 1}`}
      style={{
        left: (100 * x) / lattice.width + "%",
        top: (100 * y) / lattice.height + "%",
      }}
    />
  );
}
function Atelier() {
  const [values, setValues] = useState(readTuning);
  const [canSave, setCanSave] = useState(true);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(values));
      setCanSave(true);
    } catch {
      setCanSave(false);
    }
  }, [values]);
  const [saveStatus, setSaveStatus] = useState("");
  async function saveProject() {
    setSaveStatus("Saving…");
    try {
      const response = await fetch("/__atelier/ripple-defaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      setSaveStatus(response.ok ? "Saved to the project." : "Could not save to the project. Try again.");
    } catch {
      setSaveStatus("Could not reach the local development server.");
    }
  }
  const [focusTarget, setFocusTarget] = useState<HTMLButtonElement | null>(
    null,
  );
  useEffect(() => {
    if (!focusTarget) return;
    const resumePointer = () => setFocusTarget(null);
    window.addEventListener("pointermove", resumePointer, { once: true });
    window.addEventListener("pointerdown", resumePointer, { once: true });
    return () => {
      window.removeEventListener("pointermove", resumePointer);
      window.removeEventListener("pointerdown", resumePointer);
    };
  }, [focusTarget]);
  const [field, setField] = useState(atRest);
  const poses = useMemo(
    () =>
      stones.map(
        (_, i) => (now: number, reduced: boolean) =>
          sample(field, i, now, reduced),
      ),
    [field],
  );
  const {
    crown,
    roll,
    gap,
    lip,
    depth,
    sharpness,
    reflectionStrength,
    rimStrength,
    duration,
    damping,
    interval,
  } = values;
  const profile = useMemo(
    () => ({
      crown: crown / 100,
      roll: roll / 100,
      gap: gap / 100,
      lip: lip / 100,
      depth: depth / 100,
    }),
    [crown, roll, gap, lip, depth],
  );
  function tap(index: number) {
    const now = performance.now();
    setField((prev) =>
      strike(prev, index, { interval, duration, damping }, now),
    );
  }
  return (
    <OynProvider hdr={values.hdr}>
      <main className="ripple-page">
        <h1>Ripple field</h1>
        <p>Hover over a disc to lower it slightly; press to sink it deeper. Activate a disc to send a ripple outward.</p>
        <div className="workspace">
          <section className="bench" aria-label="Ripple field">
            <div
              className="wave-grid"
              onFocus={(e) =>
                setFocusTarget(
                  e.target instanceof HTMLButtonElement &&
                    e.target.matches(":focus-visible")
                    ? e.target
                    : null,
                )
              }
              onBlur={() => setFocusTarget(null)}
              style={{ aspectRatio: lattice.width / lattice.height }}
            >
              {stones.map((_, i) => (
                <Stone
                  key={i}
                  index={i}
                  onStrike={tap}
                  props={{
                    profile,
                    lightTarget: focusTarget,
                    sharpness,
                    contrast: values.contrast,
                    extension: values.extension,
                    lampHeight: values.lampHeight,
                    reflectionStrength,
                    rimStrength,
                    stroke: values.stroke / 100,
                    pose: poses[i],
                  }}
                />
              ))}
            </div>
          </section>
          <aside className="tuning" aria-label="Ripple settings">
            <header className="tuning-head">
              <div className="panel-head">
                <h2>Tuning</h2>
                <small>
                  {canSave ? "Autosaved in this browser" : "Browser storage unavailable"}
                </small>
                <button
                  type="button"
                  className="reset"
                  onClick={() => {
                    setValues(defaults);
                    setSaveStatus("");
                  }}
                >
                  Reset defaults
                </button>
              </div>
              <small>R = disc radius</small>
              {import.meta.env.DEV && (
                <div>
                  <button
                    type="button"
                    className="reset"
                    disabled={saveStatus === "Saving…"}
                    onClick={saveProject}
                  >
                    Save as project defaults
                  </button>{" "}
                  <small role="status">{saveStatus}</small>
                </div>
              )}
            </header>
            {controls.map((g) => (
              <fieldset key={g.name}>
                <legend>{g.name}</legend>
                {g.name === "Glaze" && (
                  <label>
                    <span>
                      HDR highlights <small>(when supported)</small>
                    </span>
                    <input
                      type="checkbox"
                      role="switch"
                      aria-label="HDR highlights"
                      checked={values.hdr}
                      onChange={(event) => {
                        const hdr = event.currentTarget.checked;
                        setSaveStatus("");
                        setValues((prev) => ({ ...prev, hdr }));
                      }}
                    />
                  </label>
                )}
                {g.items.map((c) => (
                  <label key={c.key}>
                    <span>{c.label}</span>
                    <output htmlFor={c.key}>
                      {values[c.key]} <small>{c.unit}</small>
                    </output>
                    <input
                      id={c.key}
                      aria-label={c.label}
                      title={
                        c.key === "stroke"
                          ? "Travel from rest to full press. At 100%, an upright disc just clears the socket wall. Beyond that, it may intersect the wall."
                          : undefined
                      }
                      type="range"
                      min={
                        c.key === "gap"
                          ? Math.max(
                              c.min,
                              (Math.floor(depth / c.step) + 1) * c.step,
                            )
                          : c.min
                      }
                      max={
                        c.key === "depth"
                          ? Math.min(c.max, gap - c.step)
                          : c.max
                      }
                      step={c.step}
                      value={values[c.key]}
                      onChange={(e) => {
                        const v = e.currentTarget.valueAsNumber;
                        setSaveStatus("");
                        setValues((prev) => ({ ...prev, [c.key]: v }));
                      }}
                    />
                  </label>
                ))}
              </fieldset>
            ))}
          </aside>
        </div>
      </main>
    </OynProvider>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ProjectSwitch />
    <Atelier />
  </StrictMode>,
);
