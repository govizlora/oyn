import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SurfaceProvider } from '@oyn/surface';
import { QuietStudy, SignalStudy, PlayStudy } from './studies';
import './style.css';

const studies = [QuietStudy, SignalStudy, PlayStudy];
const names = [
  'Quiet · Porcelain',
  'Signal · Soft machine',
  'Play · Future instrument',
];
function readStudy() {
  const n = Number(new URL(location.href).searchParams.get('study'));
  return n >= 1 && n <= 3 && Number.isInteger(n) ? n - 1 : 0;
}
function App() {
  const [study, setStudy] = useState(readStudy);
  const [error, setError] = useState(false);
  const Study = studies[study];
  useEffect(() => {
    const pop = () => setStudy(readStudy());
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);
  useEffect(() => {
    document.title = `Oyn — ${names[study]}`;
  }, [study]);
  const select = (value: number) => {
    if (value === study) return;
    const url = new URL(location.href);
    url.searchParams.set('study', String(value + 1));
    history.pushState({}, '', url);
    setStudy(value);
  };
  return (
    <main
      aria-label="Interactive Ceramic studies"
      className="atelier"
      data-study={study + 1}
    >
      <div className="corner-mark" aria-hidden="true">
        <span />
        <span />
      </div>
      <div className="ambient-index" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} data-active={i === study} />
        ))}
      </div>
      <div className="composition">
        <SurfaceProvider
          mode="light"
          onError={(reason) => {
            console.error(reason);
            setError(true);
          }}
        >
          {!error && <Study key={study} />}
        </SurfaceProvider>
      </div>
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
