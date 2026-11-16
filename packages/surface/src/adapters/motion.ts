/** Explicit structural adapter; no Motion runtime dependency in Surface. */
export interface MotionNumber {
  get(): number;
  on(event: 'change', listener: (value: number) => void): () => void;
}
/** Call in an effect and return the cleanup. The sink must have one owner. */
export function bindMotion(source: MotionNumber, write: (value: number) => void): () => void {
  write(source.get());
  return source.on('change', write);
}
