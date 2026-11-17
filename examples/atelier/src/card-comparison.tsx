import { useLayoutEffect, useMemo, useState } from 'react';
import { createCeramicMaterial } from '@oyn/ceramic';
import { cardCeramic } from '@oyn/ceramic/card';
import { materialAppearance, useSurface } from '@oyn/surface';
import './card-comparison.css';
const WIDTH = 280,
  HEIGHT = 160;
export function CardComparison({ home }: { home: () => void }) {
  const [renderer, setRenderer] = useState<'original' | 'geometry'>('original');
  const [elevation, setElevation] = useState(16),
    [radius, setRadius] = useState(24);
  const original = useMemo(
    () =>
      createCeramicMaterial({
        mode: 'light',
        color: '#f0f0f0',
        elevation: 16,
        maxElevation: 40,
      }),
    [],
  );
  const geometric = useMemo(
    () =>
      cardCeramic({width:WIDTH,height:HEIGHT,radius:24,elevation:16,maxElevation:40,finish:{mode:'light',color:'#f0f0f0'}}),
    [],
  );
  useLayoutEffect(() => {
    original.setElevation(elevation);
    geometric.setDimensions(radius, elevation);
  }, [original, geometric, elevation, radius]);
  const ref = useSurface({
    appearance: materialAppearance, props: { material: renderer === 'original' ? original : geometric },
  });
  return (
    <section className="sculpture-page comparison-page">
      <header className="sculpture-heading">
        <div>
          <a href="./" className="sculpture-logo">
            oyn
          </a>
          <span>CERAMIC / A–B COMPARISON</span>
        </div>
        <button onClick={home}>Back to Geometry Lab ↗</button>
      </header>
      <div className="sculpture-title">
        <h1>
          The same card. <em>Two renderers.</em>
        </h1>
        <p>
          Same footprint, color, elevation and cursor.
          <br />
          Shared original lighting. Separate geometry inputs.
        </p>
      </div>
      <div
        className="comparison-switch"
        role="group"
        aria-label="Card renderer"
      >
        <button
          aria-pressed={renderer === 'original'}
          onClick={() => setRenderer('original')}
        >
          1 / Original Ceramic
        </button>
        <button
          aria-pressed={renderer === 'geometry'}
          onClick={() => setRenderer('geometry')}
        >
          2 / Geometry renderer
        </button>
      </div>
      <div
        className="comparison-stage"
        tabIndex={0}
        aria-label="Card comparison. Press 1 for original, 2 for geometry renderer."
        onKeyDown={(e) => {
          if (e.key === '1') setRenderer('original');
          if (e.key === '2') setRenderer('geometry');
        }}
      >
        <div
          className="comparison-card"
          ref={ref}
          style={{ borderRadius: `${radius}px` }}
        />
        <span className="comparison-renderer" aria-live="polite">
          {renderer === 'original' ? 'ORIGINAL CERAMIC' : 'GEOMETRY RENDERER'}
        </span>
      </div>
      <div className="comparison-settings">
        <label>
          Elevation{' '}
          <input
            aria-label="Card elevation"
            type="range"
            min="8"
            max="40"
            value={elevation}
            onChange={(e) => setElevation(+e.target.value)}
          />
          <output>{elevation}px</output>
        </label>
        <label>
          Corner radius{' '}
          <input
            aria-label="Card corner radius"
            type="range"
            min="0"
            max="64"
            value={radius}
            onChange={(e) => setRadius(+e.target.value)}
          />
          <output>{radius}px</output>
        </label>
      </div>
      <p className="comparison-help">
        Click the empty comparison area, keep your cursor still, then press{' '}
        <kbd>1</kbd> / <kbd>2</kbd> to compare at exactly the same light
        position.
      </p>
      <div className="comparison-notes">
        <p>
          <b>Original</b>Original Ceramic defaults. Its calibrated face
          treatment and Gaussian silhouette shadow are the reference.
        </p>
        <p>
          <b>Geometry</b>An explicit rounded-card geometry adapter supplies
          normals, rim coverage and silhouette coverage to the same original
          lighting and shadow equations. Pixel-identical in the automated card
          comparisons.
        </p>
      </div>
    </section>
  );
}
