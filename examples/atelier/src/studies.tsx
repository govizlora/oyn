import { useEffect, useState } from 'react';
import {
  Dial,
  Fader,
  Icon,
  Key,
  Led,
  Meter,
  Screws,
  Segments,
  Speaker,
  Surface,
  Switch,
  css,
  type Tone,
} from './controls';
import { Phosphor } from './phosphor';

function Mark() {
  return (
    <span className="maker-mark" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}
function Header({ children }: { children?: React.ReactNode }) {
  return (
    <div className="instrument-header">
      <Mark />
      <div className="header-detail">
        {children ?? (
          <>
            <span className="serial-marks" />
            <Led />
          </>
        )}
      </div>
    </div>
  );
}
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
    [play, setPlay] = useState(false);
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
      <Header />
      <div className="quiet-layout">
        <section className="quiet-finishes module">
          <FinishSelector value={finish} onChange={setFinish} />
          <div className="small-transport">
            <Key
              label="Previous signal"
              icon="loop"
              onClick={() => setBalance(Math.max(0, balance - 10))}
            />
            <Key
              label={play ? 'Pause' : 'Play'}
              icon={play ? 'pause' : 'play'}
              active={play}
              onClick={() => setPlay(!play)}
            />
            <Key
              label="Next signal"
              icon="next"
              onClick={() => setBalance(Math.min(100, balance + 10))}
            />
          </div>
        </section>
        <section className="quiet-main-dial module">
          <Dial label="Master volume" value={volume} onChange={setVolume} />
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
            label="Signal shape"
            icons={['wave', 'circle', 'grid']}
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
          <Fader label="Signal balance" value={balance} onChange={setBalance} />
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
              label={`Sequence step ${i + 1}`}
              active={active}
              onClick={() => setSteps(steps.map((s, j) => (j === i ? !s : s)))}
            >
              <Led on={active} />
            </Key>
          ))}
        </Surface>
        <div className="footer-grooves" aria-hidden="true" />
        <Key
          className="quiet-power"
          label="Mute"
          icon="volume"
          active={!on}
          onClick={() => setOn(!on)}
        />
      </div>
    </Surface>
  );
}

// A single optional signal clock. No idle animation, no reduced-motion loop,
// and no hidden-tab work. Surface still owns every actual GPU draw.
function useSignalClock(playing: boolean) {
  const [phase, setPhase] = useState(0.8);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let timer: ReturnType<typeof setInterval> | undefined;
    const sync = () => {
      clearInterval(timer);
      if (playing && !media.matches && !document.hidden)
        timer = setInterval(
          () => setPhase((p) => (p + 0.065) % (Math.PI * 2)),
          50,
        );
    };
    sync();
    media.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      clearInterval(timer);
      media.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [playing]);
  return phase;
}

const signalDefaults = { volume: 62, tune: 36, faders: [62, 38, 76, 52] };
const playDefaults = {
  dials: [62, 34, 70, 46, 58, 30],
  faders: [72, 46, 63, 30],
  pads: Array.from({ length: 9 }, (_, i) => i === 1 || i === 6),
  notes: Array.from({ length: 13 }, (_, i) => i === 2),
  step: 3,
};

export function SignalStudy() {
  const [volume, setVolume] = useState(signalDefaults.volume),
    [mode, setMode] = useState(0),
    [playing, setPlaying] = useState(false);
  const [faders, setFaders] = useState(signalDefaults.faders),
    [tune, setTune] = useState(signalDefaults.tune),
    [power, setPower] = useState(true);
  const phase = useSignalClock(playing && power);
  return (
    <Surface
      className="instrument signal-instrument"
      elevation={18}
      tone="porcelain"
    >
      <Screws />
      <Header>
        <Led on={power} tone="sage" />
        <span className="serial-marks" />
      </Header>
      <div className="signal-layout">
        <section className="signal-dial-section">
          <div className="signal-orbit" aria-hidden="true">
            <span />
            <i />
            <i />
          </div>
          <Dial
            label="Signal amplitude"
            value={volume}
            onChange={setVolume}
            className="signal-main-dial"
          />
          <div className="signal-dial-footer">
            <Icon name="volume" size={16} />
            <Meter value={power ? volume : 0} columns={18} />
            <span className="tiny-cross" />
          </div>
        </section>
        <section className="signal-console">
          <Surface className="screen-housing" elevation={-4}>
            <Phosphor
              kind={mode === 1 ? 'orbit' : 'wave'}
              value={power ? volume : 0}
              phase={phase + tune / 15}
              powered={power}
            />
            <div className="screen-housing-footer">
              <span className="screen-bars" />
              <Led on={power} tone="sage" />
              <span className="screen-bars" />
            </div>
          </Surface>
          <div className="signal-console-bottom">
            <div className="signal-faders">
              {faders.map((value, i) => (
                <Fader
                  key={i}
                  label={`Signal channel ${i + 1}`}
                  value={value}
                  onChange={(v) => {
                    setFaders(faders.map((f, j) => (i === j ? v : f)));
                    setTune(v);
                  }}
                  vertical
                  tone={i === 2 ? 'sage' : 'porcelain'}
                />
              ))}
            </div>
            <div className="signal-control-column">
              <Segments
                label="Display"
                icons={['wave', 'circle']}
                value={mode}
                onChange={setMode}
              />
              <Dial
                label="Frequency"
                value={tune}
                onChange={setTune}
                className="signal-tune"
                tone="sage"
                ticks={false}
              />
              <Switch
                label="Signal power"
                checked={power}
                onChange={setPower}
              />
            </div>
          </div>
        </section>
      </div>
      <div className="signal-footer">
        <Speaker />
        <span className="signal-rule" />
        <Key
          label="Reset signal"
          icon="loop"
          onClick={() => {
            setVolume(signalDefaults.volume);
            setTune(signalDefaults.tune);
            setFaders(signalDefaults.faders);
            setMode(0);
            setPlaying(false);
          }}
        />
        <Key
          label={playing ? 'Pause signal' : 'Play signal'}
          icon={playing ? 'pause' : 'play'}
          active={playing}
          onClick={() => setPlaying(!playing)}
          tone="yellow"
        />
        <Key
          label="Stop signal"
          icon="stop"
          onClick={() => {
            setPlaying(false);
            setPower(false);
          }}
        />
      </div>
    </Surface>
  );
}

export function PlayStudy() {
  const [recording, setRecording] = useState(false);
  const [playing, setPlaying] = useState(false),
    [power, setPower] = useState(true),
    [mode, setMode] = useState(0);
  const [dials, setDials] = useState(playDefaults.dials);
  const [faders, setFaders] = useState(playDefaults.faders);
  const [pads, setPads] = useState(playDefaults.pads);
  const [notes, setNotes] = useState(playDefaults.notes);
  const [step, setStep] = useState(playDefaults.step);
  const phase = useSignalClock(playing && power);
  const tones: Tone[] = [
    'porcelain',
    'sage',
    'orange',
    'porcelain',
    'lilac',
    'porcelain',
  ];
  const updateDial = (index: number, value: number) =>
    setDials(dials.map((d, i) => (i === index ? value : d)));
  const togglePad = (index: number) => {
    setPads(pads.map((p, i) => (i === index ? !p : p)));
    setStep(index);
  };
  return (
    <Surface
      className="instrument play-instrument"
      elevation={18}
      tone="porcelain"
    >
      <Screws />
      <Header>
        <div className="header-spectrum" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
        <Led on={power} />
      </Header>
      <div className="play-layout">
        <section className="play-left">
          <Speaker className="play-speaker" />
          <Surface elevation={-4} className="code-housing">
            <Phosphor kind="code" amber powered={power} />
            <div className="code-status">
              <span />
              <span />
              <Led on={power} />
            </div>
          </Surface>
          <div className="play-toggle-row">
            <Switch
              label="Instrument power"
              checked={power}
              onChange={setPower}
            />
            <Key
              label="Reset instrument"
              icon="loop"
              onClick={() => {
                setStep(playDefaults.step);
                setDials(playDefaults.dials);
                setFaders(playDefaults.faders);
                setPads(playDefaults.pads);
                setRecording(false);
                setNotes(playDefaults.notes);
                setMode(0);
                setPlaying(false);
              }}
            />
          </div>
          <div className="play-transport">
            <Key
              label="Record"
              active={recording}
              onClick={() => setRecording(!recording)}
              tone="orange"
            >
              <span className="record-icon" />
            </Key>
            <Key
              label={playing ? 'Pause signal' : 'Play signal'}
              icon={playing ? 'pause' : 'play'}
              onClick={() => setPlaying(!playing)}
              active={playing}
            />
            <Key
              label="Stop signal"
              icon="stop"
              onClick={() => setPlaying(false)}
            />
          </div>
        </section>
        <section className="play-middle">
          <div className="play-display-row">
            <Surface elevation={-4} className="play-screen-housing">
              <Phosphor
                kind={(['wave', 'spectrum', 'orbit', 'field'] as const)[mode]}
                phase={phase + step * 0.45 + dials[1] / 30}
                value={dials[0]}
                powered={power}
              />
              <div className="display-dots" aria-hidden="true">
                {Array.from({ length: 24 }, (_, i) => (
                  <i key={i} data-on={i <= (step + 1) * 2} />
                ))}
              </div>
            </Surface>
            <div className="play-display-side">
              <Key
                label="Advance sequence"
                icon="arrow"
                tone="yellow"
                onClick={() => setStep((step + 1) % 12)}
              />
              <Key
                label="Randomize sequence"
                icon="shuffle"
                onClick={() => {
                  setStep((step + 5) % 12);
                  setDials(dials.map((v, i) => (v + 17 + i * 7) % 101));
                }}
              />
              <Led on={playing} />
            </div>
          </div>
          <div className="play-mode-row">
            <Segments
              label="Oscillator"
              icons={['wave', 'grid', 'circle', 'diamond']}
              value={mode}
              onChange={setMode}
            />
            <Meter value={power ? dials[0] : 0} columns={10} />
          </div>
          <div className="play-dials">
            {dials.map((value, i) => (
              <Dial
                key={i}
                label={`Oscillator ${i + 1}`}
                value={value}
                onChange={(v) => updateDial(i, v)}
                tone={tones[i]}
                ticks={false}
              />
            ))}
          </div>
          <Surface className="keyboard" elevation={-3}>
            <div className="piano-white">
              {Array.from({ length: 8 }, (_, i) => (
                <Key
                  key={i}
                  label={`Note ${i + 1}`}
                  className="piano-key"
                  active={notes[i]}
                  onClick={() => {
                    setNotes(notes.map((n, j) => (i === j ? !n : n)));
                    setStep(i);
                  }}
                >
                  <Led on={notes[i]} />
                </Key>
              ))}
            </div>
            <div className="piano-black">
              {[0, 1, 3, 4, 5].map((pos, i) => (
                <Key
                  key={i}
                  label={`Accidental ${i + 1}`}
                  className="piano-accidental"
                  tone={i === 2 ? 'orange' : 'ink'}
                  active={notes[i + 8]}
                  onClick={() => {
                    setNotes(notes.map((n, j) => (j === i + 8 ? !n : n)));
                    setStep(i + 7);
                  }}
                >
                  <span />
                </Key>
              ))}
            </div>
          </Surface>
        </section>
        <section className="play-right">
          <div className="play-faders">
            {faders.map((value, i) => (
              <div className="fader-channel" key={i}>
                <Led on={value > 50} tone={i === 1 ? 'orange' : 'sage'} />
                <Fader
                  label={`Mixer channel ${i + 1}`}
                  value={value}
                  onChange={(v) => {
                    setFaders(faders.map((f, j) => (i === j ? v : f)));
                    updateDial(0, v);
                  }}
                  vertical
                  tone={i === 1 ? 'orange' : 'porcelain'}
                />
                <span className="channel-mark" />
              </div>
            ))}
          </div>
          <div className="drum-pads">
            {pads.map((active, i) => (
              <Key
                key={i}
                label={`Drum pad ${i + 1}`}
                active={active}
                tone={i === 2 ? 'yellow' : i === 6 ? 'lilac' : 'porcelain'}
                onClick={() => togglePad(i)}
              >
                <span className="pad-glyph">
                  {i === 4 ? (
                    <Icon name="plus" size={17} />
                  ) : (
                    <Led on={active} />
                  )}
                </span>
              </Key>
            ))}
          </div>
        </section>
      </div>
      <div className="play-footer">
        <span className="patch-mark" aria-hidden="true" />
        <Surface
          className="sequence"
          elevation={-3}
          role="radiogroup"
          aria-label="Sequence position"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <label key={i} className="sequence-step" data-selected={i === step}>
              <input
                type="radio"
                name="sequence"
                aria-label={`Position ${i + 1}`}
                checked={i === step}
                onChange={() => setStep(i)}
              />
              <span />
            </label>
          ))}
        </Surface>
        <div className="patch-ports" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </div>
    </Surface>
  );
}
