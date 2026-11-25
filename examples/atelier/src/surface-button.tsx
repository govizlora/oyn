import { useState } from 'react';
import { useMaterial } from 'oyn/react';
import { ceramic } from 'oyn/materials/ceramic';

// The entire subject: one native button, one ref, no synchronization helpers.
export function SurfaceButton() {
  const [pressed, setPressed] = useState(false);
  const ref = useMaterial({
    material: ceramic,
    props: { elevation: pressed ? 4 : 16, maxElevation: 16 },
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
