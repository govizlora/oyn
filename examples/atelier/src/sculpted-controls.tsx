import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
} from 'react';
import { useSurface } from '@oyn/surface';
import { baked, type BakedGeometry } from '@oyn/ceramic/baked';
import { loadGeometry } from './geometry-assets';
import { Surface } from './controls';

type ControlShape = 'dish'|'thumbDial'|'dimple'|'bridge'|'rockerOn'|'rockerOff'|'latch'|'detent'|'saddle'|'pocketDial';
type ControlOptions = { shape:ControlShape; color?:string; elevation?:number; rotation?:number };
// Disabled during asset loading; never paints a competing fallback surface.
function useBakedControl<T extends HTMLElement>({shape,color='#eeeee9',elevation=10,rotation=0}:ControlOptions) {
  const [geometry,setAsset]=useState<BakedGeometry>();
  const [error,setError]=useState<Error>();
  useEffect(()=>{
    let active=true;
    loadGeometry(`controls/${shape}`).then(value=>{if(active)setAsset(value);},error=>{if(active)setError(error);});
    return ()=>{active=false;};
  },[shape]);
  const ref=useSurface({appearance:baked,props:{geometry:geometry!,
    mode:'light',color,elevation,rotation,maxElevation:24,
    lightZ:150,lightReflectionStrength:.65,lightEdgeShade:.38,
    lightSurfaceTop:.05,lightSurfaceShade:.025,
    shadowStrength:.18,contactShadowStrength:.07,
  },enabled:!!geometry});
  if(error)throw error;
  return ref;
}
function SculptedButton({
  geometry,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { geometry: ControlOptions }) {
  const ref = useBakedControl<HTMLButtonElement>(geometry);
  return (
    <button ref={ref} className={`sculpted-solid ${className}`} {...props} />
  );
}
function SculptedPart({
  geometry,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement> & { geometry: ControlOptions }) {
  const ref = useBakedControl<HTMLDivElement>(geometry);
  return <div ref={ref} className={`sculpted-solid ${className}`} {...props} />;
}
const Dot = ({ active = true }: { active?: boolean }) => (
  <span className="sculpted-dot" data-on={active} />
);

export function DishedKeys() {
  const [selected, setSelected] = useState(0);
  return (
    <div className="dished-keys">
      {['Vermilion', 'Porcelain', 'Graphite'].map((name, i) => (
        <SculptedButton
          key={name}
          aria-label={`${name} dished key`}
          aria-pressed={selected === i}
          onClick={() => setSelected(i)}
          className="dished-key"
          geometry={{shape:'dish',color:['#e66c39','#efefeb','#424744'][i],elevation:selected===i?6:12}}
        >
          <span className="key-index" data-active={selected === i} />
        </SculptedButton>
      ))}
    </div>
  );
}
export function ThumbDial() {
  const [value, setValue] = useState(35);
  return (
    <div className="thumb-dial">
      <Surface elevation={-2} className="thumb-dial-seat" />
      <SculptedPart
        className="thumb-dial-cap"
        geometry={{shape:'thumbDial',rotation:(value/100)*5,elevation:12}}
      >
        <span
          className="thumb-dial-mark"
          style={{
            left: `${50 + 26 * Math.cos((value / 100) * 5)}%`,
            top: `${50 + 26 * Math.sin((value / 100) * 5)}%`,
          }}
        >
          <Dot />
        </span>
      </SculptedPart>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => setValue(+e.target.value)}
        aria-label="Thumb dial"
      />
      <span className="sculpted-readout">
        {value.toString().padStart(2, '0')}
      </span>
    </div>
  );
}
export function DimplePad() {
  const [pads, setPads] = useState([true, false, true, false, true, false]);
  return (
    <Surface elevation={-1.8} className="dimple-pad">
      {pads.map((on, i) => (
        <SculptedButton
          key={i}
          className="dimple-key"
          aria-label={`Dimple pad ${i + 1}`}
          aria-pressed={on}
          onClick={() => setPads((p) => p.map((v, j) => (i === j ? !v : v)))}
          geometry={{shape:'dimple',elevation:on?4:8}}
        >
          <Dot active={on} />
        </SculptedButton>
      ))}
    </Surface>
  );
}
export function BridgeSwitch() {
  const [on, setOn] = useState(false);
  return (
    <Surface elevation={-2.5} className="bridge-track">
      <SculptedButton
        role="switch"
        aria-label="Bridge switch"
        aria-checked={on}
        onClick={() => setOn(!on)}
        className="bridge-thumb"
        style={{ left: on ? '75px' : '5px' }}
        geometry={{shape:'bridge',elevation:10}}
      />
      <span className="bridge-status" style={{ left: on ? '23px' : '128px' }}>
        <Dot active={on} />
      </span>
    </Surface>
  );
}
export function RockerBank() {
  const [values, setValues] = useState([true, false, false]);
  return (
    <Surface elevation={-3} className="rocker-bank">
      {values.map((on, i) => (
        <SculptedButton
          key={i}
          role="switch"
          aria-label={`Rocker ${i + 1}`}
          aria-checked={on}
          onClick={() => setValues((v) => v.map((x, j) => (i === j ? !x : x)))}
          className="sculpted-rocker"
          geometry={{shape:on?'rockerOn':'rockerOff',elevation:on?8:13}}
        >
          <Dot active={on} />
          <span className="rocker-dash" />
        </SculptedButton>
      ))}
    </Surface>
  );
}
export function ThumbSwitch() {
  const [on, setOn] = useState(true);
  return (
    <Surface elevation={-2} className="thumb-track">
      <SculptedButton
        role="switch"
        aria-label="Thumb switch"
        aria-checked={on}
        onClick={() => setOn(!on)}
        className="long-thumb"
        style={{ left: on ? '72px' : '4px' }}
        geometry={{shape:'latch',elevation:9}}
      >
        <Dot active={on} />
      </SculptedButton>
    </Surface>
  );
}
export function DetentRail() {
  const [value, setValue] = useState(0);
  return (
    <Surface elevation={8} className="detent-body">
      {Array.from({ length: 5 }, (_, i) => (
        <SculptedButton
          key={i}
          aria-label={`Detent ${i + 1}`}
          aria-pressed={value === i}
          onClick={() => setValue(i)}
          className="detent"
          geometry={{shape:'detent',elevation:0}}
        >
          <Dot active={value === i} />
        </SculptedButton>
      ))}
    </Surface>
  );
}
export function SaddleFader() {
  const [value, setValue] = useState(25);
  return (
    <div className="saddle-fader">
      <Surface elevation={-1.5} className="saddle-slot" />
      <SculptedPart
        className="saddle-cap"
        style={{ left: `${value * 0.95}px` }}
        geometry={{shape:'saddle',elevation:8}}
      />
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => setValue(+e.target.value)}
        aria-label="Saddle fader"
      />
      <span className="saddle-value">{value}</span>
    </div>
  );
}
export function PocketDial() {
  const [value, setValue] = useState(62);
  return (
    <div className="crown-control">
      <Surface elevation={-3} className="crown-seat" />
      <SculptedPart
        className="crown-cap"
        geometry={{shape:'pocketDial',rotation:value*.05,elevation:16}}
      >
        <span
          className="thumb-dial-mark"
          style={{
            left: `${50 + 25 * Math.cos(value * 0.05)}%`,
            top: `${50 + 25 * Math.sin(value * 0.05)}%`,
          }}
        >
          <Dot />
        </span>
      </SculptedPart>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => setValue(+e.target.value)}
        aria-label="Pocket dial"
      />
      <span className="crown-value">
        {value}
        <small>INTENSITY</small>
      </span>
    </div>
  );
}
