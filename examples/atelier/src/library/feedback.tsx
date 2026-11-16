import { useRef, useState } from 'react';
import { Icon, Key, Surface } from '../controls';
import { Check } from '../everyday';
import { Field, Plate, Rail, Readout } from './shared';

export function Notifications() {
  const next = useRef(3);
  const [state, setState] = useState<{
    items: { id: number; text: string }[];
    last: { id: number; text: string } | null;
  }>({
    items: [
      { id: 1, text: 'A little space to think' },
      { id: 2, text: 'Your next idea is waiting' },
    ],
    last: null,
  });
  return (
    <div className="obj-stack">
      <div className="obj-notifications" aria-live="polite">
        {state.items.map((item) => (
          <Surface key={item.id} elevation={6} className="obj-toast">
            <Surface
              tone={item.id % 2 ? 'sage' : 'lilac'}
              elevation={3}
              className="obj-toast-icon"
            >
              <Icon name="bell" />
            </Surface>
            <span>{item.text}</span>
            <button
              type="button"
              aria-label={`Dismiss notification ${item.id}`}
              onClick={() =>
                setState((old) => ({
                  items: old.items.filter((n) => n.id !== item.id),
                  last: item,
                }))
              }
            >
              ×
            </button>
          </Surface>
        ))}
        {!state.items.length && <span className="obj-caption">All quiet.</span>}
      </div>
      <div className="obj-row">
        <Key
          label="Add notification"
          icon="plus"
          onClick={() => {
            const id = next.current++;
            setState((old) => ({
              ...old,
              items: [
                ...old.items,
                { id, text: `A new possibility · ${id}` },
              ].slice(-3),
            }));
          }}
        />
        <button
          type="button"
          className="obj-text-button"
          disabled={!state.last}
          onClick={() =>
            setState((old) => ({
              items: [...old.items, old.last!].slice(-3),
              last: null,
            }))
          }
        >
          Undo dismiss
        </button>
      </div>
    </div>
  );
}
export function ProgressTracks() {
  const [value, setValue] = useState(62);
  return (
    <div className="obj-stack">
      <div className="obj-ring">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="49" className="obj-ring-track" />
          <circle
            cx="60"
            cy="60"
            r="49"
            className="obj-ring-fill"
            pathLength="100"
            strokeDasharray={`${value} 100`}
          />
        </svg>
        <Readout>
          {value}
          <small>%</small>
        </Readout>
      </div>
      <Surface className="obj-progress-track" elevation={-3}>
        <div style={{ width: `${value}%` }} />
      </Surface>
      <div className="obj-row centered">
        <Key
          label="Reduce progress"
          icon="minus"
          onClick={() => setValue((v) => Math.max(0, v - 10))}
        />
        <span className="obj-caption">Progress study</span>
        <Key
          label="Advance progress"
          icon="plus"
          tone="orange"
          onClick={() => setValue((v) => Math.min(100, v + 10))}
        />
      </div>
    </div>
  );
}
export function Workflow() {
  const [step, setStep] = useState(1);
  const names = ['Gather', 'Shape', 'Review', 'Release'];
  return (
    <div className="obj-stack">
      <div className="obj-workflow">
        {names.map((name, i) => (
          <button
            type="button"
            aria-label={`Go to ${name}`}
            aria-current={i === step ? 'step' : undefined}
            key={name}
            onClick={() => setStep(i)}
          >
            <Surface
              elevation={i === step ? 8 : 1}
              tone={i < step ? 'sage' : i === step ? 'orange' : 'porcelain'}
            >
              {i < step ? <Icon name="check" size={17} /> : i + 1}
            </Surface>
            <span>{name}</span>
          </button>
        ))}
      </div>
      <Plate className="obj-workflow-panel">
        <small>0{step + 1} / 04</small>
        <strong>{names[step]}</strong>
        <div className="obj-ink-lines">
          <i />
          <i />
          <i />
        </div>
      </Plate>
      <div className="obj-row centered">
        <Key
          label="Previous step"
          icon="left"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        />
        <Key
          label="Next step"
          icon="right"
          onClick={() => setStep((s) => Math.min(3, s + 1))}
        />
      </div>
    </div>
  );
}
const storage = [
  { name: 'Objects', amount: 42, tone: 'sage' },
  { name: 'Images', amount: 28, tone: 'lilac' },
  { name: 'Notes', amount: 12, tone: 'yellow' },
  { name: 'Free', amount: 18, tone: 'porcelain' },
] as const;
export function Storage() {
  const [selected, setSelected] = useState('Objects');
  const item = storage.find((s) => s.name === selected)!;
  return (
    <div className="obj-stack">
      <Readout caption={`${selected} · sample capacity`}>
        {item.amount}
        <small> GB</small>
      </Readout>
      <Surface className="obj-storage" elevation={-2}>
        {storage.map((s) => (
          <button
            type="button"
            key={s.name}
            style={{ width: `${s.amount}%` }}
            aria-label={`${s.name}: ${s.amount} gigabytes`}
            aria-pressed={selected === s.name}
            onClick={() => setSelected(s.name)}
          >
            <Surface tone={s.tone} elevation={selected === s.name ? 8 : 3} />
          </button>
        ))}
      </Surface>
      <div className="obj-storage-legend">
        {storage.map((s) => (
          <button
            type="button"
            key={s.name}
            onClick={() => setSelected(s.name)}
            aria-pressed={s.name === selected}
          >
            <i data-tone={s.tone} />
            {s.name}
            <span>{s.amount}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
export function Permissions() {
  const [values, setValues] = useState([true, true, false]);
  const n = values.filter(Boolean).length;
  return (
    <div className="obj-stack">
      <Plate className="obj-permission">
        <div className="obj-row">
          <Icon name="lock" />
          <strong>Access</strong>
          <Check
            label="All permissions"
            checked={n === 3}
            mixed={n > 0 && n < 3}
            onChange={(v) => setValues([v, v, v])}
          />
        </div>
        {['Read', 'Edit', 'Invite'].map((name, i) => (
          <div className="obj-row" key={name}>
            <span>{name}</span>
            <Check
              label={`${name} permission`}
              checked={values[i]}
              onChange={(v) =>
                setValues((old) => old.map((a, j) => (j === i ? v : a)))
              }
            />
          </div>
        ))}
      </Plate>
      <span className="obj-caption" role="status">
        {n} of 3 permissions · local preview
      </span>
    </div>
  );
}
export function Validation() {
  const [email, setEmail] = useState(''),
    [ready, setReady] = useState(false),
    [role, setRole] = useState('Viewer');
  return (
    <form
      className="obj-stack"
      onSubmit={(e) => {
        e.preventDefault();
        setReady(true);
      }}
    >
      <Surface
        className="obj-avatar"
        tone={ready ? 'sage' : 'lilac'}
        elevation={7}
      >
        <Icon name={ready ? 'check' : 'mail'} size={30} />
      </Surface>
      <Field label="EMAIL">
        <input
          type="email"
          aria-label="Email address"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setReady(false);
          }}
        />
      </Field>
      <Rail
        label="Role"
        options={['Viewer', 'Editor']}
        value={role}
        onChange={(v) => {
          setRole(v);
          setReady(false);
        }}
      />
      <button type="submit" className="obj-submit">
        Check invitation <Icon name="arrow" size={16} />
      </button>
      <span className="obj-caption" role="status">
        {ready
          ? `${role} · ready, not sent`
          : 'Local validation · no email is sent'}
      </span>
    </form>
  );
}
