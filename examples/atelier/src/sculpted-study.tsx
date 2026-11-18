import { Surface } from './controls';
import {
  BridgeSwitch,
  PocketDial,
  DetentRail,
  DimplePad,
  DishedKeys,
  RockerBank,
  SaddleFader,
  ThumbDial,
  ThumbSwitch,
} from './sculpted-controls';
const specimens = [
  ['01', 'Dished keys', 'A flat face, cut by a sphere.', DishedKeys],
  ['02', 'Thumb wheel', 'A circular cut. A precise grip.', ThumbDial],
  ['03', 'Dimple array', 'Six small points of possibility.', DimplePad],
  ['04', 'Bridge switch', 'Two hollows. One continuous form.', BridgeSwitch],
  ['05', 'Pivot rockers', 'A change in state. A change in plane.', RockerBank],
  ['06', 'Thumb latch', 'A quiet, deliberate gesture.', ThumbSwitch],
  ['07', 'Detent rail', 'Five places to land.', DetentRail],
  ['08', 'Saddle fader', 'A little room in between.', SaddleFader],
  ['09', 'Pocket dial', 'A flat disc. A spherical subtraction.', PocketDial],
] as const;
export function SculptedStudy({
  explore,
  exploration,
  studies,
}: {
  explore: () => void;
  exploration: () => void;
  studies: () => void;
}) {
  return (
    <section className="sculpture-page">
      <header className="sculpture-heading">
        <div>
          <a href="./" className="sculpture-logo">
            oyn
          </a>
          <span>MATERIAL EXPLORATIONS / 004</span>
        </div>
        <nav aria-label="Collections">
          <a href="./flip.html" className="field-link">
            Ripple field ↗
          </a>
          <button onClick={explore}>Object library ↗</button>
        </nav>
      </header>
      <div className="sculpture-title">
        <h1>
          Familiar. <em>With a new dimension.</em>
        </h1>
        <p>
          Porcelain, shaped for the hand.
          <br />
          Move your cursor. Follow the light.
        </p>
      </div>
      <Surface tone="#f2f2ee" elevation={18} className="sculpture-board">
        {specimens.map(([index, name, description, Component]) => (
          <article className="sculpture-tile" key={index}>
            <header>
              <span>
                {index} / {name}
              </span>
              <span className="sculpture-new">SCULPTED</span>
            </header>
            <div className="sculpture-object">
              <Component />
            </div>
            <p>{description}</p>
          </article>
        ))}
      </Surface>
      <footer className="sculpture-footer">
        <span>
          <i /> REAL-TIME LIGHT. REAL SURFACE GEOMETRY.
        </span>
        <button onClick={studies}>
          Original ceramic studies <span>↗</span>
        </button>
        <button onClick={exploration}>Geometry lab ↗</button>
      </footer>
    </section>
  );
}
