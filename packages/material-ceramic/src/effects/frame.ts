export const frameWGSL = /* wgsl */ `
struct Frame { viewportLight: vec4f, rect: vec4f, geometry: vec4f }
@group(0) @binding(0) var<uniform> frame: Frame;
struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
  @location(1) @interpolate(flat) card: vec4f,
}
@vertex fn vertex(@builtin(vertex_index) v: u32, @builtin(instance_index) i: u32) -> VertexOut {
  let corners = array<vec2f,6>(vec2f(0,0),vec2f(1,0),vec2f(0,1),vec2f(0,1),vec2f(1,0),vec2f(1,1));
  let r=frame.rect; let pad=r.xy;
  let local=corners[v]*(r.zw+2*pad)-pad;
  let origin=r.xy;
  let pixel=origin+local;
  var out: VertexOut;
  out.position=vec4f(pixel/frame.viewportLight.xy*vec2f(2,-2)+vec2f(-1,1),0,1);
  out.local=local; out.card=r; return out;
}
`;
