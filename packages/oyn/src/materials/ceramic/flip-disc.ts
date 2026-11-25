import { createParameters } from "../../core/createParameters.js";
import type { MaterialInstance } from "../../core/types/material.js";
import { frameWGSL } from "./effects/frame.js";
import { geometryWGSL } from "./effects/geometry.js";
import { parseColor } from "./color.js";
import { ceramicBinding } from "./interaction.js";

// Top view: XY is the desk, +Z points toward the viewer.
// All stones flip about a fixed Y diameter.
export const flipDiscWGSL = /* wgsl */ `
${frameWGSL}
${geometryWGSL}
struct Stock {
  lens:vec4f, // core radius, sphere offset, sphere radius, edge roll
  cut:vec4f,  // bowl radius, lip fillet, deck height above pivot, lip centre radius
  front:vec4f, reverse:vec4f, finish:vec4f, interaction:vec4f, // pivot travel, keyboard focus, tangential extension, lamp height
}
@group(0) @binding(1) var<uniform> m:Stock;
const lampRadius=1.95;
fn deck()->f32 {return m.cut.z+m.interaction.x;}
// Weak perspective about the resting plane: the moving stone recedes;
// the socket and button hit target stay anchored to the desktop.
fn viewScale()->f32 {return 2.0/(2.0+m.interaction.x);}
fn rotate(p:vec3f,cs:vec2f)->vec3f {
  return vec3f(cs.x*p.x-cs.y*p.z,p.y,cs.y*p.x+cs.x*p.z);
}
// Exact meridian of two opposed spherical caps, offset by a rolling radius.
// The tangent at the cap/roll join is shared. Distance and normal come from
// the same nearest point; finite differences aren't needed at the equator.
fn profile(p:vec3f)->vec4f {
  let r=length(p.xy); let side=select(-1.0,1.0,p.z>=0.0);
  var v=vec2f(r,p.z+side*m.lens.y);
  var base=m.lens.z;
  if(abs(p.z)*m.lens.x<m.lens.y*(r-m.lens.x)){v=vec2f(r-m.lens.x,p.z);base=0.0;}
  let d=length(v); let g=v/max(d,.00001);
  return vec4f(p.xy/max(r,.00001)*g.x,g.y,d-base-m.lens.w);
}
fn castShade(p:vec3f,cs:vec2f,l:vec3f,px:f32)->f32 {
  let ro=rotate(p,cs); let ray=rotate(l,cs);
  // Angular clearance of the *curved* stone seen from the receiver.
  // For a convex distance field h(t), t*h'(t)-h(t) is monotone. Find its
  // zero, including negative clearance inside the shadow. No hard centre-ray
  // cutoff at the edge of a bounding sphere.
  var lo=px*.25;var hi=3.6;
  for(var i=0;i<9;i++){
    let t=.5*(lo+hi);let h=profile(ro+t*ray);
    if(t*dot(h.xyz,ray)<h.w){lo=t;}else{hi=t;}
  }
  let t=.5*(lo+hi);let clearance=profile(ro+t*ray).w/t;
  // Fixed-area window parallel to the desk: its angular size contracts
  // at grazing incidence, rather than becoming an infinite penumbra.
  let aperture=.30*l.z*l.z;
  return 1.0-smoothstep(-aperture,aperture,clearance);

}
fn sky(p:vec3f,l:vec3f)->f32 {
  let h=max(0.0,deck()-p.z);
  if(h<.0001){return 1.0;}
  let d=length(p.xy+l.xy*(h/l.z))-m.cut.w;
  return 1.0-smoothstep(-.005-.45*h,.005+.45*h,d);
}
// A continuous amber emitter inset into the curved socket wall.
fn socketLight(base:vec4f,p:vec3f,n:vec3f,wall:bool)->vec4f {
  if(m.interaction.y<.5){return base;}
  let r=length(p.xy);
  let ring=vec2f(.96*m.cut.x, deck()-.28*m.cut.x);
  let ray=ring-vec2f(r,p.z);
  let d=length(ray);
  // The emitting wall is broad, not a line: grazing glaze catches its upper lip.
  let facing=smoothstep(-.65,.65,dot(n,vec3f(p.xy/max(r,.0001)*ray.x,ray.y))/max(d,.0001));
  let glow=select(facing*exp(-2.0*d),.46+.54*exp(-3.6*d),wall);
  let amber=mix(vec3f(1,.33,.055),vec3f(1,.77,.31),exp(-8.0*d));
  return over(vec4f(amber*glow,glow),base);
}
// A circular fillet tangent to BOTH the worktop and the spherical cut.
// No vertical hard seam, even with the wide-mouth cut.
fn ground(xy:vec2f,r:f32,cs:vec2f,l:vec3f,px:f32)->vec4f {
  let cone=vec3f(.13,.14,.13);
  if(r>=m.cut.w){
    let height=abs(cs.y)+(m.lens.z-m.lens.y+m.lens.w)*abs(cs.x)-deck();
    if(r>1.0+max(0.0,height)*2.65){return vec4f(0);}
    let a=.31*castShade(vec3f(xy,deck()+.001),cs,l,px);
    return vec4f(cone*a,a);
  }
  let join=m.cut.w*m.cut.x/(m.cut.x+m.cut.y);
  var z:f32; var n:vec3f;
  if(r>=join){
    let k=clamp((m.cut.w-r)/m.cut.y,0.0,1.0);
    let top=sqrt(1.0-k*k);
    z=deck()-m.cut.y*(1.0-top);
    n=vec3f(-xy/max(r,.0001)*k,top);
  }else{
    let h=sqrt(max(0.0,m.cut.x*m.cut.x-r*r));
    z=deck()-h; n=vec3f(-xy,h)/m.cut.x;
  }
  let p=vec3f(xy,z);
  let light=sky(p,l)*(1.0-castShade(p+n*.001,cs,l,px));
  let near=max(0.0,profile(rotate(p,cs)).w);
  let depth=clamp((deck()-z)/m.cut.x,0.0,1.0);
  let dark=clamp(.27*(l.z-max(dot(n,l),0.0))+.31*(1.0-light)+.16*depth+.20*exp(-near*10.0)*(1.0-n.z),-.12,.76);
  // Relative to the actual desktop pigment; the shader has no opaque tile.
  let base=select(vec4f(cone*dark,dark),vec4f(vec3f(-dark*2.8),-dark*2.8),dark<0.0);
  return socketLight(base,p,n,true);
}
fn scene(deskXY:vec2f,cs:vec2f,key:vec3f,emitter:vec3f,px:f32)->vec4f {
  let xy=deskXY/viewScale();let r=length(xy);
  let l=normalize(key-vec3f(deskXY,deck()));
  if(r>1.002){return ground(deskXY,length(deskXY),cs,l,px);}
  var q=vec3f(0.0); var hit=false;
  if(abs(cs.y)<.0002 && r<=1.0){
    // Analytic ray hit in the two latched poses (the common array case).
    let join=m.lens.x*(1.0+m.lens.w/m.lens.z);
    var z=0.0;
    if(r<=join){let s=m.lens.z+m.lens.w;z=sqrt(s*s-r*r)-m.lens.y;}
    else{let e=r-m.lens.x;z=sqrt(max(0.0,m.lens.w*m.lens.w-e*e));}
    q=rotate(vec3f(xy,z),cs);hit=true;
  }else if(r<=1.0){
    let bound=sqrt(max(0.0,1.002-r*r));
    let origin=rotate(vec3f(xy,bound),cs);let ray=rotate(vec3f(0,0,-1),cs);
    var t=0.0;
    for(var i=0;i<72;i++){
      q=origin+t*ray;let d=profile(q).w;
      if(d<.00010){hit=true;break;}
      t+=d;
      if(t>2.0*bound){break;}
    }
  }
  if(!hit){return ground(deskXY,length(deskXY),cs,l,px);}
  let inv=vec2f(cs.x,-cs.y);let world=rotate(q,inv);
  let n=rotate(profile(q).xyz,inv);
  let lamp=normalize(key-world);
  // Mirror one studio emitter: round overhead, longer along the tangent
  // at oblique incidence. No screen-space line or second specular spot.
  let mirror=reflect(vec3f(0,0,-1),n);
  let axis=normalize(emitter);
  let cosine=dot(mirror,axis);
  let t=dot(emitter-world,axis)/max(cosine,.0001);
  let offset=world+t*mirror-emitter;
  let sideways=length(axis.xy);
  let tangent=vec3f(-axis.y,axis.x,0)/max(sideways,.0001);
  let stretch=1.0+m.interaction.z*pow(sideways,4);
  let along=dot(offset,tangent);
  let miss=length(offset-tangent*along*(1.0-1.0/stretch));
  let radius=.26*inverseSqrt(m.finish.x);
  let aa=px*.5*(1.0+2.0*length(emitter-world)/(m.lens.z+m.lens.w));
  let image=select(0.0,1.0-smoothstep(radius-aa,radius+aa,miss),cosine>0.0 && t>0.0);
  let taper=1.0-.65*smoothstep(.2,1.0,abs(along)/(stretch*radius))*pow(sideways,4);
  // Like the Card: distinguish the image of the lamp from the grazing
  // reflection of its surroundings. The latter follows roll, not a border mask.
  let grazing=pow(1.0-clamp(n.z,0.0,1.0),2.1);
  let facing=max(dot(n.xy,axis.xy),0.0);
  let surround=1.0-exp(-m.finish.z*grazing*(.65+3.0*facing));
  let visibility=sky(world,lamp);
  let pigment=select(m.front.rgb,m.reverse.rgb,q.z<0.0);
  let body=pigment*(.99-m.finish.w*(1.0-visibility*max(dot(n,lamp),0.0)));
  let glint=image*taper*(1.0-exp(-.38*m.finish.y))*sky(world,normalize(emitter-world));
  let surface=mix(body,vec3f(1),surround);
  // One emitter for both output formats. Only the final SDR target clips at white.
  let lampWhite=1.55;
  return socketLight(vec4f(mix(surface,vec3f(lampWhite),glint),1),world,n,false);
}
@fragment fn surface(in:VertexOut)->@location(0) vec4f {
  let size=min(in.card.z,in.card.w);
  let xy=(in.local-in.card.zw*.5)*vec2f(2,-2)/size;
  let cs=vec2f(cos(m.front.w),sin(m.front.w));
  let delta=(frame.viewportLight.zw-in.card.xy-in.card.zw*.5)*vec2f(1,-1);
  // Swing the finite lamp from overhead toward the side of the socket.
  // At grazing angles the rolled edge compresses its image into a thin arc.
  let arm=delta/sqrt(110.0*110.0+dot(delta,delta));
  let key=vec3f(4.5*arm,deck()+3.0); // broad fill and soft shadows only
  let emitter=vec3f(lampRadius*arm,deck()+m.interaction.w*mix(3.0f,.22f,dot(arm,arm)));
  let pixel=2.0/(size*frame.geometry.y);
  let r=length(xy);
  // Cover the moving silhouette and the annular transitions in physical
  // pixels. The canvas already tracks native DPR; no CSS upscaling.
  if((abs(cs.y)>.001 && r<1.0+pixel) || (r>=viewScale()*m.lens.x-pixel && r<=1.0+pixel) || (r>m.cut.x-.04 && r<m.cut.w+pixel)){
    let a=vec2f(.375,.125)*pixel;let b=vec2f(-a.y,a.x);
    return .25*(scene(xy+a,cs,key,emitter,pixel)+scene(xy-a,cs,key,emitter,pixel)+scene(xy+b,cs,key,emitter,pixel)+scene(xy-b,cs,key,emitter,pixel));
  }
  return scene(xy,cs,key,emitter,pixel);
}
`;

function loadWebGL2() {
  return import("./generated/flip-disc.js").then((m) => m.default);
}

export type StoneProfile = Readonly<{
  crown: number;
  roll: number;
  gap: number;
  lip: number;
  depth: number;
}>;
/** Optical configuration only. Consumers provide instantaneous pose numbers. */
export type FlipDiscOptions = {
  profile: StoneProfile;
  lightTarget?: HTMLElement | null;
  contrast: number;
  sharpness: number;
  reflectionStrength: number;
  rimStrength: number;
  extension: number;
  lampHeight: number;
};

function stock(p: StoneProfile) {
  if (
    ![p.roll, p.crown, p.lip, p.gap, p.depth].every(Number.isFinite) ||
    !(
      p.roll > 0 &&
      p.crown > 0 &&
      p.crown < 1 - p.roll &&
      p.lip > 0 &&
      p.gap > Math.abs(p.depth)
    )
  )
    throw new RangeError(
      "Stone profile must have a rounded biconvex lens and clearance for a half-turn.",
    );
  const core = 1 - p.roll,
    k = (core * core - p.crown * p.crown) / (2 * p.crown),
    bore = 1 + p.gap;
  return [
    core,
    k,
    k + p.crown,
    p.roll,
    bore,
    p.lip,
    p.depth,
    Math.sqrt(bore * bore + 2 * bore * p.lip),
  ];
}

/** No gesture listeners, clocks or easing. Numeric sources use bindMotion. */
export function createFlipDiscMaterial(initial: FlipDiscOptions) {
  let previous = initial;
  const parameters = createParameters([
    ...stock(initial.profile),
    ...parseColor("#F4F2E9"),
    0, // front.w stores the instantaneous angle
    ...parseColor("#FF6900"),
    0,
    initial.sharpness,
    initial.reflectionStrength,
    initial.rimStrength,
    initial.contrast,
    0,
    0,
    initial.extension,
    initial.lampHeight,
  ]);
  const material: MaterialInstance = {
    shader: flipDiscWGSL,
    loadWebGL2,
    parameters,
    passes: ["surface"],
    measurePadding: (w, h) => ({ x: w * 0.84, y: h * 0.84 }),
    bind(context) {
      const lighting = ceramicBinding()(context);
      return {
        ...lighting,
        frame(frame) {
          if (previous.lightTarget) {
            const box = previous.lightTarget.getBoundingClientRect();
            const point = frame.toLocal({
              x: box.left + box.width / 2,
              y: box.top + box.height / 2,
            });
            return [point.x, point.y, 0];
          }
          return lighting.frame!(frame);
        },
      };
    },
  };
  return Object.assign(material, {
    setAngle: (value: number) => parameters.set(11, value),
    setTravel: (value: number) => parameters.set(20, value),
    setGlow: (value: number) => parameters.set(21, value),
    update(next: FlipDiscOptions) {
      if (next.profile !== previous.profile)
        stock(next.profile).forEach((v, i) => parameters.set(i, v));
      parameters.set(16, next.sharpness);
      parameters.set(17, next.reflectionStrength);
      parameters.set(18, next.rimStrength);
      parameters.set(19, next.contrast);
      parameters.set(22, next.extension);
      parameters.set(23, next.lampHeight);
      const moved = previous.lightTarget !== next.lightTarget;
      previous = next;
      if (moved) return "draw" as const;
    },
  });
}
