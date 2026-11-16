import { useState } from 'react';
import { Fader } from '../controls';
import {
  BubbleSignals,
  Detent,
  LampRack,
  PocketKeyboard,
  Rotor,
  TactilePills,
} from '../playful-controls';

export function MovingAir() {
  const [speed, setSpeed] = useState(56),
    [power, setPower] = useState(false);
  return (
    <div className="hardware-demo">
      <Rotor speed={speed} powered={power} onPower={() => setPower(!power)} />
      <div className="hardware-controls">
        <Fader label="Rotor speed" value={speed} onChange={setSpeed} />
        <output>{speed}</output>
      </div>
    </div>
  );
}
export function LightBank() {
  const [lamps, setLamps] = useState([
      true,
      false,
      true,
      true,
      false,
      true,
      false,
      true,
    ]),
    [level, setLevel] = useState(75);
  return (
    <div className="hardware-demo">
      <LampRack values={lamps} onChange={setLamps} level={level} />
      <div className="hardware-controls">
        <Fader label="Lamp intensity" value={level} onChange={setLevel} />
        <output>{level}</output>
      </div>
    </div>
  );
}
export function ThreePositions() {
  const [value, setValue] = useState(1);
  return (
    <div className="hardware-demo">
      <Detent value={value} onChange={setValue} />
      <div className="detent-readout" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <i key={i} data-on={i === value} />
        ))}
      </div>
    </div>
  );
}
export function LittleKeys() {
  return (
    <div className="hardware-demo">
      <PocketKeyboard />
    </div>
  );
}
export function SoftMessages() {
  return (
    <div className="hardware-demo">
      <BubbleSignals />
    </div>
  );
}
export function CandySwitches() {
  return (
    <div className="hardware-demo">
      <TactilePills />
    </div>
  );
}
