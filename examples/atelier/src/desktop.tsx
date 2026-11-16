import { useEffect, useRef, useState } from 'react';
import {
  Dial,
  Fader,
  Icon,
  InstrumentHeader,
  Key,
  Led,
  Screws,
  Segments,
  Surface,
  Switch,
} from './controls';
import {
  Calendar,
  Check,
  ChoiceChips,
  Files,
  SelectMenu,
  dateFromKey,
  dateKey,
} from './everyday';
import { Phosphor } from './phosphor';

function SystemControls() {
  const [brightness, setBrightness] = useState(68),
    [profile, setProfile] = useState(0);
  const [wifi, setWifi] = useState(true),
    [focus, setFocus] = useState(false),
    [warmth, setWarmth] = useState(42);
  const [space, setSpace] = useState<'personal' | 'studio' | 'shared'>(
    'studio',
  );
  return (
    <section className="system-controls" aria-label="Control center">
      <div className="widget-title">
        <Icon name="sliders" />
        <span>Control center</span>
        <Led />
      </div>
      <div className="brightness-control">
        <Dial
          label="Screen brightness"
          value={brightness}
          onChange={setBrightness}
          tone={profile === 1 ? 'sage' : profile === 2 ? 'lilac' : 'porcelain'}
        >
          <output aria-hidden="true" className="dial-value">
            {brightness}
            <span>%</span>
          </output>
        </Dial>
        <span className="dial-caption">
          <Icon name="sun" />
          Brightness
        </span>
      </div>
      <Segments
        label="Display profile"
        icons={['sun', 'moon', 'circle']}
        value={profile}
        onChange={setProfile}
      />
      <div className="system-warmth">
        <Icon name="sun" />
        <Fader label="Color temperature" value={warmth} onChange={setWarmth} />
        <span className="warmth-dot" style={{ opacity: 0.3 + warmth / 150 }} />
      </div>
      <div className="system-toggle">
        <span>
          <Icon name="wifi" />
          Wi-Fi
        </span>
        <Switch label="Wi-Fi" checked={wifi} onChange={setWifi} />
      </div>
      <div className="system-toggle">
        <span>
          <Icon name="moon" />
          Focus
        </span>
        <Switch label="Focus mode" checked={focus} onChange={setFocus} />
      </div>
      <div className="workspace-menu">
        <Icon name="folder" />
        <SelectMenu
          label="Workspace"
          above
          value={space}
          onChange={setSpace}
          options={[
            { value: 'personal', label: 'Personal', icon: 'circle' },
            { value: 'studio', label: 'Studio', icon: 'diamond' },
            { value: 'shared', label: 'Shared', icon: 'grid' },
          ]}
        />
      </div>
    </section>
  );
}

export function FocusStudy() {
  const [day, setDay] = useState('2026-11-18'),
    [duration, setDuration] = useState(25),
    [focus, setFocus] = useState(false);
  const [tasks, setTasks] = useState([true, false, false]);
  const chosen = dateFromKey(day);
  return (
    <Surface
      className="instrument focus-instrument"
      tone="porcelain"
      elevation={18}
    >
      <Screws />
      <InstrumentHeader>
        <span className="engraved-word">FOCUS</span>
        <Led on={focus} tone="sage" />
      </InstrumentHeader>
      <div className="focus-layout">
        <section className="focus-object" aria-label="Focus settings">
          <span className="object-eyebrow">
            <Icon name="moon" />
            Quiet time
          </span>
          <Dial
            className="focus-dial"
            label="Focus duration"
            value={duration}
            onChange={setDuration}
          >
            <output aria-hidden="true" className="dial-value">
              {duration}
              <span>min</span>
            </output>
          </Dial>
          <div
            className="duration-presets"
            role="radiogroup"
            aria-label="Focus presets"
          >
            {[25, 45, 60].map((value) => (
              <label key={value} data-selected={duration === value}>
                {duration === value && (
                  <Surface className="preset-surface" elevation={4} />
                )}
                <input
                  type="radio"
                  name="duration"
                  aria-label={`${value} minutes`}
                  checked={duration === value}
                  onChange={() => setDuration(value)}
                />
                <span>{value}</span>
              </label>
            ))}
          </div>
          <div className="focus-mode">
            <Icon name="bell" />
            <Switch
              label="Quiet time enabled"
              checked={focus}
              onChange={setFocus}
            />
            <Led on={focus} tone="sage" />
          </div>
        </section>
        <section className="focus-agenda" aria-label="Daily agenda">
          <Calendar value={day} onChange={setDay} />
          <div className="task-list">
            <div className="task-heading">
              <span>
                {chosen.getDate().toString().padStart(2, '0')} /{' '}
                {String(chosen.getMonth() + 1).padStart(2, '0')}
              </span>
              <span>{tasks.filter(Boolean).length} / 3</span>
            </div>
            {['Sketch a little', 'A few pages', 'Go outside'].map((task, i) => (
              <Check
                key={task}
                label={task}
                checked={tasks[i]}
                onChange={(checked) =>
                  setTasks(tasks.map((t, j) => (i === j ? checked : t)))
                }
              >
                <span className="task-label">{task}</span>
                <span className="task-time">
                  {['09:30', '14:00', '17:30'][i]}
                </span>
              </Check>
            ))}
          </div>
        </section>
      </div>
      <div className="focus-footer">
        <span className="footer-grooves" aria-hidden="true" />
        <div className="focus-status">
          <Led on={focus} tone="sage" />
          <span>{focus ? 'Do not disturb' : 'Available'}</span>
        </div>
        <div className="shortcut-keys">
          <Key label="25 minute preset" onClick={() => setDuration(25)}>
            ⌘
          </Key>
          <Key label="45 minute preset" onClick={() => setDuration(45)}>
            ⌥
          </Key>
          <Key
            label="Toggle quiet time"
            icon="moon"
            active={focus}
            onClick={() => setFocus(!focus)}
            tone="yellow"
          />
        </div>
      </div>
    </Surface>
  );
}

export function PlayStudy() {
  const [day, setDay] = useState('2026-11-18'),
    [tags, setTags] = useState(['Ideas', 'Personal']);
  const [starred, setStarred] = useState(false);
  const search = useRef<HTMLInputElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const focusSearch = () => search.current?.focus();
  const focusCalendar = () =>
    host.current
      ?.querySelector<HTMLButtonElement>('.calendar [tabindex="0"]')
      ?.focus();
  const focusControls = () =>
    host.current
      ?.querySelector<HTMLInputElement>('[aria-label="Screen brightness"]')
      ?.focus();
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        focusSearch();
      }
    };
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, []);
  return (
    <div ref={host} className="desktop-host">
      <Surface
        className="instrument desktop-instrument"
        tone="porcelain"
        elevation={18}
      >
        <Screws />
        <InstrumentHeader>
          <div className="window-controls" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <span className="engraved-word">PERSONAL SPACE</span>
          <Led />
        </InstrumentHeader>
        <div className="desktop-layout">
          <section className="desktop-left" aria-label="Calendar and code">
            <Calendar value={day} onChange={setDay} />
            <Surface className="desktop-terminal" elevation={-3}>
              <Phosphor kind="code" amber />
              <div className="terminal-indicators">
                <span />
                <span />
                <Led />
              </div>
            </Surface>
          </section>
          <div className="desktop-center">
            <Files searchRef={search} />
            <section className="organize-panel" aria-label="Tags">
              <div className="widget-title">
                <Icon name="circle" />
                <span>Labels</span>
                <span className="small-count">
                  {tags.length.toString().padStart(2, '0')}
                </span>
              </div>
              <ChoiceChips
                label="Tags"
                options={['Ideas', 'Personal', 'Later']}
                value={tags}
                onChange={setTags}
              />
            </section>
          </div>
          <SystemControls />
        </div>
        <div className="desktop-footer">
          <div className="shortcut-keys">
            <Key label="Focus search with Command K" onClick={focusSearch}>
              <Icon name="command" />
            </Key>
            <Key label="Focus search" onClick={focusSearch}>
              K
            </Key>
            <span className="shortcut-divider" />
            <Key
              label="Previous selected day"
              icon="left"
              onClick={() => {
                const date = dateFromKey(day);
                date.setDate(date.getDate() - 1);
                setDay(dateKey(date));
              }}
            />
            <Key
              label="Star workspace"
              icon="star"
              tone="orange"
              active={starred}
              onClick={() => setStarred(!starred)}
            />
          </div>
          <Surface className="desktop-dock" elevation={-2}>
            <Key label="Open files" icon="folder" onClick={focusSearch} />
            <Key
              label="Open calendar"
              icon="calendar"
              onClick={focusCalendar}
            />
            <Key
              label="Open control center"
              icon="sliders"
              onClick={focusControls}
            />
            <Key label="Search workspace" icon="search" onClick={focusSearch} />
          </Surface>
          <div className="workspace-status" role="status">
            <Led on={starred} tone="sage" />
            <span>{starred ? 'Starred' : 'Local workspace'}</span>
            <Icon name="cloud" />
          </div>
        </div>
      </Surface>
    </div>
  );
}
