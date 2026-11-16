import { useState } from 'react';
import {
  Dial,
  Fader,
  Icon,
  InstrumentHeader,
  Key,
  Led,
  Meter,
  Screws,
  Surface,
  Switch,
} from './controls';
import { Glow, rotorRadiansPerSecond } from './instrument-material';
import {
  BubbleSignals,
  Detent,
  LampRack,
  PocketKeyboard,
  Rotor,
  TactilePills,
} from './playful-controls';
import { Phosphor } from './phosphor';

export function AirStudy() {
  const [speed, setSpeed] = useState(56),
    [power, setPower] = useState(false),
    [reverse, setReverse] = useState(false),
    [covered, setCovered] = useState(false),
    [profile, setProfile] = useState(1),
    [light, setLight] = useState(72);
  return (
    <Surface className="instrument air-instrument" elevation={18} tone="chalk">
      <Screws />
      <InstrumentHeader>
        <Glow level={power ? 0.85 : 0} color="sage" />
        <span className="air-ident">02 / AIR</span>
      </InstrumentHeader>
      <div className="air-layout">
        <section className="air-rotor-zone" aria-label="Kinetic fan">
          <Rotor
            speed={speed}
            powered={power}
            onPower={() => setPower(!power)}
            reverse={reverse}
            covered={covered}
            blades={[3, 5, 7][profile]}
          />
          <div className="air-under">
            <span />
            <output>
              {String(
                Math.round(
                  power
                    ? (rotorRadiansPerSecond(speed) * 60) / (Math.PI * 2)
                    : 0,
                ),
              ).padStart(4, '0')}
              <small>RPM</small>
            </output>
            <span />
          </div>
        </section>
        <section className="air-control-zone" aria-label="Air controls">
          <div className="air-dial-row">
            <Dial label="Rotor speed" value={speed} onChange={setSpeed}>
              <output className="kinetic-dial-value">
                {speed}
                <small>%</small>
              </output>
            </Dial>
            <div className="air-side-keys">
              <Key
                label="Fan power"
                icon="power"
                tone="orange"
                active={power}
                onClick={() => setPower(!power)}
              />
              <Key
                label="Reverse rotor"
                icon="loop"
                active={reverse}
                onClick={() => setReverse(!reverse)}
              />
              <Key
                label="Rotor grille"
                icon="grid"
                active={covered}
                onClick={() => setCovered(!covered)}
              />
            </div>
          </div>
          <div className="air-detent">
            <Icon name="wave" />
            <Detent
              label="Blade profile"
              value={profile}
              onChange={setProfile}
            />
          </div>
          <Surface className="air-light-well" elevation={-2}>
            <Glow level={light / 100} color="sage" className="air-light-bar" />
            <Fader label="Pilot brightness" value={light} onChange={setLight} />
            <Icon name="sun" />
          </Surface>
          <div className="air-switch-line">
            <Icon name="power" />
            <Switch label="Fan enabled" checked={power} onChange={setPower} />
            <Meter value={power ? speed : 0} />
          </div>
        </section>
      </div>
      <div className="air-footer">
        <span className="air-vents" />
        <Surface className="air-footer-pill" elevation={3}>
          <Glow level={power ? 0.8 : 0} />
          <span>{power ? '●' : '○'}</span>
          <Icon name="wave" />
        </Surface>
        <span className="air-vents" />
      </div>
    </Surface>
  );
}
export function PlaygroundStudy() {
  const [speed, setSpeed] = useState(48),
    [light, setLight] = useState(78),
    [lift, setLift] = useState(55),
    [power, setPower] = useState(false),
    [mode, setMode] = useState(1),
    [lamps, setLamps] = useState([
      true,
      false,
      true,
      true,
      false,
      true,
      false,
      true,
    ]);
  return (
    <Surface
      className="instrument playground-instrument"
      elevation={18}
      tone="porcelain"
    >
      <Screws />
      <InstrumentHeader>
        <div className="play-header-lights">
          <Glow color="orange" level={0.6} />
          <Glow color="sage" level={0.7} />
          <Glow color="ice" level={0.6} />
        </div>
      </InstrumentHeader>
      <div className="play-grid">
        <section className="play-rotor-cell" aria-label="Pocket rotor">
          <Rotor
            speed={speed}
            powered={power}
            onPower={() => setPower(!power)}
            blades={[3, 5, 7][mode]}
          />
          <Detent
            label="Pocket blade profile"
            value={mode}
            onChange={setMode}
          />
        </section>
        <section className="play-lamp-cell" aria-label="Luminous switches">
          <LampRack values={lamps} onChange={setLamps} level={light} />
          <Surface className="play-field-screen" elevation={-2}>
            <Phosphor
              kind="field"
              value={light}
              phase={mode + speed / 40}
              powered={lamps.some(Boolean)}
            />
          </Surface>
        </section>
        <section className="play-bubble-cell" aria-label="Tactile reactions">
          <BubbleSignals lift={3 + lift / 10} />
        </section>
        <section className="play-keyboard-cell" aria-label="Ceramic keyboard">
          <PocketKeyboard
            onStroke={() =>
              setLamps((old) => old.map((v, i) => (i === 0 ? !v : v)))
            }
          />
        </section>
        <section className="play-sliders-cell" aria-label="Physical controls">
          <Surface className="play-fader-bed" elevation={-2}>
            {[
              {
                label: 'Pocket rotor speed',
                value: speed,
                set: setSpeed,
                icon: 'wave' as const,
                tone: 'porcelain' as const,
              },
              {
                label: 'Lamp intensity',
                value: light,
                set: setLight,
                icon: 'sun' as const,
                tone: 'yellow' as const,
              },
              {
                label: 'Bubble elevation',
                value: lift,
                set: setLift,
                icon: 'expand' as const,
                tone: 'lilac' as const,
              },
            ].map((control) => (
              <div className="play-fader-channel" key={control.label}>
                <Icon name={control.icon} />
                <Fader
                  vertical
                  label={control.label}
                  value={control.value}
                  onChange={control.set}
                  tone={control.tone}
                />
                <span className="channel-marks" />
              </div>
            ))}
          </Surface>
        </section>
        <section className="play-pill-cell" aria-label="Soft switches">
          <TactilePills />
          <div className="play-power">
            <Icon name="power" />
            <Switch
              label="Pocket fan enabled"
              checked={power}
              onChange={setPower}
            />
            <Led on={power} />
          </div>
        </section>
      </div>
      <div className="play-footer">
        <span className="footer-grooves" />
        <span className="play-foot-mark">○ — ◇ — ○</span>
        <span className="footer-grooves" />
      </div>
    </Surface>
  );
}
