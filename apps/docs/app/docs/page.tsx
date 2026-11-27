import { pageMeta } from "../../meta";
export const metadata = pageMeta(
  "Getting started · OYN Docs",
  "Apply a WebGPU material to a native HTML control with React.",
  "/docs/",
);
export default function Docs() {
  return (
    <main className="article">
      <h1>Getting started</h1>
      <p>
        OYN gives native HTML elements surfaces that respond to light and
        motion. Your app owns layout, keyboard interaction and animation.
      </p>
      <h2>Set up React</h2>
      <p>
        From the OYN repository, run <code>npm install</code> and{" "}
        <code>npm run build</code> to build the local packages. Wrap your
        controls in one <code>OynProvider</code>.
      </p>
      <pre>
        <code>{`"use client";
import { OynProvider, ceramic, useMaterial } from "@oyn/react";

function Surface() {
  const ref = useMaterial({ material: ceramic, props: { elevation: 8 } });
  return <button type="button" ref={ref}>Preview</button>;
}

export function App() {
  return <OynProvider><Surface /></OynProvider>;
}`}</code>
      </pre>
      <h2>Choose a surface</h2>
      <p>
        Bind a material to a host that can contain a canvas. Give the host its
        size and focus style in CSS. If WebGPU is unavailable, the control keeps
        its native appearance and behavior.
      </p>
      <a href="/docs/components/">Explore components →</a>
    </main>
  );
}
