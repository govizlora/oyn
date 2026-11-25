// Foreground-only probe. Loaded exclusively by the opt-in recording-page inspector.
export function inspectTabFrames() {
  const box = document.createElement("aside");
  box.setAttribute("aria-label", "Tab motion inspector");
  box.style.cssText =
    "position:fixed;top:8px;left:8px;z-index:2;padding:6px 10px;font:12px/1.5 system-ui;background:Canvas;color:CanvasText";
  box.innerHTML = `<label>Tab transition <select>
    <option value="">Instant push (library default)</option>
    <option data-short-push>Short push, then coast</option>
    <option value="cubic-bezier(.25,.16,.65,1)">Previous glide</option>
    <option value="cubic-bezier(.333333,1,.666667,1)">Previous cubic ease-out</option>
    <option value="linear">Constant speed (diagnostic)</option>
  </select></label>
  <div><label>Transition duration <input type="range" min="100" max="600" step="10" value="250">
    <span data-duration></span></label></div>
  <div><output>Switch tabs to sample browser frame intervals.</output></div>`;
  document.body.append(box);
  const curve = box.querySelector("select")!;
  const output = box.querySelector("output")!;
  const indicator = document.querySelector<HTMLElement>(
    "[data-oyn-indicator]",
  )!;
  const tabs = indicator.closest<HTMLElement>('[data-slot="tabs"]')!;
  // A finite push gives constant net acceleration for the first eighth of the
  // slide. After release, constant resistance brings it to rest. Match position
  // and velocity at release; sample the two parabolas for one native CSS transition.
  const release = 1 / 8;
  curve.querySelector<HTMLOptionElement>("[data-short-push]")!.value =
    `linear(${Array.from({ length: 65 }, (_, i) => {
      const t = i / 64;
      const distance =
        t <= release ? (t * t) / release : 1 - (1 - t) ** 2 / (1 - release);
      return distance.toFixed(6);
    }).join(",")})`;
  const duration = box.querySelector("input")!;
  const readout = box.querySelector("[data-duration]")!;
  function applyCurve() {
    tabs.style.setProperty("--oyn-slide-easing", curve.value);
  }
  function applyDuration() {
    tabs.style.setProperty("--oyn-slide-duration", duration.value + "ms");
    readout.textContent = duration.value + " ms";
    duration.setAttribute("aria-valuetext", duration.value + " milliseconds");
  }
  curve.onchange = applyCurve;
  duration.oninput = applyDuration;
  applyCurve();
  applyDuration();
  let frame = 0;
  const frames: { time: number; x: number }[] = [];
  function tick(time: number) {
    frames.push({ time, x: indicator.getBoundingClientRect().x });
    frame = requestAnimationFrame(tick);
  }
  function start(event: TransitionEvent) {
    if (event.target !== indicator || event.propertyName !== "transform")
      return;
    cancelAnimationFrame(frame);
    frames.length = 0;
    frame = requestAnimationFrame(tick);
  }
  function stop(event: TransitionEvent) {
    if (event.target !== indicator || event.propertyName !== "transform")
      return;
    cancelAnimationFrame(frame);
    if (event.type !== "transitionend" || frames.length < 3) return;
    const travel = frames.at(-1)!.x - frames[0].x;
    let midRepeats = 0,
      largestStep = 0;
    const sorted = frames
      .slice(1)
      .map(({ time, x }, i) => {
        const step = Math.abs(x - frames[i].x);
        const progress = (x - frames[0].x) / travel;
        if (progress > 0.1 && progress < 0.9 && step < 0.05) midRepeats++;
        largestStep = Math.max(largestStep, step);
        return time - frames[i].time;
      })
      .sort((a, b) => a - b);
    const median =
      (sorted[Math.floor((sorted.length - 1) / 2)] +
        sorted[Math.floor(sorted.length / 2)]) /
      2;
    output.textContent = `rAF: ${median.toFixed(1)} ms median (~${Math.round(1000 / median)} Hz) · ${sorted.at(-1)!.toFixed(1)} ms max · ${largestStep.toFixed(1)} px max step · mid-slide repeats: ${midRepeats}`;
  }
  if (matchMedia("(prefers-reduced-motion: reduce)").matches)
    output.textContent = "Reduced motion is on; there is no slide to sample.";
  indicator.addEventListener("transitionstart", start);
  indicator.addEventListener("transitioncancel", stop);
  indicator.addEventListener("transitionend", stop);
  return () => {
    cancelAnimationFrame(frame);
    indicator.removeEventListener("transitionstart", start);
    indicator.removeEventListener("transitioncancel", stop);
    indicator.removeEventListener("transitionend", stop);
    tabs.style.removeProperty("--oyn-slide-duration");
    tabs.style.removeProperty("--oyn-slide-easing");
    box.remove();
  };
}
