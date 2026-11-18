import { useState } from "react";
import { useSurface } from "@oyn/surface";
import type { ColorScheme, CeramicLighting } from "@oyn/ceramic";
import { ceramic } from "@oyn/ceramic";
import "./color-lab.css";

const palette = [
  ["Gray 160", "#a0a0a0"],
  ["Gray 170", "#aaaaaa"],
  ["Gray 176", "#b0b0b0"],
  ["Gray 180", "#b4b4b4"],
  ["Gray 192", "#c0c0c0"],
  ["White", "#ffffff"],
  ["Porcelain", "#f0f0f0"],
  ["Gray", "#808080"],
  ["Charcoal", "#303030"],
  ["Black", "#0c0c0c"],
  ["Red", "#dc2626"],
  ["Orange", "#ea580c"],
  ["Yellow", "#eab308"],
  ["Green", "#16a34a"],
  ["Blue", "#2563eb"],
  ["Purple", "#9333ea"],
] as const;

function Sample({
  color,
  colorScheme,
  lighting,
  elevation,
}: {
  color: string;
  colorScheme: ColorScheme;
  lighting: CeramicLighting;
  elevation: number;
}) {
  const ref = useSurface({
    appearance: ceramic,
    props: { color, colorScheme, lighting, elevation, maxElevation: 32 },
  });
  return (
    <button
      ref={ref}
      type="button"
      className="color-lab-sample"
      aria-label={`${color} · ${lighting} rendering`}
      data-color={color}
      data-lighting={lighting}
    />
  );
}

export function ColorLab() {
  const [background, setBackground] = useState("#e8e8e8");
  const [custom, setCustom] = useState("#dc2626");
  const [colorScheme, setColorScheme] = useState<ColorScheme>("light");
  const [elevation, setElevation] = useState(16);
  return (
    <section className="color-lab" style={{ backgroundColor: background }}>
      <header className="color-lab-controls">
        <a href="/">← Atelier</a>
        <h1>Ceramic · Color / optics</h1>
        <p>
          同一颜色，两套渲染。背景独立控制，不自动切换材质模式。移动指针观察反光。
        </p>
        <div className="color-lab-fields">
          <label>
            环境{" "}
            <select
              aria-label="Environment"
              value={colorScheme}
              onChange={(event) =>
                setColorScheme(event.target.value as ColorScheme)
              }
            >
              <option value="light">light · 有投影</option>
              <option value="dark">dark · 无投影</option>
            </select>
          </label>
          <label>
            背景{" "}
            <input
              aria-label="Background color"
              type="color"
              value={background}
              onChange={(event) => setBackground(event.target.value)}
            />
            <code>{background}</code>
          </label>
          <div className="color-lab-presets" aria-label="Background presets">
            {["#ffffff", "#e8e8e8", "#808080", "#181818", "#000000"].map(
              (color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setBackground(color)}
                  aria-label={`Background ${color}`}
                  aria-pressed={background === color}
                  style={{ background: color }}
                />
              ),
            )}
          </div>
          <label>
            自定义颜色{" "}
            <input
              aria-label="Custom material color"
              type="color"
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
            />
            <code>{custom}</code>
          </label>
          <label>
            高度{" "}
            <input
              aria-label="Elevation"
              type="range"
              min="-6"
              max="32"
              step="1"
              value={elevation}
              onChange={(event) => setElevation(Number(event.target.value))}
            />
            <output>{elevation}</output>
          </label>
        </div>
        <p className="color-lab-note">
          {elevation < 0
            ? "当前为凹陷：使用同一套 inset shader，两列应一致。"
            : "左侧 soft，右侧 glossy；自动选择的分界为 #c0c0c0（192），等于时 glossy。"}
        </p>
      </header>
      <div className="color-lab-grid">
        {[["Custom", custom], ...palette].map(([name, color]) => (
          <article className="color-lab-card" key={name}>
            <h2>
              <span>{name}</span>
              <code>{color}</code>
            </h2>
            <div className="color-lab-pair">
              {(["soft", "glossy"] as const).map((lighting) => (
                <div className="color-lab-cell" key={lighting}>
                  <span className="color-lab-label">{lighting}</span>
                  <Sample
                    color={color}
                    colorScheme={colorScheme}
                    lighting={lighting}
                    elevation={elevation}
                  />
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
