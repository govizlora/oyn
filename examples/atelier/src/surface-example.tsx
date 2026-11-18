import { StrictMode, useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { SurfaceProvider } from '@oyn/surface';
import { SurfaceButton } from './surface-button';
import './surface-example.css';
import { bindSurfaceDomControls } from './surface-dom-controls';

function Example() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => bindSurfaceDomControls(root.current!), []);
  const [mounted, setMounted] = useState(true);
  const [dark, setDark] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [error, setError] = useState('');

  return (
    <main ref={root} className={dark ? 'example dark' : 'example'}>
      <header>
        <a href="/">Atelier</a>
        <h1>One native button.</h1>
        <p>
          No component library. No animation library. No extra synchronization
          listeners.
        </p>
      </header>
      <section aria-label="Native DOM experiments">
        <h2>Native DOM — no React updates</h2>
        <p>
          Changes run one second later. Keep the pointer still before and after
          they happen.
        </p>
        <div className="controls">
          <label>
            <input id="delay-dom" type="checkbox" defaultChecked />
            Delay DOM changes by 1 second
          </label>
          <label>
            Width{' '}
            <input
              aria-label="Button width"
              data-dom="width"
              type="range"
              min="35"
              max="90"
              defaultValue="70"
            />
          </label>
          <label>
            Height{' '}
            <input
              aria-label="Button height"
              data-dom="height"
              type="range"
              min="100"
              max="280"
              defaultValue="180"
            />
          </label>
          <label>
            <input type="checkbox" data-dom="rounded" />
            Rounded class
          </label>
          <label>
            <input type="checkbox" data-dom="hidden" />
            Hidden ancestor
          </label>
          <label>
            <input type="checkbox" data-dom="shifted" />
            CSS transition
          </label>
          <label>
            <input type="checkbox" data-dom="animated" />
            CSS animation
          </label>
        </div>
      </section>
      <section aria-label="Pure CSS experiments">
        <h2>Pure CSS — no DOM attribute changes</h2>
        <p>
          Keyboard-toggle these controls after parking the pointer over the
          button. They use :has(:checked), not event handlers. The dotted
          outline shows the actual CSS radius.
        </p>
        <div className="controls">
          <label>
            <input id="css-radius" type="checkbox" />
            CSS-only radius
          </label>
          <label>
            <input id="css-space" type="checkbox" />
            CSS-only space above
          </label>
        </div>
      </section>
      <section className="controls" aria-label="React lifecycle">
        <label>
          <input
            type="checkbox"
            checked={mounted}
            onChange={(e) => setMounted(e.target.checked)}
          />
          Button mounted
        </label>
        <label>
          <input
            type="checkbox"
            checked={dark}
            onChange={(e) => setDark(e.target.checked)}
          />
          Dark theme
        </label>
        <button type="button" onClick={() => setGeneration((n) => n + 1)}>
          Replace button
        </button>
      </section>
      <details className="layout-change">
        <summary>Expand content above the button</summary>
        <p>
          This native details element moves the button without changing its own
          size. No React handler is involved.
        </p>
      </details>
      {error && <p role="alert">{error}</p>}
      <p>
        Scroll this page, resize the window, or scroll / drag the bottom-right
        corner of the dashed container.
      </p>
      <SurfaceProvider
        onError={(error) => setError(String(error))}
      >
        <div className="scroll-box" aria-label="Resizable scroll container">
          <div className="scroll-content">
            <p className="scroll-hint">Scroll down to the button ↓</p>
            <div className="button-host">
              {mounted && <SurfaceButton key={generation} mode={dark ? 'dark' : 'light'} />}
            </div>
            <p className="scroll-hint">More native scroll space ↓</p>
          </div>
        </div>
      </SurfaceProvider>
      <section className="notes">
        <h2>What to watch</h2>
        <ul>
          <li>
            The dotted outline is the native button border box. The material
            should stay aligned; its shadow extends outside.
          </li>
          <li>
            Window resize, container resize, and sliders: the surface follows
            the button dimensions.
          </li>
          <li>
            Page / nested scrolling and expanding content: keep the pointer
            still. Only move it afterward as a separate recovery check.
          </li>
          <li>
            Rounded class and hidden ancestor: radius and visibility follow DOM
            changes.
          </li>
          <li>
            Disable / enable preserves the native button and its pressed state.
            Unmount / replace resets that state and recreates the binding.
          </li>
          <li>
            CSS transition / animation: inspect during motion and at the final
            position without moving the pointer. Continuous transform tracking
            is not guaranteed; alignment during motion alone does not prove GPU
            measurements are current.
          </li>
          <li>
            Move the pointer, leave the page, or switch tabs. Ceramic currently
            holds the last light position by default.
          </li>
          <li>
            Browser zoom or moving between displays tests DPR changes. Inspect
            canvas pixel dimensions separately from its CSS dimensions.
          </li>
        </ul>
        <p>
          The native input handler only mutates the test DOM. This page has no
          measurement loop, event logger, redraw request, or observer. Native
          canvas placement can follow DOM layout without a redraw. Use
          breakpoints in Surface to determine which notifications actually fire;
          passing this demo alone does not prove every listener is necessary.
        </p>
        <p>
          StrictMode is enabled. GPU errors appear above rather than falling
          back to a different renderer.
        </p>
      </section>
      <footer>Extra document space for window scrolling.</footer>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Example />
  </StrictMode>,
);
