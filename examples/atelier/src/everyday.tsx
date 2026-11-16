import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Icon,
  Key,
  Surface,
  useCeramic,
  type Glyph,
  type Tone,
} from './controls';

export function Check({
  label,
  checked,
  onChange,
  mixed = false,
  children,
  className = '',
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  mixed?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const ref = useCeramic<HTMLSpanElement>(
    checked || mixed ? 'orange' : 'porcelain',
    checked || mixed ? 3 : -2,
    3,
  );
  useLayoutEffect(() => {
    if (input.current) input.current.indeterminate = mixed;
  }, [mixed]);
  return (
    <label className={`check ${className}`} data-checked={checked || mixed}>
      <span ref={ref} className="check-box" aria-hidden="true">
        {(checked || mixed) && <Icon name={mixed ? 'minus' : 'check'} />}
      </span>
      <input
        ref={input}
        type="checkbox"
        aria-label={label}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {children}
    </label>
  );
}

// Native details owns open/closed state. The same dismissal and focus path is
// used by every dropdown; selection state stays with its actual form inputs.
export function Menu({
  label,
  children,
  className = '',
  above = false,
}: {
  label: ReactNode;
  children: (close: () => void) => ReactNode;
  className?: string;
  above?: boolean;
}) {
  const host = useRef<HTMLDetailsElement>(null);
  const ref = useCeramic<HTMLElement>('porcelain', 4, 4);
  const close = (restoreFocus: boolean) => {
    if (!host.current?.open) return;
    host.current.open = false;
    if (restoreFocus) host.current.querySelector('summary')?.focus();
  };
  useEffect(() => {
    const outside = (event: Event) => {
      if (!host.current?.contains(event.target as Node)) close(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && host.current?.open) {
        event.preventDefault();
        close(true);
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
      document.removeEventListener('keydown', escape);
    };
  }, []);
  return (
    <details
      ref={host}
      className={`menu ${className}`}
      name="atelier-popover"
      data-above={above}
    >
      <summary
        ref={ref}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            host.current!.open = true;
            host.current
              ?.querySelector<HTMLElement>(
                '.menu-panel input, .menu-panel button',
              )
              ?.focus();
          }
        }}
      >
        {label}
        <Icon name="down" />
      </summary>
      <Surface className="menu-panel" tone="chalk" elevation={12}>
        {children(() => close(true))}
      </Surface>
    </details>
  );
}

export function SelectMenu<T extends string>({
  label,
  options,
  value,
  onChange,
  above = false,
}: {
  label: string;
  options: readonly { value: T; label: string; icon?: Glyph }[];
  value: T;
  onChange: (value: T) => void;
  above?: boolean;
}) {
  const name = useId();
  return (
    <Menu
      label={
        <>
          <span className="sr-only">{label}: </span>
          {options.find((option) => option.value === value)?.label}
        </>
      }
      above={above}
    >
      {(close) => (
        <fieldset>
          <legend>{label}</legend>
          {options.map((option) => (
            <label
              key={option.value}
              className="menu-option"
              data-selected={value === option.value}
            >
              {option.icon && <Icon name={option.icon} />}
              <span>{option.label}</span>
              <input
                type="radio"
                name={name}
                checked={value === option.value}
                aria-label={`${label}: ${option.label}`}
                onChange={() => {
                  onChange(option.value);
                  close();
                }}
              />
              {value === option.value && <Icon name="check" />}
            </label>
          ))}
        </fieldset>
      )}
    </Menu>
  );
}

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
export const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const dateFromKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
};
const dateName = (date: Date) =>
  `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
export function Calendar({
  value,
  onChange,
  className = '',
}: {
  value: string;
  onChange: (date: string) => void;
  className?: string;
}) {
  const selected = dateFromKey(value);
  const [month, setMonth] = useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1, 12),
  );
  const host = useRef<HTMLDivElement>(null);
  const label = useId();
  const pendingFocus = useRef<string | null>(null);
  useLayoutEffect(() => {
    const next = dateFromKey(value);
    setMonth((previous) =>
      previous.getMonth() === next.getMonth() &&
      previous.getFullYear() === next.getFullYear()
        ? previous
        : new Date(next.getFullYear(), next.getMonth(), 1, 12),
    );
  }, [value]);
  useLayoutEffect(() => {
    // Focus only after the selected month's DOM has committed. A deferred rAF
    // loses rapid consecutive key presses and can focus a soon-to-be-removed cell.
    if (
      !pendingFocus.current ||
      month.getMonth() !== selected.getMonth() ||
      month.getFullYear() !== selected.getFullYear()
    )
      return;
    const button = host.current?.querySelector<HTMLButtonElement>(
      `[data-date="${pendingFocus.current}"]`,
    );
    if (button) {
      button.focus();
      pendingFocus.current = null;
    }
  }, [value, month]);
  const offset = (month.getDay() + 6) % 7;
  const days = Array.from(
    { length: 42 },
    (_, i) =>
      new Date(month.getFullYear(), month.getMonth(), i - offset + 1, 12),
  );
  const inMonth = (date: Date) =>
    date.getMonth() === month.getMonth() &&
    date.getFullYear() === month.getFullYear();
  const choose = (date: Date) => {
    const key = dateKey(date);
    pendingFocus.current = key === value ? null : key;
    onChange(key);
  };
  return (
    <div className={`calendar ${className}`} ref={host}>
      <div className="calendar-heading">
        <div id={label}>
          <strong>{months[month.getMonth()]}</strong>
          <span>{month.getFullYear()}</span>
        </div>
        <div className="calendar-nav">
          <Key
            label="Previous month"
            icon="left"
            onClick={() =>
              setMonth(
                new Date(month.getFullYear(), month.getMonth() - 1, 1, 12),
              )
            }
          />
          <Key
            label="Next month"
            icon="right"
            onClick={() =>
              setMonth(
                new Date(month.getFullYear(), month.getMonth() + 1, 1, 12),
              )
            }
          />
        </div>
      </div>
      <table aria-labelledby={label}>
        <thead>
          <tr>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <th scope="col" key={day} aria-label={day}>
                {day[0]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }, (_, row) => (
            <tr key={row}>
              {days.slice(row * 7, row * 7 + 7).map((date) => {
                const key = dateKey(date),
                  active = key === value;
                return (
                  <td key={key}>
                    <button
                      type="button"
                      data-date={key}
                      data-outside={!inMonth(date)}
                      aria-label={dateName(date)}
                      aria-pressed={active}
                      tabIndex={
                        inMonth(selected)
                          ? active
                            ? 0
                            : -1
                          : inMonth(date) && date.getDate() === 1
                            ? 0
                            : -1
                      }
                      onClick={() => choose(date)}
                      onKeyDown={(event) => {
                        const shifts: Record<string, number> = {
                          ArrowLeft: -1,
                          ArrowRight: 1,
                          ArrowUp: -7,
                          ArrowDown: 7,
                          Home: -((date.getDay() + 6) % 7),
                          End: 6 - ((date.getDay() + 6) % 7),
                        };
                        if (event.key in shifts) {
                          event.preventDefault();
                          choose(
                            new Date(
                              date.getFullYear(),
                              date.getMonth(),
                              date.getDate() + shifts[event.key],
                              12,
                            ),
                          );
                        }
                        if (
                          event.key === 'PageUp' ||
                          event.key === 'PageDown'
                        ) {
                          event.preventDefault();
                          const m =
                            date.getMonth() +
                            (event.key === 'PageDown' ? 1 : -1);
                          const last = new Date(
                            date.getFullYear(),
                            m + 1,
                            0,
                          ).getDate();
                          choose(
                            new Date(
                              date.getFullYear(),
                              m,
                              Math.min(date.getDate(), last),
                              12,
                            ),
                          );
                        }
                      }}
                    >
                      {active && (
                        <Surface
                          elevation={5}
                          tone="orange"
                          className="calendar-selection"
                        />
                      )}
                      <span>{date.getDate()}</span>
                      {inMonth(date) &&
                        [5, 12, 18, 24].includes(date.getDate()) && (
                          <i className="calendar-event" aria-hidden="true" />
                        )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="calendar-foot">
        <span className="calendar-event" />
        <span>Personal</span>
        <span className="calendar-event work" />
        <span>Studio</span>
        <span className="calendar-zone">GMT−8</span>
      </div>
    </div>
  );
}

export type FileKind = 'Design' | 'Notes' | 'Images';
type FileItem = {
  id: number;
  name: string;
  kind: FileKind;
  icon: Glyph;
  tone: Tone;
  size: string;
  modified: number;
  progress: number;
};
const files: readonly FileItem[] = [
  {
    id: 1,
    name: 'Soft forms',
    kind: 'Design',
    icon: 'diamond',
    tone: 'lilac',
    size: '2.4 MB',
    modified: 18,
    progress: 78,
  },
  {
    id: 2,
    name: 'Field notes',
    kind: 'Notes',
    icon: 'file',
    tone: 'sage',
    size: '84 KB',
    modified: 16,
    progress: 45,
  },
  {
    id: 3,
    name: 'Daylight',
    kind: 'Images',
    icon: 'sun',
    tone: 'yellow',
    size: '6.8 MB',
    modified: 12,
    progress: 92,
  },
  {
    id: 4,
    name: 'Fragments',
    kind: 'Design',
    icon: 'grid',
    tone: 'porcelain',
    size: '1.2 MB',
    modified: 8,
    progress: 63,
  },
];
const kinds: FileKind[] = ['Design', 'Notes', 'Images'];
const sortOptions = [
  { value: 'recent', label: 'Recent', icon: 'calendar' },
  { value: 'name', label: 'Name', icon: 'list' },
  { value: 'size', label: 'Size', icon: 'columns' },
] as const;

export function Files({
  searchRef,
}: {
  searchRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [query, setQuery] = useState(''),
    [sort, setSort] = useState<'recent' | 'name' | 'size'>('recent');
  const [filters, setFilters] = useState<FileKind[]>(kinds),
    [selection, setSelection] = useState<number[]>([1, 3]);
  const [view, setView] = useState(0);
  const visible = files
    .filter(
      (file) =>
        filters.includes(file.kind) &&
        file.name.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name)
        : sort === 'size'
          ? sizeOf(b) - sizeOf(a)
          : b.modified - a.modified,
    );
  const selectedVisible = visible.filter((file) =>
    selection.includes(file.id),
  ).length;
  const toggle = (id: number) =>
    setSelection((old) =>
      old.includes(id) ? old.filter((value) => value !== id) : [...old, id],
    );
  return (
    <section className="files-panel" aria-label="Files">
      <div className="files-heading">
        <div className="widget-title">
          <Icon name="folder" />
          <span>Collection</span>
          <span className="small-count">
            {files.length.toString().padStart(2, '0')}
          </span>
        </div>
        <Menu
          label={
            <>
              <span className="sr-only">File types</span>
              <Icon name="sliders" />
              <span>{filters.length}</span>
            </>
          }
        >
          {() => (
            <fieldset>
              <legend>File types</legend>
              {kinds.map((kind) => (
                <Check
                  key={kind}
                  label={`Show ${kind}`}
                  checked={filters.includes(kind)}
                  onChange={(checked) =>
                    setFilters(
                      checked
                        ? [...filters, kind]
                        : filters.filter((value) => value !== kind),
                    )
                  }
                >
                  <span>{kind}</span>
                  <span className={`type-dot type-${kind.toLowerCase()}`} />
                </Check>
              ))}
            </fieldset>
          )}
        </Menu>
      </div>
      <Surface className="search-field" elevation={-2}>
        <Icon name="search" />
        <input
          ref={searchRef}
          type="search"
          placeholder="Find something"
          aria-label="Find files"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <kbd>⌘ K</kbd>
      </Surface>
      <div className="files-toolbar">
        <div className="file-view" role="radiogroup" aria-label="File view">
          {(['list', 'grid'] as const).map((icon, i) => (
            <label key={icon} data-selected={i === view}>
              <input
                type="radio"
                name="file-view"
                aria-label={`${icon} view`}
                checked={i === view}
                onChange={() => setView(i)}
              />
              <Icon name={icon} />
            </label>
          ))}
        </div>
        <SelectMenu
          label="Sort"
          options={sortOptions}
          value={sort}
          onChange={setSort}
        />
      </div>
      {visible.length === 0 ? (
        <div className="empty-files">
          <Icon name="search" />
          <span>No matches</span>
          <button
            onClick={() => {
              setQuery('');
              setFilters(kinds);
            }}
          >
            Clear filters
          </button>
        </div>
      ) : view === 0 ? (
        <table className="file-table">
          <caption className="sr-only">Collection files</caption>
          <thead>
            <tr>
              <th scope="col">
                <Check
                  label="Select all visible files"
                  checked={
                    visible.length > 0 && selectedVisible === visible.length
                  }
                  mixed={
                    selectedVisible > 0 && selectedVisible < visible.length
                  }
                  onChange={(checked) =>
                    setSelection((old) =>
                      checked
                        ? Array.from(
                            new Set([
                              ...old,
                              ...visible.map((file) => file.id),
                            ]),
                          )
                        : old.filter(
                            (id) => !visible.some((file) => file.id === id),
                          ),
                    )
                  }
                />
              </th>
              <th scope="col">Name</th>
              <th scope="col">Size</th>
              <th scope="col">Sync</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((file) => (
              <tr key={file.id} data-selected={selection.includes(file.id)}>
                <td>
                  <Surface
                    elevation={selection.includes(file.id) ? 3 : 0}
                    tone={selection.includes(file.id) ? 'chalk' : 'porcelain'}
                    className="file-row-surface"
                  />
                  <Check
                    label={`Select ${file.name}`}
                    checked={selection.includes(file.id)}
                    onChange={() => toggle(file.id)}
                  />
                </td>
                <td>
                  <div className="file-identity">
                    <Surface
                      elevation={3}
                      tone={file.tone}
                      className="file-icon"
                    >
                      <Icon name={file.icon} />
                    </Surface>
                    <div>
                      <strong>{file.name}</strong>
                      <span>
                        {file.kind} · {String(file.modified).padStart(2, '0')}{' '}
                        Nov
                      </span>
                    </div>
                  </div>
                </td>
                <td className="file-size">{file.size}</td>
                <td>
                  <span
                    className="file-progress"
                    aria-label={`Synced ${file.progress} percent`}
                    role="img"
                  >
                    <i style={{ width: `${file.progress}%` }} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="file-grid">
          {visible.map((file) => (
            <Surface
              key={file.id}
              className="file-tile"
              elevation={selection.includes(file.id) ? 5 : 1}
              tone="chalk"
            >
              <Surface className="file-icon" elevation={5} tone={file.tone}>
                <Icon name={file.icon} />
              </Surface>
              <span>{file.name}</span>
              <Check
                label={`Select ${file.name}`}
                checked={selection.includes(file.id)}
                onChange={() => toggle(file.id)}
              />
            </Surface>
          ))}
        </div>
      )}

      <div className="selection-bar">
        <span className="selection-count" role="status">
          {selection.length.toString().padStart(2, '0')} <span>selected</span>
        </span>
        <div className="selection-swatches" aria-hidden="true">
          {files
            .filter((file) => selection.includes(file.id))
            .map((file) => (
              <i key={file.id} data-tone={file.tone} />
            ))}
        </div>
        <button
          type="button"
          onClick={() => setSelection([])}
          disabled={selection.length === 0}
          aria-label="Clear selection"
        >
          <Icon name="minus" />
        </button>
      </div>
    </section>
  );
}
function sizeOf(file: FileItem) {
  return parseFloat(file.size) * (file.size.endsWith('MB') ? 1024 : 1);
}

export function ChoiceChips({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: readonly string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <fieldset className="choice-chips">
      <legend className="sr-only">{label}</legend>
      {options.map((option, i) => (
        <label key={option} data-selected={value.includes(option)}>
          {value.includes(option) && (
            <Surface
              elevation={4}
              className="chip-surface"
              tone={(['sage', 'lilac', 'yellow'] as const)[i % 3]}
            />
          )}
          <input
            type="checkbox"
            aria-label={option}
            checked={value.includes(option)}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? [...value, option]
                  : value.filter((v) => v !== option),
              )
            }
          />
          <span>{option}</span>
          {value.includes(option) && <Icon name="check" />}
        </label>
      ))}
    </fieldset>
  );
}
