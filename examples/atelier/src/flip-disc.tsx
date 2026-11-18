import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { SurfaceProvider, useSurface } from "@oyn/surface";
import { flipDisc, type FlipDiscProps } from "@oyn/ceramic/flip-disc";
import { atRest, lattice, sample, stones, strike } from "./ripple-field";
import "./flip-disc.css";

const controls = [
  {
    label: "釉面",
    name: "Glaze",
    items: [
      {
        key: "sharpness",
        label: "高光锐度",
        min: 0.5,
        max: 8,
        step: 0.1,
        initial: 4.5,
        unit: "×",
      },
      {
        key: "reflectionStrength",
        label: "内侧镜面高光",
        min: 0,
        max: 6,
        step: 0.05,
        initial: 2.2,
        unit: "×",
      },
      {
        key: "rimStrength",
        label: "外缘反光",
        min: 0,
        max: 3,
        step: 0.05,
        initial: 0.2,
        unit: "×",
      },
    ],
  },
  {
    label: "盘体与槽",
    name: "Section",
    items: [
      {
        key: "crown",
        label: "盘面拱高",
        min: 8,
        max: 30,
        step: 0.5,
        initial: 16,
        unit: "% R",
      },
      {
        key: "roll",
        label: "盘边圆弧",
        min: 3,
        max: 16,
        step: 0.5,
        initial: 10,
        unit: "% R",
      },
      {
        key: "gap",
        label: "盘槽间隙",
        min: 8,
        max: 32,
        step: 0.5,
        initial: 18,
        unit: "% R",
      },
      {
        key: "lip",
        label: "槽口倒角",
        min: 0.5,
        max: 8,
        step: 0.1,
        initial: 1.6,
        unit: "% R",
      },
      {
        key: "depth",
        label: "盘体沉入深度",
        min: 0,
        max: 7,
        step: 0.25,
        initial: 5,
        unit: "% R",
      },
    ],
  },
  {
    label: "翻转与传播",
    name: "Motion",
    items: [
      {
        key: "stroke",
        label: "按压总行程",
        min: 0,
        max: 95,
        step: 1,
        initial: 92,
        unit: "% 余隙",
      },
      {
        key: "duration",
        label: "单枚翻转时长",
        min: 180,
        max: 1400,
        step: 10,
        initial: 680,
        unit: "ms",
      },
      {
        key: "damping",
        label: "落位阻尼",
        min: 0.38,
        max: 0.82,
        step: 0.01,
        initial: 0.52,
        unit: "ζ",
      },
      {
        key: "interval",
        label: "每格传播时间",
        min: 45,
        max: 180,
        step: 5,
        initial: 95,
        unit: "ms",
      },
    ],
  },
] as const;
type Key = (typeof controls)[number]["items"][number]["key"];
const defaults = Object.fromEntries(
  controls.flatMap((g) => g.items.map((c) => [c.key, c.initial])),
) as Record<Key, number>;

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
  const [values, setValues] = useState(defaults);
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
            <span>04 × 07</span>
          </div>
          <div
            className="wave-grid"
            style={{ aspectRatio: lattice.width / lattice.height }}
          >
            {stones.map((_, i) => (
              <Stone
                key={i}
                index={i}
                onStrike={tap}
                props={{
                  profile,
                  sharpness,
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
            <span>VERMILION　/　PORCELAIN</span>
          </div>
        </section>
        <aside aria-label="波纹设置">
          <div className="panel-head">
            <h2>调校</h2>
            <button
              type="button"
              className="reset"
              onClick={() => setValues(defaults)}
            >
              恢复默认
            </button>
          </div>
          {controls.map((g) => (
            <fieldset key={g.name}>
              <legend>
                {g.label} <small>/ {g.name}</small>
              </legend>
              {g.items.map((c) => (
                <label key={c.key}>
                  <span>{c.label}</span>
                  <output htmlFor={c.key}>
                    {values[c.key]} <small>{c.unit}</small>
                  </output>
                  <input
                    id={c.key}
                    aria-label={c.label}
                    type="range"
                    min={c.min}
                    max={c.max}
                    step={c.step}
                    value={values[c.key]}
                    onChange={(e) => {
                      const v = e.currentTarget.valueAsNumber;
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
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SurfaceProvider>
      <Atelier />
    </SurfaceProvider>
  </StrictMode>,
);
