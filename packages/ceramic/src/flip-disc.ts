import { createParameters, type Appearance } from "@oyn/surface";
import { frameWGSL } from "./effects/frame.js";
import { geometryWGSL } from "./effects/geometry.js";
import { ceramicGlossyNormalsWGSL } from "./effects/ceramic-geometry.js";
import { ceramicLightingWGSL } from "./effects/ceramic-lighting.js";
import { ceramicFinish } from "./finish.js";
import { parseColor } from "./color.js";
import { ceramicBinding } from "./interaction.js";

// Top view: XY is the desk, +Z points toward the viewer.
// Rotation is about an unmarked Y diameter. There is no axle geometry.
export const flipDiscWGSL = /* wgsl */ `
${frameWGSL}
${geometryWGSL}
${ceramicLightingWGSL}
${ceramicGlossyNormalsWGSL}
struct Stock {
  lens:vec4f, // core radius, sphere offset, sphere radius, edge roll
  cut:vec4f,  // bowl radius, lip fillet, deck height above pivot, lip centre radius
  glaze:CeramicOptics, reverse:vec4f, interaction:vec4f // pivot travel, keyboard focus, unused, unused
}
@group(0) @binding(1) var<uniform> m:Stock;
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
fn scene(deskXY:vec2f,cs:vec2f,key:vec3f,px:f32)->vec4f {
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
  var optics=m.glaze;if(q.z<0.0){optics.colorMode=m.reverse;}
  // Actual curvature lights the pigment; Ceramic's calibrated normals light the glaze.
  let size=min(frame.rect.z,frame.rect.w)*.5;
  optics.reflection.x=(key.z-world.z)*size;
  optics.colorMode=vec4f(optics.colorMode.rgb*(.59+.43*max(dot(n,lamp),0.0)),optics.colorMode.w);
  let slope=length(n.xy);
  let grad=select(vec2f(1,0),n.xy/max(slope,.0001),slope>.0001);
  // Support of the rolled lens along the screen-space outline normal.
  // Measure the optical rim in screen units like Ceramic, not by surface tilt:
  // at a rounded silhouette the latter changes almost entirely within one pixel.
  let axis=rotate(vec3f(grad,0),cs);
  let reach=select(m.lens.x*length(axis.xy),m.lens.z-m.lens.y*abs(axis.z),m.lens.z*abs(axis.z)>m.lens.y)+m.lens.w;
  let inset=(reach-dot(world.xy,grad))*size*viewScale();
  let band=1.0-clamp(inset/optics.shape.z,0.0,1.0);
  let glossy=ceramicGlossyNormals(grad,band);
  let g=CeramicGeometry(n,grad,band,1.0,band,band,world.xy*size,vec2f(size),vec2f(0),world.xy*size,sky(world,lamp),glossy[0],glossy[1]);
  return socketLight(lightCeramic(optics,g,key.xy*size),world,n,false);
}
@fragment fn surface(in:VertexOut)->@location(0) vec4f {
  let size=min(in.card.z,in.card.w);
  let xy=(in.local-in.card.zw*.5)*vec2f(2,-2)/size;
  let cs=vec2f(cos(frame.geometry.x),sin(frame.geometry.x));
  let delta=(frame.viewportLight.zw-in.card.xy-in.card.zw*.5)*vec2f(1,-1);
  let key=vec3f(4.5*delta/sqrt(190.0*190.0+dot(delta,delta)),3.0+deck());
  let pixel=2.0/(size*frame.geometry.y);
  let r=length(xy);
  // Cover the moving silhouette and the annular transitions in physical
  // pixels. The canvas already tracks native DPR; no CSS upscaling.
  if((abs(cs.y)>.001 && r<1.0+pixel) || (r>=viewScale()-2.0*m.glaze.shape.z/size-pixel && r<=1.0+pixel) || (r>m.cut.x-.04 && r<m.cut.w+pixel)){
    let a=vec2f(.375,.125)*pixel;let b=vec2f(-a.y,a.x);
    return .25*(scene(xy+a,cs,key,pixel)+scene(xy-a,cs,key,pixel)+scene(xy+b,cs,key,pixel)+scene(xy-b,cs,key,pixel));
  }
  return scene(xy,cs,key,pixel);
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
export type FlipDiscProps = {
  profile: StoneProfile;
  sharpness: number;
  reflectionStrength: number;
  rimStrength: number;
  /** Maximum press travel as a fraction of the remaining socket clearance. */
  stroke: number;
  pose: (now: number, reduced: boolean) => { angle: number; active: boolean };
};
const optical = ({
  sharpness,
  reflectionStrength,
  rimStrength,
}: FlipDiscProps) =>
  ceramicFinish({
    color: "#F4F2E9",
    colorScheme: "light",
    lighting: "glossy",
    sharpness,
    reflectionStrength,
    rimReflectionStrength: rimStrength,
    darkFrost: 0,
    shadowStrength: 0.28,
  }).values;

export const flipDisc: Appearance<FlipDiscProps> = {
  create(initial) {
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
    let previous = initial;
    const parameters = createParameters([
      ...stock(initial.profile),
      ...optical(initial),
      ...parseColor("#F16A32"),
      0,
      0,
      0,
      0,
      0, // interaction
    ]);
    return {
      material: {
        shader: flipDiscWGSL,
        loadWebGL2,
        parameters,
        passes: ["surface"],
        measurePadding: (w, h) => ({ x: w * 0.84, y: h * 0.84 }),
        bind(ctx) {
          const lighting = ceramicBinding()(ctx);
          const reduce = matchMedia("(prefers-reduced-motion: reduce)");
          reduce.addEventListener("change", ctx.requestDraw, {
            signal: ctx.signal,
          });
          // A single travel coordinate moves the pivot relative to the fixed
          // socket. Even a tap shorter than a frame gets a short press stroke.
          const el = ctx.element,
            options = { signal: ctx.signal };
          let hovering = false,
            pressed = false,
            holdUntil = 0,
            travel = 0,
            last = performance.now();
          const begin = () => {
            if (pressed) return;
            pressed = true;
            holdUntil = performance.now() + 75;
            ctx.requestDraw();
          };
          const release = () => {
            pressed = false;
            ctx.requestDraw();
          };
          const leave = () => {
            hovering = false;
            pressed = false;
            holdUntil = 0;
            ctx.requestDraw();
          };
          el.addEventListener(
            "pointerenter",
            (e) => {
              hovering = e.pointerType !== "touch";
              ctx.requestDraw();
            },
            options,
          );
          el.addEventListener(
            "pointerleave",
            (e) => {
              if (e.pointerType === "touch") {
                hovering = false;
                release();
              } else leave();
            },
            options,
          );
          el.addEventListener(
            "pointerdown",
            (e) => {
              if (e.isPrimary && e.button === 0) begin();
            },
            options,
          );
          el.addEventListener("pointerup", release, options);
          el.addEventListener("pointercancel", leave, options);
          el.addEventListener(
            "keydown",
            (e) => {
              if (e.key === "Enter" || e.key === " ") begin();
            },
            options,
          );
          el.addEventListener(
            "keyup",
            (e) => {
              if (e.key === "Enter" || e.key === " ") release();
            },
            options,
          );
          el.addEventListener("focus", ctx.requestDraw, options);
          el.addEventListener("blur", leave, options);
          window.addEventListener("blur", leave, options);
          return {
            frame(frame) {
              const now = performance.now();
              const target =
                pressed || now < holdUntil ? 1 : hovering ? 0.46 : 0;
              // Limit idle time on the first frame of a new stroke.
              const dt = Math.min(now - last, 32);
              last = now;
              travel = reduce.matches
                ? target
                : target +
                  (travel - target) *
                    Math.exp(-dt / (target > travel ? 24 : 55));
              if (Math.abs(target - travel) < 0.002) travel = target;
              const { depth, gap } = previous.profile;
              parameters.set(40, travel * previous.stroke * (gap - depth));
              parameters.set(41, Number(el.matches(":focus-visible")));
              const { angle, active } = previous.pose(now, reduce.matches);
              if (active || travel !== target || now < holdUntil)
                ctx.requestDraw();
              const [x, y] = lighting.frame!(frame);
              return [x, y, angle];
            },
          };
        },
      },
      update(next) {
        if (next.profile !== previous.profile)
          stock(next.profile).forEach((v, i) => parameters.set(i, v));
        if (
          next.rimStrength !== previous.rimStrength ||
          next.sharpness !== previous.sharpness ||
          next.reflectionStrength !== previous.reflectionStrength
        )
          optical(next).forEach((v, i) => parameters.set(8 + i, v));
        const moved =
          previous.pose !== next.pose || previous.stroke !== next.stroke;
        previous = next;
        if (moved) return "draw";
      },
    };
  },
};
