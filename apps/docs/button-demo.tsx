"use client";
import { useState } from "react";
import { Button } from "./controls/button";
export function ButtonDemo() {
  const [pressed, setPressed] = useState(false);
  return (
    <Button aria-pressed={pressed} onClick={() => setPressed(!pressed)}>
      Pin surface
    </Button>
  );
}
