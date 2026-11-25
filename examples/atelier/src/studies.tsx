import { useState } from 'react';
import {
  Dial,
  Fader,
  Icon,
  Key,
  Led,
  Meter,
  Screws,
  Segments,
  InstrumentHeader,
  Surface,
  Switch,
  css,
  type Tone,
} from './controls';

function FinishSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div
      className="finish-selector"
      role="radiogroup"
      aria-label="Accent finish"
    >
      {(['orange', 'porcelain', 'ink'] as Tone[]).map((tone, i) => (
        <label className="finish-option" key={tone}>
          <Surface tone={tone} elevation={7} className="finish-disc" />
          <input
            type="radio"
            name="finish"
            aria-label={`${tone} finish`}
            checked={value === i}
            onChange={() => onChange(i)}
          />
          <span className="finish-dot" data-selected={value === i} />
        </label>
      ))}
    </div>
  );
}

export function QuietStudy() {
  const [volume, setVolume] = useState(66),
    [balance, setBalance] = useState(42);
  const [mode, setMode] = useState(0),
    [finish, setFinish] = useState(0);
  const [on, setOn] = useState(true),
    [favorite, setFavorite] = useState(false);
  const [pads, setPads] = useState([true, false, false, false, true, false]);
  const [steps, setSteps] = useState([
    true,
    false,
    true,
    true,
    false,
    false,
    true,
    false,
  ]);
  return (
    <Surface
      className="instrument quiet-instrument"
      elevation={16}
      tone="chalk"
      style={css({ '--accent': ['#df6136', '#90a18b', '#464b46'][finish] })}
    >
      <Screws />
      <InstrumentHeader />
      <div className="quiet-layout">
        <section className="quiet-finishes module">
          <FinishSelector value={finish} onChange={setFinish} />
          <div className="small-transport">
            <Key
              label="Decrease contrast"
              icon="minus"
              onClick={() => setBalance(Math.max(0, balance - 10))}
            />
            <Key
              label="Favorite material"
              icon="star"
              active={favorite}
              onClick={() => setFavorite(!favorite)}
            />
            <Key
              label="Increase contrast"
              icon="plus"
              onClick={() => setBalance(Math.min(100, balance + 10))}
            />
          </div>
        </section>
        <section className="quiet-main-dial module">
          <Dial
            label="Display brightness"
            value={volume}
            onChange={setVolume}
          />
          <Meter value={on ? volume : 0} />
        </section>
        <section className="quiet-pads module">
          <Surface className="six-pads" elevation={-1.2}>
            {pads.map((active, i) => (
              <Key
                key={i}
                label={`Ceramic pad ${i + 1}`}
                active={active}
                onClick={() => setPads(pads.map((p, j) => (j === i ? !p : p)))}
              >
                <Led on={active} />
              </Key>
            ))}
          </Surface>
        </section>
        <section className="quiet-switches module">
          <Segments
            label="Window arrangement"
            icons={['grid', 'columns', 'list']}
            value={mode}
            onChange={setMode}
          />
          <div className="switch-row">
            <Icon name="power" size={16} />
            <Switch label="Power" checked={on} onChange={setOn} />
            <Icon name="sun" size={18} />
          </div>
        </section>
        <section className="quiet-fader module">
          <div className="fader-endpoints">
            <Icon name="minus" size={16} />
            <Icon name="plus" size={16} />
          </div>
          <Fader label="Contrast" value={balance} onChange={setBalance} />
          <span className="tiny-dot-row" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </section>
      </div>
      <div className="quiet-footer">
        <Surface elevation={-2} className="step-strip">
          {steps.map((active, i) => (
            <Key
              key={i}
              label={`Pinned shortcut ${i + 1}`}
              active={active}
              onClick={() => setSteps(steps.map((s, j) => (j === i ? !s : s)))}
            >
              <Icon
                name={
                  (
                    [
                      'folder',
                      'calendar',
                      'mail',
                      'grid',
                      'search',
                      'cloud',
                      'sliders',
                      'lock',
                    ] as const
                  )[i]
                }
              />
            </Key>
          ))}
        </Surface>
        <div className="footer-grooves" aria-hidden="true" />
        <Key
          className="quiet-power"
          label="Sleep display"
          icon="moon"
          active={!on}
          onClick={() => setOn(!on)}
        />
      </div>
    </Surface>
  );
}
