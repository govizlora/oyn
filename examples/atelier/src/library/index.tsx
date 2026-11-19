import { useEffect, useRef, useState } from 'react';
import { Icon, Surface } from '../controls';
import { objects, rooms } from './registry';

const storageKey = 'oyn.object-library.picks.v1';
function loadPicks(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    return Array.isArray(value)
      ? [
          ...new Set(
            value.filter(
              (id): id is string =>
                typeof id === 'string' &&
                objects.some((object) => object.id === id),
            ),
          ),
        ]
      : [];
  } catch {
    return [];
  }
}
export type LibraryLocation = { room: string; object?: string };
export function ObjectLibrary({
  room,
  object,
  navigate,
}: LibraryLocation & {
  navigate: (next: LibraryLocation) => void;
}) {
  const search = useRef<HTMLInputElement>(null);
  const [storageAvailable, setStorageAvailable] = useState(true);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (
        event.key !== '/' ||
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        (event.target instanceof Element &&
          event.target.closest('input, textarea, [contenteditable=true]'))
      )
        return;
      event.preventDefault();
      search.current?.focus();
    };
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, []);
  const [picks, setPicks] = useState(loadPicks),
    [query, setQuery] = useState(''),
    [page, setPage] = useState(0),
    [notice, setNotice] = useState('');
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(picks));
    } catch {
      setStorageAvailable(false);
      setNotice(
        'Selection is kept for this visit only. Browser storage is unavailable.',
      );
    }
  }, [picks]);
  const selectedObject = objects.find((spec) => spec.id === object);
  const filtered = selectedObject
    ? [selectedObject]
    : objects.filter(
        (spec) =>
          (room === 'all' ||
            (query.trim() !== '' && room !== 'picked') ||
            (room === 'picked'
              ? picks.includes(spec.id)
              : spec.room === room)) &&
          `${spec.name} ${spec.tags} ${spec.id}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      );
  const pages = Math.max(1, Math.ceil(filtered.length / 6)),
    currentPage = Math.min(page, pages - 1);
  const visible = filtered.slice(currentPage * 6, currentPage * 6 + 6);
  const currentRoom = rooms.find((r) => r.id === room);
  const pick = (id: string) => {
    setPicks((old) =>
      old.includes(id) ? old.filter((n) => n !== id) : [...old, id],
    );
    if (room === 'picked') setPage(0);
  };
  const exportPicks = () => {
    const manifest = {
      version: 1,
      title: 'Oyn · selected objects',
      objects: picks.map((id) => {
        const spec = objects.find((s) => s.id === id)!;
        return {
          id: spec.id,
          name: spec.name,
          room: spec.room,
          source: spec.source,
          export: spec.exportName,
        };
      }),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(manifest, null, 2) + '\n'], {
        type: 'application/json',
      }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'oyn-selected-objects.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(
      `Exported ${picks.length} object references. Preview values are not included.`,
    );
  };
  return (
    <div className="library-shell">
      <header className="library-header">
        <div className="library-brand">
          <span className="library-mark">
            <i />
            <i />
          </span>
          <span>
            OYN <b>/</b> OBJECT LIBRARY
          </span>
        </div>
        <div className="library-tools">
          <button
            type="button"
            onClick={() => navigate({ room: 'picked' })}
            className="library-picks"
            aria-pressed={room === 'picked'}
          >
            <Icon name="star" size={15} />
            <span>Picked</span>
            <b>{String(picks.length).padStart(2, '0')}</b>
          </button>
          <button
            type="button"
            className="library-export"
            disabled={!picks.length}
            onClick={exportPicks}
          >
            Export selection <Icon name="arrow" size={14} />
          </button>
        </div>
      </header>
      <div className="library-heading">
        <div>
          <span className="library-eyebrow">
            CERAMIC / MATERIAL EXPLORATIONS
          </span>
          <h1>
            {selectedObject
              ? selectedObject.name
              : room === 'picked'
                ? 'Your collection.'
                : room === 'all'
                  ? 'A cabinet of possibilities.'
                  : (currentRoom?.subtitle ?? 'A cabinet of possibilities.')}
          </h1>
        </div>
        <div className="library-edition">
          <strong>
            {String(
              selectedObject ? selectedObject.number : objects.length,
            ).padStart(2, '0')}
          </strong>
          <span>
            {selectedObject ? 'OBJECT' : 'OBJECTS'}
            <br />
            LIGHT / 01
          </span>
        </div>
      </div>
      <div className="library-browser">
        <nav className="library-rooms" aria-label="Object rooms">
          {rooms.map((r) => (
            <button
              type="button"
              key={r.id}
              aria-current={
                r.id === room && !selectedObject ? 'page' : undefined
              }
              onClick={() => navigate({ room: r.id })}
            >
              <Icon name={r.icon} size={16} />
              <span>{r.name}</span>
              <small>
                {String(
                  objects.filter((spec) => spec.room === r.id).length,
                ).padStart(2, '0')}
              </small>
            </button>
          ))}
          <button
            type="button"
            aria-current={
              room === 'all' && !selectedObject ? 'page' : undefined
            }
            onClick={() => navigate({ room: 'all' })}
          >
            <Icon name="more" size={16} />
            <span>All objects</span>
            <small>{objects.length}</small>
          </button>
        </nav>
        <label className="library-search">
          <Icon name="search" size={16} />
          <input
            type="search"
            placeholder="Find an object"
            ref={search}
            aria-label="Search object library"
            value={query}
            disabled={!!selectedObject}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
          <kbd>/</kbd>
        </label>
      </div>
      <div className="library-section-heading">
        <span>
          {selectedObject ? (
            <button
              type="button"
              onClick={() => navigate({ room: selectedObject.room })}
            >
              ← Back to {rooms.find((r) => r.id === selectedObject.room)?.name}
            </button>
          ) : room === 'picked' ? (
            'PICKED FOR YOUR NEXT COMPOSITION'
          ) : (
            `${query ? 'SEARCH' : (currentRoom?.name.toUpperCase() ?? 'ALL')} / ${filtered.length} OBJECTS`
          )}
        </span>
        <span>Click the star to keep an object</span>
      </div>
      <div className={`library-grid ${selectedObject ? 'is-isolated' : ''}`}>
        {visible.map((spec) => {
          const Demo = spec.component;
          return (
            <article
              key={spec.id}
              className="library-specimen"
              aria-labelledby={`object-${spec.id}`}
              data-object={spec.id}
              data-layout={spec.layout}
            >
              <Surface elevation={3} tone="chalk" className="specimen-plate">
                <header className="specimen-header">
                  <span className="specimen-number">
                    {String(spec.number).padStart(2, '0')}
                  </span>
                  <h2 id={`object-${spec.id}`}>{spec.name}</h2>
                  <button
                    type="button"
                    className="specimen-pick"
                    aria-label={`${picks.includes(spec.id) ? 'Unpick' : 'Pick'} ${spec.name}`}
                    aria-pressed={picks.includes(spec.id)}
                    onClick={() => pick(spec.id)}
                  >
                    <Icon name="star" size={16} />
                  </button>
                </header>
                <div className="specimen-stage">
                  <div
                    className={`${spec.layout === 'composition' ? 'composition-demo' : 'object-demo'} demo-${spec.id}`}
                  >
                    <Demo />
                  </div>
                </div>
                <footer className="specimen-footer">
                  <span>{spec.id.toUpperCase()}</span>
                  {!selectedObject && (
                    <button
                      type="button"
                      aria-label={`Inspect ${spec.name}`}
                      onClick={() =>
                        navigate({ room: spec.room, object: spec.id })
                      }
                    >
                      <Icon name="expand" size={14} />
                    </button>
                  )}
                  {selectedObject && <span>HTML → SURFACE</span>}
                </footer>
              </Surface>
            </article>
          );
        })}
      </div>
      {!filtered.length && (
        <div className="library-empty">
          <Icon name={room === 'picked' ? 'star' : 'search'} size={32} />
          <p>
            {room === 'picked'
              ? 'Keep a few things that make you smile.'
              : 'No objects found.'}
          </p>
          <button
            type="button"
            onClick={() =>
              query ? (setQuery(''), setPage(0)) : navigate({ room: 'all' })
            }
          >
            {query ? 'Clear search' : 'Explore all objects'}
          </button>
        </div>
      )}
      <footer className="library-footer">
        <span>
          HTML FIRST. MATERIAL SECOND. <i /> LOCAL INTERACTIVE STUDIES.
        </span>
        {pages > 1 && (
          <nav aria-label="Library pages">
            <button
              type="button"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
              aria-label="Previous library page"
            >
              <Icon name="left" size={16} />
            </button>
            <span>
              {currentPage + 1} / {pages}
            </span>
            <button
              type="button"
              disabled={currentPage === pages - 1}
              onClick={() => setPage(currentPage + 1)}
              aria-label="Next library page"
            >
              <Icon name="right" size={16} />
            </button>
          </nav>
        )}
        <span>
          {picks.length} picked /{' '}
          {storageAvailable ? 'saved in this browser' : 'this visit only'}
        </span>
      </footer>
      <p className="library-notice" role="status">
        {notice}
      </p>
    </div>
  );
}
