// Distances are expressed in lattice pitches, independent of screen size.
const rowPitch = Math.sqrt(3) / 2;
const columns = 8, rows = 5;
export const lattice = { width: columns, height: 1 + (rows - 1) * rowPitch };
// A rectangular panel cut from a triangular lattice, with equal end margins.
export const stones = Array.from({ length: rows }, (_, row) => {
  const inset = row % 2;
  return Array.from({ length: columns - inset }, (_, col) => ({
    x: 0.5 + inset / 2 + col,
    y: 0.5 + row * rowPitch,
    row,
    col,
  }));
}).flat();

type Motion = { interval: number; duration: number; damping: number };
type Pulse = Motion & { arrivals: number[]; end: number };
export type Field = { restingTurns: number; pulses: Pulse[] };
export const atRest: Field = { restingTurns: 1, pulses: [] };

export function strike(
  field: Field,
  origin: number,
  motion: Motion,
  now: number,
): Field {
  const { x, y } = stones[origin];
  const arrivals = stones.map(
    (p) => now + Math.hypot(p.x - x, p.y - y) * motion.interval,
  );
  const pulses = field.pulses.filter((p) => p.end > now);
  // Collapse only completed turns. Pending or travelling waves are never
  // cancelled by another click, even when their wavefronts cross.
  const restingTurns =
    (field.restingTurns + field.pulses.length - pulses.length) % 2;
  pulses.push({
    ...motion,
    arrivals,
    end: Math.max(...arrivals) + motion.duration,
  });
  return { restingTurns, pulses };
}
export function sample(field: Field, i: number, now: number, reduced: boolean) {
  let turns = field.restingTurns,
    active = false;
  for (const pulse of field.pulses) {
    const elapsed = now - pulse.arrivals[i];
    if (elapsed < 0) {
      active = true;
      continue;
    }
    if (reduced || elapsed >= pulse.duration) {
      turns++;
      continue;
    }
    active = true;
    // Underdamped torsional spring around the next detent. Time is scaled by
    // the requested settling duration. x(0)=0, x'(0)=6: release with a kick.
    // At t=1 the remaining envelope is < 0.04% of a half-turn.
    const t = elapsed / pulse.duration;
    const frequency = (8 * Math.sqrt(1 - pulse.damping ** 2)) / pulse.damping;
    turns +=
      1 -
      Math.exp(-8 * t) *
        (Math.cos(frequency * t) + (2 / frequency) * Math.sin(frequency * t));
  }
  return { angle: Math.PI * (turns % 2), active };
}
