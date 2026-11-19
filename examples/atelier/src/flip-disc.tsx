/// <reference types="vite/client" />
import { ProjectSwitch } from "./projects";
import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { SurfaceProvider, useSurface } from "@oyn/surface";
import { flipDisc, type FlipDiscProps } from "@oyn/ceramic/flip-disc";
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
  props: FlipDiscProps;
  onStrike: (index: number) => void;
}) {
  const ref = useSurface({ appearance: flipDisc, props });
  const { x, y, row, col } = stones[index];
  return (
    <button
      ref={ref}
      onClick={() => onStrike(index)}
      type="button"
      className="stone"
      data-index={index}
      aria-label={`从第 ${row + 1} 行第 ${col + 1} 列发出波纹`}
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
    setSaveStatus("正在保存…");
    try {
      const response = await fetch("/__atelier/ripple-defaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      setSaveStatus(response.ok ? "已保存到项目" : "未能写入项目，请重试");
    } catch {
      setSaveStatus("未能连接本地开发服务");
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
    <SurfaceProvider hdr={values.hdr}>
      <main className="atelier">
        <header className="mast">
          <a href="./" aria-label="Oyn atelier">
            oyn
          </a>
          <span>Material atelier</span>
          <small>STUDY　/　007</small>
        </header>
        <div className="intro">
          <p>SPATIAL CONTROLS　/　03</p>
          <h1>
            Ripple field<span>.</span>
          </h1>
        </div>
        <div className="workspace">
          <section className="bench" aria-label="波纹场">
            <div className="bench-head">
              <span>PLAN VIEW</span>
              <span>GRILLE　/　{stones.length}</span>
            </div>
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
                    focusTarget,
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
            <div className="bench-foot">
              <span>＋</span>
              <span>SHUTTER ORANGE　/　PORCELAIN</span>
            </div>
          </section>
          <aside aria-label="波纹设置">
            <header className="tuning-head">
              <div className="panel-head">
                <h2>调校</h2>
                <small>
                  {canSave ? "自动保存在此浏览器" : "当前浏览器无法保存调校"}
                </small>
                <button
                  type="button"
                  className="reset"
                  onClick={() => {
                    setValues(defaults);
                    setSaveStatus("");
                  }}
                >
                  恢复默认
                </button>
              </div>
              {import.meta.env.DEV && (
                <div>
                  <button
                    type="button"
                    className="reset"
                    disabled={saveStatus === "正在保存…"}
                    onClick={saveProject}
                  >
                    保存为项目默认值
                  </button>{" "}
                  <small role="status">{saveStatus}</small>
                </div>
              )}
            </header>
            {controls.map((g) => (
              <fieldset key={g.name}>
                <legend>
                  {g.label} <small>/ {g.name}</small>
                </legend>
                {g.name === "Glaze" && (
                  <label>
                    <span>
                      HDR 高光 <small>（支持时启用）</small>
                    </span>
                    <input
                      type="checkbox"
                      role="switch"
                      aria-label="HDR 高光"
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
                          ? "从静止到按到底。100% 是竖起翻转的安全余隙；超过后可能与槽壁相交。"
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
        <footer>
          <span>悬停轻沉，按下再沉一档。点中棋子，波纹从这里散开。</span>
          <span>R = 圆盘半径</span>
        </footer>
      </main>
    </SurfaceProvider>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ProjectSwitch />
    <Atelier />
  </StrictMode>,
);
