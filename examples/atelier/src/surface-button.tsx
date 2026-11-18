import { useState } from 'react';
import { useSurface } from '@oyn/surface';
import { ceramic } from '@oyn/ceramic';

// The entire subject: one native button, one ref, no synchronization helpers.
export function SurfaceButton({ mode }: { mode: 'light' | 'dark' }) {
  const [pressed, setPressed] = useState(false);
  const ref = useSurface({
    appearance: ceramic,
    props: { mode, elevation: pressed ? 4 : 16, maxElevation: 16 },
  });

  return (
    <button
      ref={ref}
      type="button"
      className="surface-button"
      aria-pressed={pressed}
      onClick={() => setPressed(!pressed)}
    >
      Native button
      <small>
        {pressed
          ? 'Pressed · elevation 4'
          : 'Click or press Space · elevation 16'}
      </small>
    </button>
  );
}
