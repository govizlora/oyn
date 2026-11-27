import { HighlightedCode } from "../../highlighted-code";
import { RecessedCode } from "../../code-block";
import { Article } from "../../article";
import { pageMeta } from "../../meta";
export const metadata = pageMeta(
  "Getting started · OYN Docs",
  "Apply a WebGPU material to a native HTML control with React.",
  "/docs/",
);
export default function Docs() {
  return (
    <Article>
      <h1>Getting started</h1>
      <p>
        OYN gives native HTML elements surfaces that respond to light and
        motion. Your app owns layout, keyboard interaction and animation.
      </p>
      <p>
        Run <code>npm install</code> and <code>npm run build</code> in the OYN
        repository. Wrap your controls in one <code>OynProvider</code>, then
        attach a material to an element that can contain a canvas.
      </p>
      <RecessedCode>
        <HighlightedCode lang="tsx">{`"use client";
import { OynProvider, ceramic, useMaterial } from "@oyn/react";

function Surface() {
  const ref = useMaterial({ material: ceramic, props: { elevation: 8 } });
  return <button type="button" ref={ref}>Preview</button>;
}

export function App() {
  return <OynProvider><Surface /></OynProvider>;
}`}</HighlightedCode>
      </RecessedCode>
      <p className="flex flex-wrap gap-x-5 gap-y-2 pt-4">
        <a href="/docs/components/">Explore components →</a>
        <a href="/about/">About OYN</a>
      </p>
    </Article>
  );
}
