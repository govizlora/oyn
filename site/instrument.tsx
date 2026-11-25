import React from "react";
import { createRoot } from "react-dom/client";
import { SurfaceProvider } from "@oyn/surface";
import { useCeramicControl } from "../packages/ui/src/ceramic-control";
import "../packages/ui/src/styles/base.css";

const notes = [
  { name: "C", hz: 523.25 },
  { name: "E", hz: 659.25 },
  { name: "G", hz: 783.99 },
];
let audio: AudioContext | undefined;
async function play(hz: number) {
  if (!window.AudioContext) return;
  audio ??= new AudioContext();
  if (audio.state === "suspended") await audio.resume();
  const t = audio.currentTime;
  for (const [ratio, volume, decay] of [
    [1, 0.11, 0.8],
    [2.76, 0.025, 0.22],
  ]) {
    const note = audio.createOscillator();
    const envelope = audio.createGain();
    note.frequency.value = hz * ratio;
    envelope.gain.setValueAtTime(0.0001, t);
    envelope.gain.exponentialRampToValueAtTime(volume, t + 0.006);
    envelope.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    note.connect(envelope).connect(audio.destination);
    note.onended = () => {
      note.disconnect();
      envelope.disconnect();
    };
    note.start(t);
    note.stop(t + decay);
  }
}

function Key({ name, hz }: (typeof notes)[number]) {
  const face = useCeramicControl(8, undefined, {
    hoverOffset: 16,
    maxElevation: 24,
  });
  return (
    <button
      {...face}
      type="button"
      aria-label={`Play ${name}`}
      onClick={() => void play(hz)}
    >
      {name}
    </button>
  );
}

createRoot(document.getElementById("instrument")!).render(
  <SurfaceProvider>
    <div className="keys oyn-ui" role="group" aria-label="Ceramic instrument">
      {notes.map(({ name, hz }) => (
        <Key key={name} name={name} hz={hz} />
      ))}
    </div>
  </SurfaceProvider>,
);
