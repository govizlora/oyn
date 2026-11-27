import { frameWGSL } from "../shared/frame.js";

export const strokeSlots = 12;
export const wakeLifetime = 1.25;
const flight = 108;
// Flight plus the diffuse envelope, animated flow and pointer displacement.
export const padding = flight + 72;

export const particleShader = /* wgsl */ `
${frameWGSL}
struct Stroke { ends: vec4f, stamp: vec4f }
struct GrainParams { pigmentTime: vec4f, exitPigment: vec4f, strokes: array<Stroke, ${strokeSlots}> }
@group(0) @binding(1) var<uniform> params: GrainParams;

// Hash integer cell identities: color, size and depth never flicker with time.
fn noise(id: vec2i, seed: u32) -> vec4f {
  var h = vec4u((bitcast<u32>(id.x)*1597334677u) ^ (bitcast<u32>(id.y)*3812015801u) ^ seed)
        + vec4u(17u, 1031u, 8951u, 40151u);
  h = (h ^ (h >> vec4u(16u))) * 2246822519u;
  h = (h ^ (h >> vec4u(13u))) * 3266489917u;
  return vec4f(h >> vec4u(8u)) / 16777216.0;
}

// The consumer clock samples a damped impulse response. A stationary cursor
// supplies no new impulse. A stroke influences its whole swept segment.
fn wake(pos:vec2f, t:f32) -> vec2f {
  var push = vec2f(0);
  var mask = u32(frame.geometry.w);
  while (mask != 0u) {
    let j = firstTrailingBit(mask);
    mask &= mask-1u;
    let stroke = params.strokes[j];
    let age = t-stroke.stamp.x;

    let path = stroke.ends.zw-stroke.ends.xy;
    let len2 = dot(path,path);
    let u = clamp(dot(pos-stroke.ends.xy,path)/max(len2,0.001),0.0,1.0);
    let away = pos-stroke.ends.xy-u*path;
    let falloff = max(0.0,1.0-dot(away,away)/1296.0);
    if (falloff == 0) { continue; }
    let speed = sqrt(len2);
    let envelope = (0.3+11.0*age)*exp(-5.6*age)*(1.0-smoothstep(0.8,${wakeLifetime},age));
    push += (0.44*path*min(1.0,32.0/max(speed,0.001))+0.037*min(speed,32.0)*away) * falloff*falloff*envelope;
  }
  return push/(1.0+length(push)/14.0);
}

@fragment fn grains(in: VertexOut) -> @location(0) vec4f {
  if (params.exitPigment.y == 0.0f) { return vec4f(0); }
  let halfSize = in.card.zw * 0.5;
  let p = in.local - halfSize;
  let t = params.pigmentTime.w;
  let exit = params.exitPigment.x;
  let r = clamp(frame.geometry.x, 0.0, min(halfSize.x, halfSize.y));
  let feather = clamp(min(halfSize.x, halfSize.y)*0.78, 5.0, 24.0);
  if (any(abs(p) > halfSize + feather + 52.0 + exit * ${flight}.0)) { return vec4f(0); }
  let field = wake(in.local+in.card.xy,t)*(1.0-exit);
  var ink = vec4f(0);
  // Sample four moving sheets in their own rest coordinates. Inverting the
  // flow avoids particle simulation, history buffers and a CPU particle loop.
  for (var i = 0u; i < 4u; i++) {
    let k = f32(i);
    let phase = k*2.4;
    let direction = vec2f(cos(phase), sin(phase));
    // Each layer parts differently, but the stroke translates grain centers
    // only. Use an inverse estimate to find candidates, never to draw a disc.
    let split = 0.35*sin(phase+0.6);
    let carry = 0.48+k*0.16;
    let response = mat2x2f(carry,split,-split,carry);
    let shift = response*field;
    let lookup = p-shift;
    let across = vec2f(-direction.y, direction.x);
    let lane = dot(lookup,across);
    let travel = exit*(0.35+0.65*exit)*${flight}.0*(0.48+0.17*k);
    var q = lookup - travel*direction*(0.72+0.28*sin(lane*0.057+phase));
    q += (2.4+k)*vec2f(sin(q.y*0.049+0.47*t+phase),cos(q.x*0.034+0.37*t+phase));
    let pitch = 2.65 + k*0.93;
    let base = vec2i(floor(q/pitch));
    for (var dy=-1;dy<=1;dy++) { for (var dx=-1;dx<=1;dx++) {
        let cell = base+vec2i(dx,dy);
        let n = noise(cell, i*1531u);
        let center = (vec2f(cell)+0.24+0.52*n.xy)*pitch;
        var resting = center-(2.4+k)*vec2f(sin(center.y*0.049+0.47*t+phase),cos(center.x*0.034+0.37*t+phase));
        resting += travel*direction*(0.72+0.28*sin(dot(resting,across)*0.057+phase));
        let w = wake(resting+halfSize+in.card.xy,t)*(1.0-exit);
        let displaced = resting+response*w;
        let distance = length(p-displaced);
        let grain = 1.0-smoothstep(0.02, (0.55+0.13*k)*(0.7+0.6*n.z)+0.42, distance);
        if (grain <= 0.0) { continue; }
        // Broad drifting streams cross the nominal contour instead of tracing it.
        let wave = sin(center.x*0.022+0.32*t+phase)+0.48*sin(center.x*0.043-0.21*t+phase);
        let lift = min(halfSize.y*0.48, 14.0)*wave;
        let edge = abs(center-vec2f(0,lift))-halfSize+r;
        let sd = length(max(edge,vec2f(0))) + min(max(edge.x,edge.y),0.0)-r;
        let ribbon = exp(-abs(center.y-lift)*0.082);
        let cloud = (0.46+0.54*ribbon)*(0.85+0.15*sin(center.x*0.039+phase));
        let envelope = 1.0-smoothstep(-feather,feather,sd+4.0*sin(center.x*0.11+phase));
        let alpha = grain*envelope*cloud*(0.46+0.53*n.w)*(1.0-smoothstep(n.z*0.55,1.0,exit));
        let tint = clamp(params.pigmentTime.rgb + (n.xyz-0.5)*0.24+(n.w-0.5)*0.18,vec3f(0),vec3f(1));
        ink = vec4f(tint*alpha,alpha)+ink*(1.0-alpha);
    }}
  }
  return ink;
}
`;
