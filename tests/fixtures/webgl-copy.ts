import { createCeramicMaterial } from "../../packages/ceramic/src/material.js";
import { createRenderer } from "../../packages/surface/src/renderer.js";

// Benchmark-only alternative copy strategies. All GLSL is generated
// from the production WGSL by the Node runner, never independently authored.
type GlslStage = {
  code: string;
  reflection: { uniforms: Record<string, { group: number; binding: number }> };
};
type Sources = Record<
  "ceramic",
  {
    vertex: GlslStage;
    fragments: Record<string, GlslStage>;
  }
>;
type Mode =
  "webgpu" | "webgl-shared" | "webgl-copy-sequential" | "webgl-copy-batched";
type Sample = { t: number; cpu: number; copy: number };

async function setup(mode: Mode, sources: Sources) {
  const dpr = devicePixelRatio;
  const columns = 8,
    rows = 5,
    slotW = 202,
    slotH = 174;
  const root = document.querySelector<HTMLElement>("#scene")!;
  root.style.width = `${columns * slotW}px`;
  root.style.height = `${rows * slotH}px`;
  const width = 120,
    height = 80;
  const items = Array.from({ length: 40 }, (_, index) => {
    const raised = index < 20;
    const material = createCeramicMaterial({
      colorScheme: "light",
      color: "#e8e2d8",
      elevation: raised ? 16 : -2.3,
      maxElevation: raised ? 16 : 0,
    });
    const pad = material.measurePadding(width, height);
    const cssW = width + 2 * pad.x,
      cssH = height + 2 * pad.y;
    if (cssW > slotW || cssH > slotH)
      throw Error("Card exceeds its benchmark slot");
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(cssW * dpr);
    canvas.height = Math.ceil(cssH * dpr);
    canvas.style.cssText = `left:${-pad.x}px;top:${-pad.y}px;width:${cssW}px;height:${cssH}px`;
    const host = document.createElement("div");
    host.className = "card";
    const left = (index % columns) * slotW + (slotW - width) / 2;
    const top = Math.floor(index / columns) * slotH + (slotH - height) / 2;
    host.style.left = `${left}px`;
    host.style.top = `${top}px`;
    if (mode !== "webgl-shared") host.append(canvas);
    const label = document.createElement("div");
    label.className = "label";
    label.innerHTML = `${raised ? "Raised" : "Inset"} ${(index % 20) + 1}<small>${raised ? "+16" : "−2.3"} elevation</small>`;
    host.append(label);
    root.append(host);
    return {
      material,
      canvas,
      raised,
      pad,
      x: Math.round((left - pad.x) * dpr),
      y: Math.round((top - pad.y) * dpr),
      frame: new Float32Array([
        cssW,
        cssH,
        pad.x + 30,
        pad.y + 10,
        pad.x,
        pad.y,
        width,
        height,
        18,
        canvas.width / cssW,
        canvas.height / cssH,
        0,
      ]),
    };
  });
  const bounds = root.getBoundingClientRect();
  if (bounds.right > innerWidth || bounds.bottom > innerHeight)
    throw Error("Scene is not fully onscreen");

  let draw: () => number, dispose: () => void;
  const failures: string[] = [];
  let backend: unknown;
  if (mode === "webgpu") {
    const renderer = await createRenderer((error) =>
      failures.push(String(error)),
    );
    const draws = items.map((item) => ({
      ...item,
      target: renderer.createTarget(item.canvas, item.material),
    }));
    draw = () => {
      renderer.draw(draws);
      return 0;
    };
    dispose = () => renderer.dispose();
    backend = { contexts: items.length, deviceCount: 1 };
  } else {
    const sequential = mode === "webgl-copy-sequential";
    const source = document.createElement("canvas");
    source.width = sequential
      ? Math.max(...items.map((i) => i.canvas.width))
      : columns * slotW * dpr;
    source.height = sequential
      ? Math.max(...items.map((i) => i.canvas.height))
      : rows * slotH * dpr;
    if (mode === "webgl-shared") {
      source.style.width = `${columns * slotW}px`;
      source.style.height = `${rows * slotH}px`;
      root.prepend(source);
    }
    const gl = source.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) throw Error("WebGL2 unavailable");
    source.addEventListener("webglcontextlost", () =>
      failures.push("WebGL context lost"),
    );
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    backend = {
      contexts: 1,
      sourceSize: [source.width, source.height],
      renderer: debug
        ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER),
      contextAttributes: gl.getContextAttributes(),
    };
    const shaderObjects: WebGLShader[] = [];
    function compile(type: number, code: string) {
      const shader = gl!.createShader(type)!;
      gl!.shaderSource(shader, code);
      gl!.compileShader(shader);
      if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS))
        throw Error(gl!.getShaderInfoLog(shader)!);
      shaderObjects.push(shader);
      return shader;
    }
    const programs = new Map<string, WebGLProgram>();
    for (const [kind, shader] of Object.entries(sources)) {
      const vertex = compile(gl.VERTEX_SHADER, shader.vertex.code);
      for (const [pass, fragment] of Object.entries(shader.fragments)) {
        const program = gl.createProgram()!;
        gl.attachShader(program, vertex);
        gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment.code));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS))
          throw Error(gl.getProgramInfoLog(program)!);
        for (const stage of [shader.vertex, fragment])
          for (const [name, binding] of Object.entries(
            stage.reflection.uniforms,
          )) {
            if (binding.group !== 0 || binding.binding > 1)
              throw Error("Unsupported binding");
            const index = gl.getUniformBlockIndex(program, name);
            if (index !== gl.INVALID_INDEX)
              gl.uniformBlockBinding(program, index, binding.binding);
          }
        programs.set(`${kind}/${pass}`, program);
      }
    }
    shaderObjects.forEach((shader) => gl.deleteShader(shader));
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    function buffer(data: Float32Array<ArrayBuffer>) {
      const value = gl!.createBuffer()!;
      gl!.bindBuffer(gl!.UNIFORM_BUFFER, value);
      gl!.bufferData(gl!.UNIFORM_BUFFER, data, gl!.DYNAMIC_DRAW);
      return value;
    }
    const targets = items.map((item) => ({
      ...item,
      frameBuffer: buffer(item.frame),
      parameterBuffer: buffer(item.material.parameters.snapshot()),
      context:
        mode === "webgl-shared"
          ? null
          : item.canvas.getContext("2d", { alpha: true })!,
      programs: item.material.passes.map((pass) =>
        programs.get(`ceramic/${pass}`)!,
      ),
    }));
    for (const target of targets) {
      if (mode !== "webgl-shared" && !target.context)
        throw Error("Canvas 2D unavailable");
      if (target.context) target.context.globalCompositeOperation = "copy";
    }
    // Same shaders, passes and per-target uploads in all WebGL modes. Only
    // placement/copy ordering differs. No finish/readPixels in the timed loop.
    draw = () => {
      let copyMs = 0;
      gl.disable(gl.SCISSOR_TEST);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.SCISSOR_TEST);
      for (const target of targets) {
        const w = target.canvas.width,
          h = target.canvas.height;
        const x = sequential ? 0 : target.x;
        const y = sequential ? 0 : source.height - target.y - h;
        gl.viewport(x, y, w, h);
        gl.scissor(x, y, w, h);
        if (sequential) gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindBuffer(gl.UNIFORM_BUFFER, target.frameBuffer);
        gl.bufferSubData(gl.UNIFORM_BUFFER, 0, target.frame);
        gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, target.frameBuffer);
        gl.bindBuffer(gl.UNIFORM_BUFFER, target.parameterBuffer);
        gl.bufferSubData(
          gl.UNIFORM_BUFFER,
          0,
          target.material.parameters.snapshot(),
        );
        gl.bindBufferBase(gl.UNIFORM_BUFFER, 1, target.parameterBuffer);
        for (const program of target.programs) {
          gl.useProgram(program);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
        if (sequential) {
          const start = performance.now();
          target.context!.drawImage(
            source,
            0,
            source.height - h,
            w,
            h,
            0,
            0,
            w,
            h,
          );
          copyMs += performance.now() - start;
        }
      }
      if (mode === "webgl-copy-batched") {
        const start = performance.now();
        for (const target of targets) {
          const w = target.canvas.width,
            h = target.canvas.height;
          target.context!.drawImage(
            source,
            target.x,
            target.y,
            w,
            h,
            0,
            0,
            w,
            h,
          );
        }
        copyMs = performance.now() - start;
      }
      return copyMs;
    };
    dispose = () => {
      targets.forEach((target) => {
        gl.deleteBuffer(target.frameBuffer);
        gl.deleteBuffer(target.parameterBuffer);
      });
      programs.forEach((program) => gl.deleteProgram(program));
      gl.deleteVertexArray(vao);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }

  function frame(t: number) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const phase = t / 900 + i * 0.13;
      item.frame[2] = item.pad.x + width / 2 + Math.cos(phase) * 90;
      item.frame[3] = item.pad.y + height / 2 + Math.sin(phase) * 70;
      item.material.setElevation(
        item.raised
          ? 12 + 4 * Math.cos(phase)
          : -2.3 - 1.2 * (1 + Math.sin(phase)),
      );
    }
    return draw();
  }
  async function sample(warmupMs: number, sampleMs: number) {
    const frames: Sample[] = [];
    const longtasks: number[] = [];
    let recording = false;
    const observer = PerformanceObserver.supportedEntryTypes.includes(
      "longtask",
    )
      ? new PerformanceObserver((list) => {
          if (recording)
            longtasks.push(...list.getEntries().map((e) => e.duration));
        })
      : null;
    observer?.observe({ type: "longtask" });
    const start = await new Promise<number>(requestAnimationFrame);
    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const elapsed = now - start;
        recording = elapsed >= warmupMs;
        const before = performance.now();
        const copy = frame(elapsed);
        const cpu = performance.now() - before;
        if (recording) frames.push({ t: now, cpu, copy });
        if (elapsed < warmupMs + sampleMs) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    observer?.disconnect();
    if (failures.length) throw Error(failures.join("\n"));
    return { frames, longtasks };
  }
  async function freeze() {
    // Draw at a deterministic animation time outside the measured interval.
    // Two presentation opportunities let screenshots observe submitted work.
    frame(0);
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    if (failures.length) throw Error(failures.join("\n"));
  }
  return {
    sample,
    freeze,
    dispose,
    metadata: {
      mode,
      dpr,
      cards: 40,
      raised: 20,
      inset: 20,
      drawCalls: 60,
      copiesPerFrame: mode.startsWith("webgl-copy") ? 40 : 0,
      pixelArea: items.reduce(
        (sum, item) => sum + item.canvas.width * item.canvas.height,
        0,
      ),
      cardSize: [width, height],
      grid: [columns, rows],
      backend,
    },
  };
}

Object.assign(window, { setupWebglCopy: setup });
