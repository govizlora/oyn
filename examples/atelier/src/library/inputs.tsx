import { useId, useState } from 'react';
import { Dial, Icon, Key, Surface, Switch, css } from '../controls';
import { ChoiceChips } from '../everyday';
import { Field, Readout } from './shared';

export function Aperture() {
  const [value, setValue] = useState(64);
  return (
    <div className="obj-stack">
      <Dial label="Aperture" value={value} onChange={setValue}>
        <output className="obj-dial-number">
          {value}
          <small>%</small>
        </output>
      </Dial>
      <div className="obj-meter" aria-hidden="true">
        {Array.from({ length: 20 }, (_, i) => (
          <i key={i} data-on={i < value / 5} />
        ))}
      </div>
    </div>
  );
}
export function Switchboard() {
  const [values, setValues] = useState([true, false, true]);
  return (
    <div className="obj-stack obj-switchboard">
      {['Airplane mode', 'Notifications', 'Automatic updates'].map(
        (name, i) => (
          <div className="obj-row" key={name}>
            <Icon name={(['arrow', 'bell', 'loop'] as const)[i]} />
            <span>{name}</span>
            <Switch
              label={name}
              checked={values[i]}
              onChange={(v) =>
                setValues((old) => old.map((n, j) => (j === i ? v : n)))
              }
            />
          </div>
        ),
      )}
    </div>
  );
}
export function ManyChoices() {
  const [value, setValue] = useState(['Design', 'Objects']);
  return (
    <div className="obj-stack">
      <Readout caption="independent choices">
        {String(value.length).padStart(2, '0')}
      </Readout>
      <ChoiceChips
        label="Interests"
        options={['Design', 'Objects', 'Type', 'Spaces', 'Ideas', 'Future']}
        value={value}
        onChange={setValue}
      />
    </div>
  );
}
export function Interval() {
  const [range, setRange] = useState([24, 76]);
  const update = (index: number, value: number) =>
    setRange(([a, b]) =>
      index === 0
        ? [Math.max(0, Math.min(value, b)), b]
        : [a, Math.min(100, Math.max(value, a))],
    );
  return (
    <div className="obj-stack">
      <div className="obj-split">
        <Readout caption="FROM">{range[0]}</Readout>
        <span className="obj-dash" />
        <Readout caption="TO">{range[1]}</Readout>
      </div>
      <Surface className="obj-interval" elevation={-3}>
        <div
          className="obj-interval-fill"
          style={css({ '--from': `${range[0]}%`, '--to': `${range[1]}%` })}
        />
        {range.map((value, index) => (
          <Surface
            key={index}
            className="obj-interval-knob"
            elevation={7}
            // At the shared upper endpoint, expose the lower thumb so the
            // collapsed interval can always be reopened with a pointer.
            style={{
              left: `${value}%`,
              zIndex: index === 0 && value === 100 ? 3 : undefined,
            }}
          >
            <input
              type="range"
              aria-label={index === 0 ? 'Lower bound' : 'Upper bound'}
              min={index === 0 ? 0 : range[0]}
              max={index === 0 ? range[1] : 100}
              value={value}
              onChange={(e) => update(index, +e.target.value)}
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.focus();
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                  const rect = e.currentTarget
                    .closest('.obj-interval')!
                    .getBoundingClientRect();
                  update(
                    index,
                    Math.round(((e.clientX - rect.left) / rect.width) * 100),
                  );
                }
              }}
            />
          </Surface>
        ))}
      </Surface>
      <span className="obj-caption">Two ends. One continuous thought.</span>
    </div>
  );
}
export function Counter() {
  const [value, setValue] = useState(12);
  return (
    <div className="obj-stack">
      <div className="obj-counter">
        <Key
          label="Decrease quantity"
          icon="minus"
          onClick={() => setValue((v) => Math.max(0, v - 1))}
        />
        <Field label="QUANTITY">
          <input
            aria-label="Quantity"
            type="number"
            min="0"
            max="99"
            value={value}
            onChange={(e) =>
              setValue(Math.max(0, Math.min(99, Number(e.target.value))))
            }
          />
        </Field>
        <Key
          label="Increase quantity"
          tone="orange"
          icon="plus"
          onClick={() => setValue((v) => Math.min(99, v + 1))}
        />
      </div>
      <span className="obj-caption">A little more. A little less.</span>
    </div>
  );
}
export function Rating() {
  const [value, setValue] = useState(4);
  const name = useId();
  return (
    <div className="obj-stack">
      <div className="obj-stars" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n}>
            <Surface
              elevation={n <= value ? 6 : 0}
              tone={n <= value ? 'yellow' : 'porcelain'}
            >
              <Icon name="star" />
            </Surface>
            <input
              type="radio"
              name={name}
              aria-label={`${n} stars`}
              checked={n === value}
              onChange={() => setValue(n)}
            />
          </label>
        ))}
      </div>
      <Readout caption="a very good feeling">
        {value}
        <small> / 5</small>
      </Readout>
    </div>
  );
}
