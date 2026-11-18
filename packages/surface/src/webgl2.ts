import type { Material } from "./types/material.js";
import type { Draw } from "./renderer.js";

type Loader = NonNullable<Material["loadWebGL2"]>;
type Programs = Awaited<ReturnType<Loader>>;
type GLTarget = {
  canvas: HTMLCanvasElement;
  context?: CanvasRenderingContext2D;
};
export function createWebGL2(
  fail: (error: unknown) => void,
  invalidate: () => void,
) {
  const scratch = document.createElement("canvas");
  const gl = scratch.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
  });
  if (!gl) throw Error("Neither WebGPU nor WebGL2 is available.");
  let disposed = false;
  const lost = () => fail(Error("Surface WebGL2 context lost."));
  scratch.addEventListener("webglcontextlost", lost);
  const limit = Math.min(
    gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
    ...gl.getParameter(gl.MAX_VIEWPORT_DIMS),
  );
  const modules = new Map<Loader, Programs | null>();
  const programs = new Map<string, Map<string, WebGLProgram>>();
  const frameBuffer = gl.createBuffer(),
    params = gl.createBuffer();
  function ready(m: Material) {
    const load = m.loadWebGL2;
    if (!load || m.data) return false;
    if (!modules.has(load)) {
      modules.set(load, null);
      load().then(
        (value) => {
          if (!disposed) {
            modules.set(load, value);
            invalidate();
          }
        },
        (err) => {
          if (!disposed) fail(err);
        },
      );
    }
    return modules.get(load)?.has(m.shader) ?? false;
  }
  function program(m: Material, entry: string) {
    let cache = programs.get(m.shader);
    if (!cache) programs.set(m.shader, (cache = new Map()));
    const existing = cache.get(entry);
    if (existing) return existing;
    const source = modules.get(m.loadWebGL2!)!.get(m.shader)!;
    const p = gl!.createProgram()!;
    try {
      for (const [type, code] of [
        [gl!.VERTEX_SHADER, source.vertex],
        [gl!.FRAGMENT_SHADER, source.fragments[entry]],
      ] as const) {
        if (!code) throw Error("Missing generated WebGL2 entry " + entry);
        const s = gl!.createShader(type)!;
        gl!.attachShader(p, s);
        gl!.deleteShader(s);
        gl!.shaderSource(s, code);
        gl!.compileShader(s);
        if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS))
          throw Error(gl!.getShaderInfoLog(s) ?? "GLSL compile failure");
      }
      gl!.linkProgram(p);
      if (!gl!.getProgramParameter(p, gl!.LINK_STATUS))
        throw Error(gl!.getProgramInfoLog(p) ?? "GLSL link failure");
      for (const [name, binding] of Object.entries(source.blocks)) {
        const index = gl!.getUniformBlockIndex(p, name);
        if (index !== gl!.INVALID_INDEX)
          gl!.uniformBlockBinding(p, index, binding);
      }
    } catch (err) {
      gl!.deleteProgram(p);
      throw err;
    }
    cache.set(entry, p);
    return p;
  }
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  function draw(items: Draw<GLTarget>[]) {
    // Pack shelves independently of DOM coordinates. Limit normal batches to
    // 2048² pixels; an oversized surface gets its own exact-sized batch.
    for (let i = 0; i < items.length;) {
      const first = items[i].target.canvas;
      const edge = Math.min(limit, 2048),
        maxW = Math.max(edge, first.width),
        maxH = Math.max(edge, first.height);
      const batch = [];
      let height = 0,
        x = 0,
        y = 0,
        row = 0,
        width = 0;
      while (i < items.length) {
        const item = items[i],
          { canvas } = item.target,
          w = canvas.width,
          h = canvas.height;
        if (
          batch.length &&
          (maxW > edge || maxH > edge || w > edge || h > edge)
        )
          break;
        if (x + w > maxW) {
          y += row;
          x = 0;
          row = 0;
        }
        if (y + h > maxH) break;
        batch.push({ item, x, y, w, h });
        height = Math.max(height, y + h);
        width = Math.max(width, x + w);
        row = Math.max(row, h);
        x += w;
        i++;
      }
      if (scratch.width !== width) scratch.width = width;
      if (scratch.height !== height) scratch.height = height;
      gl!.clear(gl!.COLOR_BUFFER_BIT);
      for (const { item, x, y, w, h } of batch) {
        gl!.viewport(x, height - y - h, w, h);
        gl!.bindBufferBase(gl!.UNIFORM_BUFFER, 0, frameBuffer);
        gl!.bufferData(gl!.UNIFORM_BUFFER, item.frame, gl!.STREAM_DRAW);
        gl!.bindBufferBase(gl!.UNIFORM_BUFFER, 1, params);
        gl!.bufferData(
          gl!.UNIFORM_BUFFER,
          item.material.parameters.snapshot(),
          gl!.STREAM_DRAW,
        );
        for (const pass of item.material.passes) {
          gl!.useProgram(program(item.material, pass));
          gl!.drawArrays(gl!.TRIANGLES, 0, 6);
        }
      }
      for (const { item, x, y, w, h } of batch) {
        const t = item.target;
        if (!t.context) {
          const ctx = t.canvas.getContext("2d");
          if (!ctx) throw Error("Surface 2D canvas unavailable");
          t.context = ctx;
        }
        t.context.globalCompositeOperation = "copy";
        t.context.drawImage(scratch, x, y, w, h, 0, 0, w, h);
      }
    }
  }
  return {
    limit,
    ready,
    draw,
    createTarget: (canvas: HTMLCanvasElement): GLTarget => ({ canvas }),
    release(_t: GLTarget) {},
    dispose() {
      disposed = true;
      scratch.removeEventListener("webglcontextlost", lost);
      programs.forEach((cache) => cache.forEach((p) => gl.deleteProgram(p)));
      gl.deleteBuffer(frameBuffer);
      gl.deleteBuffer(params);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
