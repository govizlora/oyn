/** Renderer-internal, pure conversion to display/sRGB floats. No DOM or canvas. */
export function parseColor(input?: string): readonly [number, number, number, number] {
  if (input === undefined || input === 'transparent') return [0, 0, 0, 0];
  if (typeof input !== 'string') throw Error('Material color must be a single string.');
  const value = input.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const digits = hex[1].length === 3 ? [...hex[1]].map(c => c + c).join('') : hex[1];
    const channel = (i: number) => parseInt(digits.slice(i, i + 2), 16) / 255;
    return [channel(0), channel(2), channel(4), 1];
  }
  const rgb = /^rgb\(\s*([^()]*)\s*\)$/i.exec(value);
  if (rgb) {
    const components = rgb[1].trim().split(rgb[1].includes(',') ? /\s*,\s*/ : /\s+/);
    if (components.length === 3 && components.every(c => /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(c))) {
      const numbers = components.map(Number);
      if (numbers.every(n => Number.isFinite(n) && n >= 0 && n <= 255)) {
        return [numbers[0] / 255, numbers[1] / 255, numbers[2] / 255, 1];
      }
    }
  }
  throw new Error('Unsupported Surface color: ' + input + '. Use #RGB, #RRGGBB or rgb() with three numeric channels from 0 to 255; alpha and CSS variables are not supported.');
}
