import { useState } from "react";
import { Button } from "@/components/ui/oyn/button";

export function ButtonDemo() {
  const [pinned, setPinned] = useState(false);
  return (
    <>
      <Button aria-pressed={pinned} onClick={() => setPinned(!pinned)}>
        Pin surface
      </Button>
      <Button
        variant="secondary"
        disabled={!pinned}
        onClick={() => setPinned(false)}
      >
        Reset
      </Button>
      <Button variant="ghost" render={<a href="#installation" />}>
        Installation
      </Button>
    </>
  );
}
