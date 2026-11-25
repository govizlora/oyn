import { useId, useRef, useState } from 'react';
import { Icon, Key, Surface } from '../controls';
import { Field, Plate, Rail, Readout } from './shared';

export function BrowserTabs() {
  const [tabs, setTabs] = useState(['Objects', 'Notes', 'Space']);
  const [active, setActive] = useState('Objects');
  const seq = useRef(0),
    host = useRef<HTMLDivElement>(null),
    id = useId();
  return (
    <div className="obj-stack">
      <div
        className="obj-browser-tabs"
        role="tablist"
        aria-label="Open pages"
        ref={host}
      >
        {tabs.map((tab, i) => (
          <button
            type="button"
            key={tab}
            role="tab"
            id={`${id}-${tab}`}
            aria-controls={`${id}-panel`}
            aria-selected={tab === active}
            tabIndex={tab === active ? 0 : -1}
            onClick={() => setActive(tab)}
            onKeyDown={(e) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key))
                return;
              e.preventDefault();
              const next =
                e.key === 'Home'
                  ? 0
                  : e.key === 'End'
                    ? tabs.length - 1
                    : (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) %
                      tabs.length;
              setActive(tabs[next]);
              host.current
                ?.querySelectorAll<HTMLButtonElement>('[role=tab]')
                [next]?.focus();
            }}
          >
            {tab === active && (
              <Surface className="obj-tab-surface" elevation={5} />
            )}
            <span>{tab}</span>
          </button>
        ))}
      </div>
      <Plate className="obj-tab-page">
        <Icon name="folder" size={36} />
        <div
          role="tabpanel"
          id={`${id}-panel`}
          aria-labelledby={`${id}-${active}`}
        >
          {active}
        </div>
        <div className="obj-ink-lines">
          <i />
          <i />
          <i />
        </div>
      </Plate>
      <div className="obj-row">
        <Key
          label="Add page"
          icon="plus"
          onClick={() => {
            if (tabs.length < 5) {
              const title = `Page ${++seq.current}`;
              setTabs([...tabs, title]);
              setActive(title);
            }
          }}
        />
        <button
          type="button"
          className="obj-text-button"
          disabled={tabs.length === 1}
          onClick={() => {
            const next = tabs.filter((t) => t !== active);
            setTabs(next);
            setActive(next[0]);
          }}
        >
          Close page
        </button>
        <small>{tabs.length} / 5</small>
      </div>
    </div>
  );
}
export function Pagination() {
  const [page, setPage] = useState('3');
  return (
    <div className="obj-stack">
      <Readout caption="an index you can touch">
        {page.padStart(2, '0')}
      </Readout>
      <Rail
        label="Page"
        options={['1', '2', '3', '4', '5']}
        value={page}
        onChange={setPage}
      />
      <div className="obj-row centered">
        <Key
          label="Previous page"
          icon="left"
          onClick={() => setPage(String(Math.max(1, +page - 1)))}
        />
        <Key
          label="Next page"
          icon="right"
          onClick={() => setPage(String(Math.min(5, +page + 1)))}
        />
      </div>
    </div>
  );
}
const places = ['Home', 'Studio', 'Objects', 'Ceramic'];
export function Breadcrumbs() {
  const [depth, setDepth] = useState(3);
  return (
    <div className="obj-stack">
      <nav className="obj-breadcrumb" aria-label="Folder path">
        {places.slice(0, depth + 1).map((name, i) => (
          <span key={name}>
            <button
              type="button"
              aria-current={i === depth ? 'page' : undefined}
              onClick={() => setDepth(i)}
            >
              {name}
            </button>
            {i < depth && <Icon name="right" size={12} />}
          </span>
        ))}
      </nav>
      <Surface
        className="obj-big-folder"
        tone={depth % 2 ? 'sage' : 'lilac'}
        elevation={7}
      >
        <Icon name="folder" size={58} />
        <strong>{places[depth]}</strong>
      </Surface>
      <button
        type="button"
        className="obj-text-button"
        disabled={depth === 3}
        onClick={() => setDepth((d) => Math.min(3, d + 1))}
      >
        {depth < 3 ? `Open ${places[depth + 1]}` : 'You are here'}{' '}
        <Icon name="right" size={12} />
      </button>
    </div>
  );
}
export function FolderTree() {
  const [selected, setSelected] = useState('Clay');
  return (
    <div className="obj-stack">
      <div className="obj-tree">
        {['Studio', 'Archive'].map((folder, i) => (
          <details key={folder} open={i === 0 ? true : undefined}>
            <summary>
              <Icon name="folder" />
              {folder}
            </summary>
            {(i === 0 ? ['Clay', 'Light', 'Forms'] : ['2025', '2024']).map(
              (name) => (
                <button
                  type="button"
                  key={name}
                  aria-pressed={selected === name}
                  onClick={() => setSelected(name)}
                >
                  {selected === name && (
                    <Surface className="obj-row-plate" elevation={3} />
                  )}
                  <Icon name="file" size={15} />
                  {name}
                  <span>{selected === name ? '●' : '·'}</span>
                </button>
              ),
            )}
          </details>
        ))}
      </div>
      <span className="obj-caption" role="status">
        Selected / {selected}
      </span>
    </div>
  );
}
const commands = [
  ['New canvas', '⌘ N'],
  ['Open collection', '⌘ O'],
  ['Find an object', '⌘ K'],
  ['Arrange windows', '⌥ W'],
  ['Change material', '⌘ ,'],
];
export function CommandSearch() {
  const [query, setQuery] = useState(''),
    [chosen, setChosen] = useState('');
  const host = useRef<HTMLDivElement>(null);
  const filtered = commands.filter(([name]) =>
    name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="obj-stack" ref={host}>
      <Field label="COMMAND">
        <Icon name="search" size={16} />
        <input
          type="search"
          aria-label="Find command"
          placeholder="Where next?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              host.current
                ?.querySelector<HTMLButtonElement>('.obj-command-list button')
                ?.focus();
            }
          }}
        />
      </Field>
      <div className="obj-command-list">
        {filtered.map(([name, key], i) => (
          <button
            type="button"
            key={name}
            onClick={() => setChosen(name)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                host.current
                  ?.querySelectorAll<HTMLButtonElement>(
                    '.obj-command-list button',
                  )
                  [
                    (i + (e.key === 'ArrowDown' ? 1 : -1) + filtered.length) %
                      filtered.length
                  ]?.focus();
              }
            }}
          >
            <span>{name}</span>
            <kbd>{key}</kbd>
          </button>
        ))}
        {!filtered.length && <span>No commands found</span>}
      </div>
      <span className="obj-caption" role="status">
        {chosen ? `Preview / ${chosen}` : 'Type, then ↓ and Enter'}
      </span>
    </div>
  );
}
export function AppDock() {
  const [active, setActive] = useState('Notes');
  const apps = ['Notes', 'Calendar', 'Files', 'Settings'];
  return (
    <div className="obj-stack">
      <Plate className="obj-dock-window">
        <span className="obj-window-dots">● ● ●</span>
        <Icon
          name={
            (['file', 'calendar', 'folder', 'sliders'] as const)[
              apps.indexOf(active)
            ]
          }
          size={40}
        />
        <strong>{active}</strong>
      </Plate>
      <Surface elevation={-2} className="obj-app-dock">
        {apps.map((app, i) => (
          <Key
            key={app}
            label={`Open ${app}`}
            icon={(['file', 'calendar', 'folder', 'sliders'] as const)[i]}
            tone={app === active ? 'sage' : 'porcelain'}
            active={app === active}
            onClick={() => setActive(app)}
          />
        ))}
      </Surface>
    </div>
  );
}
