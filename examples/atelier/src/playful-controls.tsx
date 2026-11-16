import { useId, useState } from 'react';
import { Icon, Key, Surface, css, type Glyph, type Tone } from './controls';
import { Glow, RotorPaint, type LampColor } from './instrument-material';

export function Rotor({
  speed,
  powered,
  onPower,
  reverse = false,
  covered = false,
  blades = 5,
  className = '',
}: {
  speed: number;
  powered: boolean;
  onPower: () => void;
  reverse?: boolean;
  covered?: boolean;
  blades?: number;
  className?: string;
}) {
  return (
    <div className={`rotor ${className}`} data-powered={powered}>
      <div className="rotor-index" aria-hidden="true">
        {Array.from({ length: 48 }, (_, i) => (
          <i key={i} style={{ transform: `rotate(${i * 7.5}deg)` }} />
        ))}
      </div>
      <Surface className="rotor-frame" elevation={5} rim={6}>
        <Surface className="rotor-well" elevation={-4}>
          <RotorPaint
            speed={speed}
            powered={powered}
            reverse={reverse}
            covered={covered}
            blades={blades}
          />
        </Surface>
      </Surface>
      <Key
        className="rotor-hub"
        label="Rotor power"
        active={powered}
        onClick={onPower}
      >
        <Glow level={powered ? 0.9 : 0} className="rotor-pilot" />
        <span className="rotor-hub-ring" />
      </Key>
    </div>
  );
}
export function Detent({
  value,
  onChange,
  label = 'Detent position',
}: {
  value: number;
  onChange: (v: number) => void;
  label?: string;
}) {
  const name = useId();
  return (
    <Surface
      className="detent-rail"
      elevation={-4}
      role="radiogroup"
      aria-label={label}
      style={css({ '--position': value })}
    >
      <Surface className="detent-handle" elevation={9}>
        <i />
        <i />
        <i />
      </Surface>
      {[0, 1, 2].map((i) => (
        <label key={i}>
          <input
            type="radio"
            name={name}
            aria-label={`${label}: ${i + 1}`}
            checked={value === i}
            onChange={() => onChange(i)}
          />
          <span className="detent-ticks" aria-hidden="true">
            {Array.from({ length: i + 1 }, (_, j) => (
              <i key={j} />
            ))}
          </span>
        </label>
      ))}
    </Surface>
  );
}
export function LampRack({
  values,
  onChange,
  level = 80,
}: {
  values: boolean[];
  onChange: (v: boolean[]) => void;
  level?: number;
}) {
  return (
    <Surface className="lamp-rack" elevation={-2}>
      {values.map((on, i) => (
        <button
          type="button"
          className="lamp-socket"
          key={i}
          aria-label={`Lamp ${i + 1}`}
          aria-pressed={on}
          onClick={() => onChange(values.map((v, j) => (j === i ? !v : v)))}
        >
          <Surface className="lamp-bezel" elevation={3} />
          <Glow
            level={on ? level / 100 : 0}
            color={(['orange', 'sage', 'ice', 'lilac'] as LampColor[])[i % 4]}
          />
          <span className="lamp-position" aria-hidden="true">
            {String(i + 1).padStart(2, '0')}
          </span>
        </button>
      ))}
    </Surface>
  );
}
const keyLabels = [
  'esc',
  '⌘',
  '↑',
  '↵',
  '←',
  '↓',
  '→',
  '⌥',
  'A',
  'S',
  'D',
  'F',
];
export function PocketKeyboard({
  onStroke,
}: {
  onStroke?: (key: string) => void;
}) {
  const [last, setLast] = useState('⌘');
  const strike = (key: string) => {
    setLast(key);
    onStroke?.(key);
  };
  return (
    <div
      className="pocket-keyboard"
      onKeyDown={(e) => {
        // Enter/Space stay native button activation; modified shortcuts belong
        // to the browser. Physical letter/arrow keys only affect this keyboard.
        if (
          e.defaultPrevented ||
          e.ctrlKey ||
          e.metaKey ||
          e.altKey ||
          e.key === 'Enter' ||
          e.key === ' '
        )
          return;
        const map: Record<string, string> = {
          Escape: 'esc',
          Enter: '↵',
          ArrowUp: '↑',
          ArrowDown: '↓',
          ArrowLeft: '←',
          ArrowRight: '→',
          Meta: '⌘',
          Alt: '⌥',
        };
        const key = map[e.key] ?? e.key.toUpperCase();
        if (keyLabels.includes(key)) {
          e.preventDefault();
          if (!e.repeat) strike(key);
        }
      }}
    >
      <div className="keyboard-indicators">
        <Glow level={0.65} color="sage" />
        <span />
        <output aria-live="polite">{last}</output>
      </div>
      <Surface className="keyboard-bed" elevation={-2}>
        {keyLabels.map((key, i) => (
          <Key
            key={key}
            label={`Key ${key}`}
            tone={i === 3 ? 'orange' : i === 8 ? 'yellow' : 'porcelain'}
            active={last === key}
            onClick={() => strike(key)}
          >
            <span>{key}</span>
            {last === key && <i className="key-pilot" />}
          </Key>
        ))}
      </Surface>
    </div>
  );
}
const reactions = ['dots', 'heart', 'spark', 'check'] as const;
type Reaction = (typeof reactions)[number];
function ReactionMark({ kind }: { kind: Reaction }) {
  return kind === 'dots' ? (
    <span className="bubble-dots">
      <i />
      <i />
      <i />
    </span>
  ) : kind === 'heart' ? (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M16 27 5 17C-2 7 9 0 16 9 23 0 34 7 27 17Z"
        fill="currentColor"
      />
    </svg>
  ) : (
    <Icon name={kind === 'spark' ? 'star' : 'check'} size={28} />
  );
}
export function BubbleSignals({ lift = 8 }: { lift?: number }) {
  const [messages, setMessages] = useState<Reaction[]>(['dots', 'heart']);
  return (
    <div className="bubble-signals">
      <div
        className="bubble-conversation"
        role="log"
        aria-label="Reaction bubbles"
      >
        {messages.map((kind, i) => (
          <button
            type="button"
            className={`bubble bubble-${i}`}
            key={i}
            aria-label={`Change ${i === 0 ? 'first' : 'second'} bubble: ${kind}`}
            onClick={() =>
              setMessages((old) =>
                old.map((v, j) =>
                  i === j
                    ? reactions[(reactions.indexOf(v) + 1) % reactions.length]
                    : v,
                ),
              )
            }
          >
            <Surface
              className="bubble-body"
              elevation={lift}
              maxElevation={16}
              tone={i === 0 ? 'porcelain' : 'lilac'}
            >
              <ReactionMark kind={kind} />
            </Surface>
            <Surface
              className="bubble-tail"
              elevation={3}
              tone={i === 0 ? 'porcelain' : 'lilac'}
            />
          </button>
        ))}
      </div>
      <div className="bubble-reactions">
        {(['heart', 'spark', 'check'] as Reaction[]).map((kind) => (
          <Key
            key={kind}
            label={`Send ${kind} reaction`}
            onClick={() => setMessages(([, second]) => [second, kind])}
          >
            <ReactionMark kind={kind} />
          </Key>
        ))}
      </div>
    </div>
  );
}
export function TactilePills() {
  const [selected, setSelected] = useState([true, false, true]);
  const glyphs: Glyph[] = ['sun', 'moon', 'star'];
  const tones: Tone[] = ['sage', 'yellow', 'lilac'];
  return (
    <div className="tactile-pills">
      {glyphs.map((glyph, i) => (
        <label key={glyph} className="tactile-pill" data-selected={selected[i]}>
          <Surface
            className="pill-shell"
            tone={selected[i] ? tones[i] : 'porcelain'}
            elevation={selected[i] ? 7 : 1}
          />
          <input
            type="checkbox"
            aria-label={`Pill ${glyph}`}
            checked={selected[i]}
            onChange={(e) => {
              const checked = e.target.checked;
              setSelected((old) => old.map((v, j) => (j === i ? checked : v)));
            }}
          />
          <Icon name={glyph} />
          <span className="pill-dashes">
            <i />
            <i />
          </span>
          <Glow
            level={selected[i] ? 0.75 : 0}
            color={(['sage', 'orange', 'lilac'] as LampColor[])[i]}
          />
        </label>
      ))}
    </div>
  );
}
