import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { ceramic } from '@oyn/material-ceramic';
import { useSurface } from '@oyn/surface';

export type Tone =
  'porcelain' | 'chalk' | 'orange' | 'ink' | 'sage' | 'yellow' | 'lilac';
export type SurfaceTone = Tone | `#${string}`;
export const ceramicColors: Record<Tone, string> = {
  porcelain: '#eeeee9',
  chalk: '#f4f4f0',
  orange: '#e95b2c',
  ink: '#303631',
  sage: '#aab8a3',
  yellow: '#e9cb69',
  lilac: '#b6b5c9',
};
export const css = (variables: Record<string, string | number>) =>
  variables as CSSProperties;

// All solid surfaces, including wells, share Ceramic. CSS paints only ink and
// layout, never a second approximation of a surface's bevel or shadow.
export function useCeramic<T extends HTMLElement>(
  tone: SurfaceTone,
  elevation: number,
  budget = Math.max(elevation, 0),
  rim = 3,
) {
  const material = useMemo(() => {
    const color = tone.startsWith('#')
      ? tone.toLowerCase()
      : ceramicColors[tone as Tone];
    const ink = color === ceramicColors.ink;
    return ceramic({
      color,
      elevation,
      maxElevation: budget,
      lightRim: ink ? 2 : rim,
      lightSurfaceTop: ink ? 0.04 : 0.16,
      lightEdgeShade: 0.04,
      shadowStrength: 0.13,
      contactShadowStrength: 0.03,
    });
  }, [tone, budget, rim]); // Live elevation has exactly one writer below.
  useLayoutEffect(
    () => material.setElevation(elevation),
    [material, elevation],
  );
  return useSurface<T>({ material });
}

export function Surface({
  tone = 'porcelain',
  elevation = 5,
  maxElevation,
  rim = 3,
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  tone?: SurfaceTone;
  elevation?: number;
  maxElevation?: number;
  rim?: number;
}) {
  const ref = useCeramic<HTMLDivElement>(
    tone,
    elevation,
    maxElevation ?? Math.max(0, elevation),
    rim,
  );
  return (
    <div ref={ref} className={`surface ${className}`} {...props}>
      {children}
    </div>
  );
}

export type Glyph =
  | 'play'
  | 'pause'
  | 'stop'
  | 'next'
  | 'sun'
  | 'wave'
  | 'grid'
  | 'circle'
  | 'power'
  | 'plus'
  | 'minus'
  | 'arrow'
  | 'loop'
  | 'shuffle'
  | 'volume'
  | 'moon'
  | 'diamond'
  | 'folder'
  | 'calendar'
  | 'sliders'
  | 'search'
  | 'bell'
  | 'check'
  | 'down'
  | 'left'
  | 'right'
  | 'file'
  | 'cloud'
  | 'mail'
  | 'columns'
  | 'list'
  | 'command'
  | 'lock'
  | 'wifi'
  | 'bluetooth'
  | 'star'
  | 'expand'
  | 'more';
export function Icon({ name, size = 20 }: { name: Glyph; size?: number }) {
  const paths: Record<Glyph, ReactNode> = {
    play: <path d="m9 5 11 7-11 7Z" fill="currentColor" stroke="none" />,
    pause: (
      <>
        <path d="M8 6v12M16 6v12" strokeWidth="3" />
      </>
    ),
    stop: (
      <rect
        x="7"
        y="7"
        width="10"
        height="10"
        rx="1"
        fill="currentColor"
        stroke="none"
      />
    ),
    next: (
      <>
        <path d="m6 6 9 6-9 6Z" fill="currentColor" stroke="none" />
        <path d="M18 6v12" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="3.5" />
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
      </>
    ),
    wave: <path d="M2 12c3-14 5 14 10 0s7 14 10 0" />,
    grid: (
      <>
        {[7, 17].flatMap((x) =>
          [7, 17].map((y) => (
            <rect
              key={`${x}-${y}`}
              x={x - 2}
              y={y - 2}
              width="4"
              height="4"
              rx=".5"
            />
          )),
        )}
      </>
    ),
    circle: <circle cx="12" cy="12" r="6" />,
    power: (
      <>
        <path d="M12 3v8M7 6a8 8 0 1 0 10 0" />
      </>
    ),
    plus: <path d="M5 12h14M12 5v14" />,
    minus: <path d="M5 12h14" />,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    loop: (
      <>
        <path d="M18 8H7a4 4 0 0 0 0 8h10a4 4 0 0 0 0-8M15 5l3 3-3 3" />
      </>
    ),
    shuffle: (
      <path d="M3 7h3c4 0 8 10 11 10h4m-4-3 3 3-3 3M3 17h3c2 0 4-3 5-5m3-4c1-1 2-1 3-1h4m-4-3 3 3-3 3" />
    ),
    volume: (
      <>
        <path d="M4 9h4l5-4v14l-5-4H4ZM17 8a6 6 0 0 1 0 8" />
      </>
    ),
    moon: <path d="M18 15A8 8 0 0 1 9 5a8 8 0 1 0 9 10Z" />,
    diamond: <path d="m12 4 8 8-8 8-8-8Z" />,
    folder: <path d="M3 7V5h7l2 3h9v11H3Z" />,
    calendar: (
      <>
        <rect x="4" y="5" width="16" height="16" rx="3" />
        <path d="M8 3v4m8-4v4M4 10h16m-12 4h2m4 0h2m-8 3h2" />
      </>
    ),
    sliders: (
      <>
        <path d="M6 3v6m0 4v8M12 3v11m0 4v3M18 3v3m0 4v11" />
        <path d="M3 9h6v4H3Zm6 5h6v4H9Zm6-8h6v4h-6Z" />
      </>
    ),
    search: (
      <>
        <circle cx="10" cy="10" r="6" />
        <path d="m15 15 5 5" />
      </>
    ),
    bell: (
      <>
        <path d="M5 17h14l-2-4V9a5 5 0 0 0-10 0v4ZM10 20h4" />
      </>
    ),
    check: <path d="m5 12 4 4 10-10" />,
    down: <path d="m7 9 5 5 5-5" />,
    left: <path d="m14 6-6 6 6 6" />,
    right: <path d="m10 6 6 6-6 6" />,
    file: (
      <>
        <path d="M5 3h9l5 5v13H5ZM14 3v6h5M8 13h8m-8 4h6" />
      </>
    ),
    cloud: <path d="M6 18a4 4 0 0 1-1-8 7 7 0 0 1 13-1 4.5 4.5 0 0 1 0 9Z" />,
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    columns: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M9 4v16m6-16v16" />
      </>
    ),
    list: <path d="M8 6h12M8 12h12M8 18h12M3 6h1m-1 6h1m-1 6h1" />,
    command: (
      <path d="M8 8h8v8H8Zm0 0H5a3 3 0 1 1 3-3Zm8 0V5a3 3 0 1 1 3 3Zm0 8h3a3 3 0 1 1-3 3Zm-8 0v3a3 3 0 1 1-3-3Z" />
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="3" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" />
      </>
    ),
    wifi: (
      <>
        <path d="M3 8a14 14 0 0 1 18 0M6 12a9 9 0 0 1 12 0m-9 4a4 4 0 0 1 6 0" />
        <circle cx="12" cy="20" r=".7" fill="currentColor" />
      </>
    ),
    bluetooth: <path d="M7 6l10 12-5 4V2l5 4L7 18" />,
    star: <path d="m12 3 3 6 6 1-4.5 4.5 1 6.5-5.5-3-5.5 3 1-6.5L3 10l6-1Z" />,
    expand: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />,
    more: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

export function Key({
  label,
  icon,
  tone = 'porcelain',
  active,
  onClick,
  className = '',
  children,
}: {
  label: string;
  icon?: Glyph;
  tone?: Tone;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
}) {
  const [pressed, setPressed] = useState(false);
  const ref = useCeramic<HTMLButtonElement>(tone, pressed ? 1 : 8, 8);
  return (
    <button
      type="button"
      ref={ref}
      className={`key ${className}`}
      data-tone={tone}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setPressed(true);
      }}
      onPointerUp={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onLostPointerCapture={() => setPressed(false)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') setPressed(true);
      }}
      onKeyUp={() => setPressed(false)}
      onBlur={() => setPressed(false)}
    >
      {icon && <Icon name={icon} />} {children}
    </button>
  );
}

export function Led({
  on = true,
  tone = 'orange',
}: {
  on?: boolean;
  tone?: string;
}) {
  return (
    <span aria-hidden="true" className="led" data-on={on} data-tone={tone} />
  );
}

export function Segments({
  label,
  icons,
  value,
  onChange,
  className = '',
}: {
  label: string;
  icons: Glyph[];
  value: number;
  onChange: (value: number) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <Surface
      elevation={-3}
      className={`segments ${className}`}
      role="radiogroup"
      aria-label={label}
      style={css({ '--count': icons.length, '--selected': value })}
    >
      <Surface className="segment-thumb" elevation={5} />
      {icons.map((icon, index) => (
        <label
          key={icon}
          className="segment-option"
          data-selected={value === index}
        >
          <input
            type="radio"
            name={id}
            aria-label={`${label}: ${icon}`}
            checked={value === index}
            onChange={() => onChange(index)}
          />
          <Icon name={icon} />
        </label>
      ))}
    </Surface>
  );
}

export function Switch({
  label,
  checked,
  onChange,
  className = '',
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  className?: string;
}) {
  return (
    <Surface elevation={-4} className={`switch ${className}`} data-on={checked}>
      <Led on={checked} />
      <Surface className="switch-thumb" elevation={6}>
        <span className="thumb-line" />
      </Surface>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        aria-label={label}
        onChange={(e) => onChange(e.target.checked)}
      />
    </Surface>
  );
}

export function Dial({
  label,
  value,
  onChange,
  tone = 'porcelain',
  className = '',
  ticks = true,
  inset = true,
  children,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  tone?: Tone;
  className?: string;
  ticks?: boolean;
  inset?: boolean;
  children?: ReactNode;
}) {
  const drag = useRef<{ y: number; value: number } | null>(null);
  const angle = -135 + value * 2.7;
  return (
    <div
      className={`dial ${className}`}
      style={css({ '--angle': `${angle}deg` })}
    >
      {ticks && (
        <svg className="dial-ticks" viewBox="0 0 200 200" aria-hidden="true">
          {Array.from({ length: 41 }, (_, i) => {
            const a = (((i / 40) * 270 - 225) * Math.PI) / 180;
            return (
              <line
                key={i}
                x1={100 + Math.cos(a) * (i % 5 === 0 ? 86 : 90)}
                y1={100 + Math.sin(a) * (i % 5 === 0 ? 86 : 90)}
                x2={100 + Math.cos(a) * 94}
                y2={100 + Math.sin(a) * 94}
                className={i / 40 <= value / 100 ? 'filled' : ''}
              />
            );
          })}
        </svg>
      )}
      <Surface className="dial-well" elevation={inset ? -2 : 1}>
        <Surface className="dial-face" tone={tone} elevation={12} rim={8}>
          <span className="dial-indicator">
            <i />
          </span>
          <span className="dial-center" />
          {children}
        </Surface>
      </Surface>
      <input
        type="range"
        aria-orientation="vertical"
        min="0"
        max="100"
        step="1"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.focus();
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { y: e.clientY, value };
        }}
        onPointerMove={(e) => {
          if (drag.current)
            onChange(
              Math.round(
                Math.max(
                  0,
                  Math.min(
                    100,
                    drag.current.value + (drag.current.y - e.clientY) * 0.65,
                  ),
                ),
              ),
            );
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onLostPointerCapture={() => {
          drag.current = null;
        }}
      />
    </div>
  );
}

export function Fader({
  label,
  value,
  onChange,
  vertical = false,
  tone = 'porcelain',
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  vertical?: boolean;
  tone?: Tone;
}) {
  return (
    <div
      className={`fader ${vertical ? 'fader-vertical' : ''}`}
      style={css({ '--value': value / 100 })}
    >
      <span className="fader-ticks" aria-hidden="true" />
      <Surface elevation={-5} className="fader-track">
        <span className="fader-fill" />
      </Surface>
      <div className="fader-travel">
        <Surface elevation={9} tone={tone} className="fader-thumb">
          <span />
          <span />
          <span />
        </Surface>
      </div>
      <input
        type="range"
        aria-orientation={vertical ? 'vertical' : 'horizontal'}
        min="0"
        max="100"
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function Speaker({
  className = '',
  round = false,
}: {
  className?: string;
  round?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={`speaker ${round ? 'speaker-round' : ''} ${className}`}
    />
  );
}
export function Screws() {
  return (
    <>
      {['tl', 'tr', 'bl', 'br'].map((position) => (
        <span
          aria-hidden="true"
          className={`screw screw-${position}`}
          key={position}
        />
      ))}
    </>
  );
}
export function Meter({
  value,
  columns = 14,
}: {
  value: number;
  columns?: number;
}) {
  return (
    <div className="meter" aria-hidden="true">
      {Array.from({ length: columns }, (_, i) => (
        <i key={i} data-lit={i / columns < value / 100} />
      ))}
    </div>
  );
}

export function InstrumentHeader({ children }: { children?: ReactNode }) {
  return (
    <div className="instrument-header">
      <span className="maker-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <div className="header-detail">
        {children ?? (
          <>
            <span className="serial-marks" />
            <Led />
          </>
        )}
      </div>
    </div>
  );
}
