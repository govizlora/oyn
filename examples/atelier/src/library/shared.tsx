import { useId, type ReactNode } from 'react';
import { ceramicColors, Fader, Surface, type Tone } from '../controls';

export function Rail<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  const name = useId();
  return (
    <Surface
      className="obj-rail"
      elevation={-2}
      role="radiogroup"
      aria-label={label}
    >
      {options.map((option) => (
        <label key={option} data-active={value === option}>
          {value === option && (
            <Surface className="obj-rail-thumb" elevation={4} />
          )}
          <input
            type="radio"
            name={name}
            aria-label={`${label}: ${option}`}
            checked={value === option}
            onChange={() => onChange(option)}
          />
          <span>{option}</span>
        </label>
      ))}
    </Surface>
  );
}
export function Range({
  label,
  value,
  onChange,
  unit = '',
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
}) {
  return (
    <div className="obj-range">
      <div>
        <span>{label}</span>
        <output>
          {value}
          {unit}
        </output>
      </div>
      <Fader label={label} value={value} onChange={onChange} />
    </div>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="obj-field">
      <span>{label}</span>
      <Surface elevation={-2} className="obj-input">
        {children}
      </Surface>
    </label>
  );
}
export function Plate({
  children,
  tone = 'chalk',
  className = '',
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <Surface className={`obj-plate ${className}`} elevation={4} tone={tone}>
      {children}
    </Surface>
  );
}
export function Readout({
  children,
  caption,
}: {
  children: ReactNode;
  caption?: string;
}) {
  return (
    <div className="obj-readout">
      <output>{children}</output>
      {caption && <span>{caption}</span>}
    </div>
  );
}
export const palette = [
  'porcelain',
  'sage',
  'lilac',
  'yellow',
  'orange',
  'ink',
] as const;
export const hexes = palette.map((tone) => ceramicColors[tone]);
