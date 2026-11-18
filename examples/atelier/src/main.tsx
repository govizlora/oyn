import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SurfaceProvider } from '@oyn/surface';
import { QuietStudy } from './studies';
import { AirStudy, PlaygroundStudy } from './kinetic-studies';
import { ObjectLibrary, type LibraryLocation } from './library';
import { objects, rooms } from './library/registry';
import { ShadowLab } from './shadow-lab';
import { CardComparison } from './card-comparison';
import { SolidStudy } from './solid-study';
import { SculptedStudy } from './sculpted-study';
import './style.css';
import './desktop.css';
import './library/library.css';
import './kinetic.css';
import './sculpted.css';

const studies = [QuietStudy, AirStudy, PlaygroundStudy];
const names = [
  'Quiet · Porcelain',
  'Air · Kinetic objects',
  'Play · Tactile playground',
];
function readLocation() {
  const params = new URL(location.href).searchParams;
  const n = Number(params.get('study'));
  const requested = params.get('room') ?? 'controls';
  const object = objects.find((spec) => spec.id === params.get('object'));
  return {
    study: n >= 1 && n <= studies.length && Number.isInteger(n) ? n - 1 : 0,
    library: params.get('view') === 'library',
    exploration: params.get('view') === 'solids',
    comparison: params.get('view') === 'card-comparison',
    shadowLab: params.get('view') === 'shadow-lab',
    landing: !params.has('study') && params.get('view') !== 'library',
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
  const Study = studies[study];
  useEffect(() => {
    const pop = () => setRoute(readLocation());
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);
  useEffect(() => {
    document.title = route.shadowLab ? 'Oyn — Shadow lab' : route.library
      ? 'Oyn — Object library'
      : route.landing
        ? route.comparison
          ? 'Oyn — Ceramic card comparison'
          : route.exploration
            ? 'Oyn — Geometry lab'
            : 'Oyn — Sculpted ceramic'
        : `Oyn — ${names[study]}`;
  }, [
    study,
    route.library,
    route.landing,
    route.exploration,
    route.comparison,
    route.shadowLab,
  ]);
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
    if (value !== study || route.library || route.landing)
      visit({ study: String(value + 1) });
  };
  const library = ({ room, object }: LibraryLocation) =>
    visit({ view: 'library', room, ...(object ? { object } : {}) });
  return (
    <main
      aria-label="Oyn interactive material studies"
      className={`atelier ${route.library ? 'atelier-library' : ''} ${route.landing ? 'atelier-sculpture' : ''}`}
      data-study={study + 1}
    >
      {!route.library && !route.landing && (
        <>
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
      <SurfaceProvider>
        {(route.landing ? (
            route.shadowLab ? (<ShadowLab />) : route.comparison ? (
              <CardComparison home={() => visit({ view: 'solids' })} />
            ) : route.exploration ? (
              <SolidStudy
                home={() => visit({})}
                compare={() => visit({ view: 'card-comparison' })}
              />
            ) : (
              <SculptedStudy
                exploration={() => visit({ view: 'solids' })}
                explore={() => library({ room: 'hardware' })}
                studies={() => select(0)}
              />
            )
          ) : route.library ? (
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
      {!route.library && !route.landing && (
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
          <button
            type="button"
            className="study-option library-option"
            aria-label="Object library"
            title="Object library"
            onClick={() => library({ room: 'hardware' })}
          >
            <svg viewBox="0 0 28 20" aria-hidden="true">
              <path d="M5 4h18v12H5Zm0 4h18m-14 4h3m4 0h3" />
            </svg>
          </button>
        </nav>
      )}
    </main>
  );
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
