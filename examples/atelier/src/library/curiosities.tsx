import { useState } from 'react';
import { Icon, Key, Surface } from '../controls';
import { Phosphor } from '../phosphor';
import { Field, Rail, Range } from './shared';

export function LiveTerminal() {
  const [code, setCode] = useState(
      'HELLO(OBJECTS)\n\nSHAPE = CERAMIC\nLIGHT = SOFT\n\n> MAKE SOMETHING',
    ),
    [color, setColor] = useState('Amber');
  return (
    <div className="obj-stack">
      <Surface elevation={-3} className="obj-terminal">
        <Phosphor kind="code" code={code} amber={color === 'Amber'} />
      </Surface>
      <Field label="LIVE PHOSPHOR TEXT">
        <textarea
          aria-label="Terminal text"
          spellCheck={false}
          maxLength={250}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
      </Field>
      <Rail
        label="Phosphor"
        options={['Amber', 'Mint']}
        value={color}
        onChange={setColor}
      />
    </div>
  );
}
const initialPixels = [10, 11, 12, 13, 17, 22, 25, 30, 33, 38, 42, 43, 44, 45];
export function PixelMatrix() {
  const [pixels, setPixels] = useState<number[]>(initialPixels);
  return (
    <div className="obj-stack">
      <Surface className="obj-pixel-matrix" elevation={-3}>
        {Array.from({ length: 64 }, (_, i) => (
          <button
            type="button"
            key={i}
            aria-label={`Pixel ${Math.floor(i / 8) + 1}, ${(i % 8) + 1}`}
            aria-pressed={pixels.includes(i)}
            onClick={() =>
              setPixels((old) =>
                old.includes(i) ? old.filter((n) => n !== i) : [...old, i],
              )
            }
          >
            <i />
          </button>
        ))}
      </Surface>
      <div className="obj-row centered">
        <button
          type="button"
          className="obj-text-button"
          onClick={() => setPixels([])}
        >
          Clear
        </button>
        <span className="obj-caption">{pixels.length} / 64</span>
        <button
          type="button"
          className="obj-text-button"
          onClick={() =>
            setPixels(
              Array.from({ length: 64 }, (_, i) => i).filter(
                (i) => !pixels.includes(i),
              ),
            )
          }
        >
          Invert
        </button>
      </div>
    </div>
  );
}
export function PositionPad() {
  const [point, setPoint] = useState([62, 35]);
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPoint([
      Math.round(
        Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)),
      ),
      Math.round(
        Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100)),
      ),
    ]);
  };
  return (
    <div className="obj-stack">
      <Surface
        className="obj-position-pad"
        elevation={-3}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          move(e);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) move(e);
        }}
      >
        <span className="obj-cross-x" style={{ top: `${point[1]}%` }} />
        <span className="obj-cross-y" style={{ left: `${point[0]}%` }} />
        <Surface
          className="obj-position-handle"
          elevation={9}
          tone="orange"
          style={{ left: `${point[0]}%`, top: `${point[1]}%` }}
        />
        <span className="obj-position-coordinates">
          {point[0]} / {point[1]}
        </span>
      </Surface>
      <Range
        label="Horizontal position"
        value={point[0]}
        onChange={(x) => setPoint(([, y]) => [x, y])}
      />
      <Range
        label="Vertical position"
        value={point[1]}
        onChange={(y) => setPoint(([x]) => [x, y])}
      />
    </div>
  );
}
type Calc = {
  entry: string;
  stored: number | null;
  op: string | null;
  replace: boolean;
};
const reset: Calc = { entry: '0', stored: null, op: null, replace: true };
function calculate(a: number, b: number, op: string) {
  return op === '+'
    ? a + b
    : op === '−'
      ? a - b
      : op === '×'
        ? a * b
        : b === 0
          ? NaN
          : a / b;
}
const format = (n: number) =>
  Number.isFinite(n) ? String(Number(n.toPrecision(9))) : 'Error';
export function Calculator() {
  const [state, setState] = useState<Calc>(reset);
  const act = (key: string) =>
    setState((s) => {
      if (key === 'C') return reset;
      if (/^\d$/.test(key) || key === '.') {
        const old = s.replace || s.entry === 'Error' ? '' : s.entry;
        if (key === '.' && old.includes('.')) return s;
        return {
          ...s,
          entry: (old + key).replace(/^0+(?=\d)/, '').slice(0, 10) || '0',
          replace: false,
        };
      }
      if (key === '⌫')
        return { ...s, entry: s.entry.slice(0, -1) || '0', replace: false };
      if (key === '±') return { ...s, entry: format(-Number(s.entry)) };
      const number = Number(s.entry);
      if (!Number.isFinite(number)) return reset;
      const result =
        s.op && s.stored !== null && !s.replace
          ? calculate(s.stored, number, s.op)
          : number;
      if (key === '=')
        return { entry: format(result), stored: null, op: null, replace: true };
      return { entry: format(result), stored: result, op: key, replace: true };
    });
  const keys = [
    'C',
    '±',
    '⌫',
    '÷',
    '7',
    '8',
    '9',
    '×',
    '4',
    '5',
    '6',
    '−',
    '1',
    '2',
    '3',
    '+',
    '0',
    '.',
    '=',
    '',
  ];
  return (
    <div
      className="obj-calculator"
      tabIndex={0}
      role="group"
      aria-label="Calculator keyboard"
      onKeyDown={(e) => {
        const map: Record<string, string> = {
          '/': '÷',
          '*': '×',
          '-': '−',
          Enter: '=',
          Escape: 'C',
          Backspace: '⌫',
        };
        const key = map[e.key] ?? e.key;
        if (keys.includes(key)) {
          e.preventDefault();
          act(key);
        }
      }}
    >
      <Surface elevation={-3} className="obj-calculator-screen">
        <small>{state.op ?? 'CERAMIC / 01'}</small>
        <output aria-live="polite">{state.entry}</output>
      </Surface>
      <div className="obj-calculator-keys">
        {keys.filter(Boolean).map((key) => (
          <Key
            key={key}
            label={`Calculator ${key}`}
            tone={
              key === '='
                ? 'orange'
                : ['÷', '×', '−', '+'].includes(key)
                  ? 'sage'
                  : 'porcelain'
            }
            className={key === '=' ? 'wide' : ''}
            onClick={() => act(key)}
          >
            {key}
          </Key>
        ))}
      </div>
    </div>
  );
}
export function SplitTally() {
  const [value, setValue] = useState(128);
  return (
    <div className="obj-stack">
      <div className="obj-tally" aria-hidden="true">
        {String(value)
          .padStart(4, '0')
          .split('')
          .map((n, i) => (
            <Surface key={i} elevation={7} tone={i === 3 ? 'yellow' : 'chalk'}>
              <span>{n}</span>
              <i />
            </Surface>
          ))}
      </div>
      <Field label="FOUR DIGITS">
        <input
          aria-label="Tally value"
          type="number"
          min="0"
          max="9999"
          value={value}
          onChange={(e) =>
            setValue(
              Math.max(0, Math.min(9999, Math.round(Number(e.target.value)))),
            )
          }
        />
      </Field>
      <div className="obj-row centered">
        <Key
          label="Tally minus one"
          icon="minus"
          onClick={() => setValue((v) => Math.max(0, v - 1))}
        />
        <Key
          label="Tally plus one"
          icon="plus"
          onClick={() => setValue((v) => Math.min(9999, v + 1))}
        />
      </div>
    </div>
  );
}
export function PinEntry() {
  const [pin, setPin] = useState(''),
    [reveal, setReveal] = useState(false);
  return (
    <div className="obj-stack">
      <Icon name="lock" size={32} />
      <label className="obj-pin">
        <span className="sr-only">Six digit code</span>
        <div aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <Surface
              key={i}
              elevation={pin[i] ? 5 : -2}
              tone={pin.length === 6 ? 'sage' : 'porcelain'}
            >
              {pin[i] ? (reveal ? pin[i] : '•') : '·'}
            </Surface>
          ))}
        </div>
        <input
          aria-label="Six digit code"
          inputMode="numeric"
          autoComplete="off"
          type={reveal ? 'text' : 'password'}
          maxLength={6}
          value={pin}
          onChange={(e) =>
            setPin(e.target.value.replace(/\D/g, '').slice(0, 6))
          }
        />
      </label>
      <button
        type="button"
        className="obj-text-button"
        aria-pressed={reveal}
        onClick={() => setReveal(!reveal)}
      >
        {reveal ? 'Hide digits' : 'Show digits'}
      </button>
      <span className="obj-caption" role="status">
        {pin.length === 6
          ? 'Six digits entered · local preview'
          : `${pin.length} of 6 digits`}
      </span>
    </div>
  );
}
