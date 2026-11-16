import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SurfaceProvider } from '@oyn/surface';
import { QuietStudy } from './studies';
import { FocusStudy, PlayStudy } from './desktop';
import { ObjectLibrary, type LibraryLocation } from './library';
import { objects, rooms } from './library/registry';
import './style.css';
import './desktop.css';
import './library/library.css';

const studies = [QuietStudy, FocusStudy, PlayStudy];
const names = [
  'Quiet · Porcelain',
  'Focus · Daily objects',
  'Play · Everyday desktop',
];
function readLocation() {
  const params = new URL(location.href).searchParams;
  const n = Number(params.get('study'));
  const requested = params.get('room') ?? 'controls';
  const object = objects.find((spec) => spec.id === params.get('object'));
  return {
    study: n >= 1 && n <= studies.length && Number.isInteger(n) ? n - 1 : 0,
    library: params.get('view') === 'library',
    room:
      object?.room ??
      (rooms.some((room) => room.id === requested) ||
      ['all', 'picked'].includes(requested)
        ? requested
        : 'controls'),
    object: object?.id,
  };
}
function App() {
  const [route, setRoute] = useState(readLocation);
  const study = route.study;
  const [error, setError] = useState(false);
  const Study = studies[study];
  useEffect(() => {
    const pop = () => setRoute(readLocation());
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);
  useEffect(() => {
    document.title = route.library
      ? 'Oyn — Object library'
      : `Oyn — ${names[study]}`;
  }, [study, route.library]);
  const visit = (params: Record<string, string>) => {
    const url = new URL(location.href);
    for (const key of ['study', 'view', 'room', 'object'])
      url.searchParams.delete(key);
    for (const [key, value] of Object.entries(params))
      url.searchParams.set(key, value);
    history.pushState({}, '', url);
    setRoute(readLocation());
    window.scrollTo(0, 0);
  };
  const select = (value: number) => {
    if (value !== study || route.library) visit({ study: String(value + 1) });
  };
  const library = ({ room, object }: LibraryLocation) =>
    visit({ view: 'library', room, ...(object ? { object } : {}) });
  return (
    <main
      aria-label="Interactive Ceramic studies"
      className={`atelier ${route.library ? 'atelier-library' : ''}`}
      data-study={study + 1}
    >
      {!route.library && (
        <>
          <button
            type="button"
            className="library-entry"
            onClick={() => library({ room: 'controls' })}
          >
            Object library <span>{objects.length} ↗</span>
          </button>
          <div className="corner-mark" aria-hidden="true">
            <span />
            <span />
          </div>
          <div className="ambient-index" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span key={i} data-active={i === study} />
            ))}
          </div>
        </>
      )}
      <SurfaceProvider
        mode="light"
        onError={(reason) => {
          console.error(reason);
          setError(true);
        }}
      >
        {!error &&
          (route.library ? (
            <ObjectLibrary
              key={`library:${route.room}:${route.object ?? ''}`}
              room={route.room}
              object={route.object}
              navigate={library}
              home={() => select(0)}
            />
          ) : (
            <div className="composition">
              <Study key={study} />
            </div>
          ))}
      </SurfaceProvider>
      {!route.library && (
        <nav className="study-selector" aria-label="Ceramic studies">
          <div role="radiogroup" aria-label="Select a study">
            {names.map((name, i) => (
              <label
                key={name}
                className="study-option"
                data-active={study === i}
              >
                <input
                  type="radio"
                  name="study"
                  checked={study === i}
                  aria-label={name}
                  onChange={() => select(i)}
                />
                <svg viewBox="0 0 28 20" aria-hidden="true">
                  {i === 0 ? (
                    <>
                      <circle cx="8" cy="10" r="3" />
                      <circle cx="20" cy="10" r="3" />
                    </>
                  ) : i === 1 ? (
                    <>
                      <circle cx="8" cy="10" r="5" />
                      <path d="M18 6h7m-7 4h7m-7 4h7" />
                    </>
                  ) : (
                    <>
                      {[5, 14, 23].flatMap((x) =>
                        [6, 14].map((y) => (
                          <rect
                            key={`${x}-${y}`}
                            x={x - 2}
                            y={y - 2}
                            width="4"
                            height="4"
                            rx="1"
                          />
                        )),
                      )}
                    </>
                  )}
                </svg>
              </label>
            ))}
          </div>
        </nav>
      )}
      {error && (
        <p className="unsupported" role="alert">
          This study needs WebGPU. Open it in a browser with WebGPU enabled.
        </p>
      )}
    </main>
  );
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
