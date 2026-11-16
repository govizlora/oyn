import { useState } from 'react';
import { Icon, Surface } from '../controls';
import { Field, hexes, palette, Rail, Range } from './shared';

export function Palette() {
  const [color, setColor] = useState('#b6b5c9');
  return (
    <div className="obj-stack">
      <Surface
        className="obj-color-orb"
        tone={color as `#${string}`}
        elevation={10}
      />
      <div className="obj-swatches">
        {palette.map((tone, i) => (
          <button
            type="button"
            key={tone}
            aria-label={`${tone} color`}
            aria-pressed={color === hexes[i]}
            onClick={() => setColor(hexes[i])}
          >
            <Surface tone={tone} elevation={color === hexes[i] ? 7 : 2} />
          </button>
        ))}
      </div>
      <label className="obj-color-input">
        <input
          type="color"
          aria-label="Custom ceramic color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <output>{color.toUpperCase()}</output>
      </label>
    </div>
  );
}
export function TypeSpecimen() {
  const [size, setSize] = useState(52),
    [weight, setWeight] = useState(50),
    [text, setText] = useState('Aa');
  return (
    <div className="obj-stack">
      <div
        className="obj-type-preview"
        style={{ fontSize: 22 + size * 0.7, fontWeight: 100 + weight * 8 }}
      >
        {text || 'Aa'}
      </div>
      <Field label="SPECIMEN">
        <input
          aria-label="Type specimen"
          maxLength={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </Field>
      <Range label="Size" value={size} onChange={setSize} />
      <Range label="Weight" value={weight} onChange={setWeight} />
    </div>
  );
}
export function Alignment() {
  const [align, setAlign] = useState('Center');
  return (
    <div className="obj-stack">
      <Surface className="obj-paper" elevation={6}>
        <div className="obj-ink-lines" data-align={align}>
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="obj-paper-dot" />
      </Surface>
      <Rail
        label="Alignment"
        options={['Left', 'Center', 'Right']}
        value={align}
        onChange={setAlign}
      />
    </div>
  );
}
export function GridComposer() {
  const [layout, setLayout] = useState('3'),
    [gap, setGap] = useState(24);
  return (
    <div className="obj-stack">
      <div
        className="obj-layout-grid"
        style={{
          gridTemplateColumns: `repeat(${layout},1fr)`,
          gap: 3 + gap / 8,
        }}
      >
        {Array.from({ length: 6 }, (_, i) => (
          <Surface
            key={i}
            tone={i === 1 ? 'yellow' : i === 4 ? 'lilac' : 'chalk'}
            elevation={4}
          />
        ))}
      </div>
      <Rail
        label="Columns"
        options={['2', '3', '6']}
        value={layout}
        onChange={setLayout}
      />
      <Range label="Gutter" value={gap} onChange={setGap} />
    </div>
  );
}
export function Corners() {
  const [radius, setRadius] = useState(40),
    [lift, setLift] = useState(50);
  return (
    <div className="obj-stack">
      <Surface
        className="obj-corner-sample"
        tone="sage"
        elevation={lift / 5}
        style={{ borderRadius: radius / 2 }}
      >
        <Icon name="expand" size={30} />
      </Surface>
      <Range label="Roundness" value={radius} onChange={setRadius} />
      <Range label="Elevation" value={lift} onChange={setLift} />
    </div>
  );
}
export function CropFrame() {
  const [ratio, setRatio] = useState('4:3');
  const ratios: Record<string, string> = {
    '1:1': '1',
    '4:3': '4 / 3',
    '16:9': '16 / 9',
  };
  return (
    <div className="obj-stack">
      <div className="obj-crop-well">
        <Surface
          className="obj-crop"
          elevation={5}
          style={{ aspectRatio: ratios[ratio] }}
        >
          <svg
            viewBox="0 0 160 90"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <circle cx="115" cy="24" r="12" fill="#e9cb69" />
            <path
              d="M-10 90 45 23 110 100M65 100 120 42 190 100"
              fill="#aab8a3"
            />
            <path
              d="M0 60H160M0 30H160M53 0V90M106 0V90"
              stroke="#fff"
              opacity=".5"
              fill="none"
            />
          </svg>
        </Surface>
      </div>
      <Rail
        label="Aspect ratio"
        options={['1:1', '4:3', '16:9']}
        value={ratio}
        onChange={setRatio}
      />
      <span className="obj-caption">A frame changes everything.</span>
    </div>
  );
}
