import { useId, useRef, useState } from 'react';
import { Icon, Key, Surface, Switch, useCeramic } from '../controls';
import { Check, Files, Menu, SelectMenu } from '../everyday';
import { Field, Readout } from './shared';

export function OptionCapsule() {
  const [value, setValue] = useState('studio');
  return (
    <div className="obj-stack">
      <Surface
        className="obj-option-token"
        tone={
          value === 'studio'
            ? 'lilac'
            : value === 'personal'
              ? 'yellow'
              : 'sage'
        }
        elevation={9}
      >
        <Icon
          name={
            value === 'studio'
              ? 'diamond'
              : value === 'personal'
                ? 'circle'
                : 'grid'
          }
          size={40}
        />
      </Surface>
      <SelectMenu
        label="Collection"
        value={value}
        onChange={setValue}
        options={[
          { value: 'studio', label: 'Studio', icon: 'diamond' },
          { value: 'personal', label: 'Personal', icon: 'circle' },
          { value: 'shared', label: 'Shared', icon: 'grid' },
        ]}
      />
      <span className="obj-caption">
        A small decision, beautifully contained.
      </span>
    </div>
  );
}
export function FilterPocket() {
  const [values, setValues] = useState(['Design', 'Images']);
  const options = ['Design', 'Images', 'Notes'];
  return (
    <div className="obj-stack">
      <Readout caption="ways of seeing">
        {String(values.length).padStart(2, '0')}
      </Readout>
      <Menu
        label={
          <>
            <Icon name="sliders" size={16} />
            <span>Show what matters</span>
            <small>{values.length}</small>
          </>
        }
      >
        {() => (
          <fieldset>
            <legend>COLLECTION TYPES</legend>
            {options.map((option) => (
              <Check
                key={option}
                label={`Include ${option}`}
                checked={values.includes(option)}
                onChange={(checked) =>
                  setValues((old) =>
                    checked
                      ? [...old, option]
                      : old.filter((v) => v !== option),
                  )
                }
              >
                <span>{option}</span>
              </Check>
            ))}
          </fieldset>
        )}
      </Menu>
      <div className="obj-filter-pills">
        {values.map((name) => (
          <span key={name}>{name}</span>
        ))}
      </div>
    </div>
  );
}
export function RaisedTable() {
  const search = useRef<HTMLInputElement>(null);
  return (
    <div className="obj-existing-files">
      <Files searchRef={search} />
    </div>
  );
}
export function WindowThings() {
  const [mode, setMode] = useState<'normal' | 'compact' | 'wide'>('normal');
  return (
    <div className="obj-stack">
      <div className="obj-window-stage">
        <Surface elevation={8} className="obj-window" data-mode={mode}>
          <header>
            <div>
              <button
                type="button"
                aria-label="Compact window"
                onClick={() => setMode('compact')}
              >
                <i />
              </button>
              <button
                type="button"
                aria-label="Restore window"
                onClick={() => setMode('normal')}
              >
                <i />
              </button>
              <button
                type="button"
                aria-label="Expand window"
                onClick={() => setMode('wide')}
              >
                <i />
              </button>
            </div>
            <span>Space to think</span>
          </header>
          {mode !== 'compact' && (
            <div className="obj-window-body">
              <Surface elevation={5} tone="lilac">
                <Icon name="diamond" size={25} />
              </Surface>
              <div className="obj-ink-lines">
                <i />
                <i />
                <i />
              </div>
            </div>
          )}
        </Surface>
      </div>
      <div className="obj-row centered">
        <Key
          label="Cycle window size"
          icon="expand"
          onClick={() =>
            setMode(
              mode === 'normal'
                ? 'wide'
                : mode === 'wide'
                  ? 'compact'
                  : 'normal',
            )
          }
        />
        <span className="obj-caption">
          {mode === 'normal'
            ? 'Comfortable'
            : mode === 'wide'
              ? 'A wider perspective'
              : 'Just the essentials'}
        </span>
      </div>
    </div>
  );
}
function Fold({
  name,
  heading,
  children,
  open = false,
}: {
  name: string;
  heading: string;
  children: React.ReactNode;
  open?: boolean;
}) {
  const ref = useCeramic<HTMLElement>('porcelain', 4, 4);
  return (
    <details name={name} className="obj-fold" open={open || undefined}>
      <summary ref={ref}>
        <span>{heading}</span>
        <Icon name="plus" size={14} />
      </summary>
      <div>{children}</div>
    </details>
  );
}
export function FoldedPaper() {
  const name = useId();
  return (
    <div className="obj-stack obj-folds">
      <Fold name={name} heading="Material" open>
        <p>Light finds the edge. A little shadow gives it weight.</p>
      </Fold>
      <Fold name={name} heading="Interaction">
        <p>The HTML stays real. Touch, type, select, and explore.</p>
      </Fold>
      <Fold name={name} heading="Possibility">
        <p>Choose a few objects. Make something of your own.</p>
      </Fold>
    </div>
  );
}
export function Properties() {
  const [size, setSize] = useState({
    width: 120,
    height: 80,
    locked: true,
    ratio: 1.5,
  });
  const change = (key: 'width' | 'height', value: number) =>
    setSize((old) => {
      const ratio = key === 'width' ? old.ratio : 1 / old.ratio;
      const n = Math.max(
        old.locked ? Math.max(40, 40 * ratio) : 40,
        Math.min(old.locked ? Math.min(160, 160 * ratio) : 160, value),
      );
      return {
        ...old,
        [key]: n,
        ...(old.locked
          ? { [key === 'width' ? 'height' : 'width']: n / ratio }
          : {}),
      };
    });
  return (
    <div className="obj-stack">
      <div className="obj-property-stage">
        <Surface
          elevation={6}
          tone="sage"
          style={{ width: size.width, height: size.height, borderRadius: 12 }}
        >
          <Icon name="expand" size={24} />
        </Surface>
      </div>
      <div className="obj-dimensions">
        {(['width', 'height'] as const).map((key) => (
          <Field label={key.toUpperCase()} key={key}>
            <input
              aria-label={`Frame ${key}`}
              type="number"
              min="40"
              max="160"
              value={Number(size[key].toFixed(1))}
              onChange={(e) => change(key, Number(e.target.value))}
            />
            <small>px</small>
          </Field>
        ))}
      </div>
      <div className="obj-row">
        <Icon name="lock" size={15} />
        <span>Keep proportions</span>
        <Switch
          label="Lock proportions"
          checked={size.locked}
          onChange={(locked) =>
            setSize((old) => ({
              ...old,
              locked,
              ratio: old.width / old.height,
            }))
          }
        />
      </div>
    </div>
  );
}
