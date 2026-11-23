// The editable master: one circular disc and three overlapping planes.
// A ridge knot is [x, y, dy/dx]. Cubic Hermite ⇔ SVG cubic Bézier exactly.
import { readFile, writeFile } from "node:fs/promises";
import { parseWgsl, validate, writeGlsl } from "naga-wasm";
const dir = new URL("../../packages/ui/src/relief/", import.meta.url);
const W=880,H=356;
const foot=[240,295]; // The relief fades into its support, without another ridge.
const planes=[
 {id:"sun", disc:[144,153,94], light:[84,64,202,241], tones:[219,245,227]},
 {id:"far-peak", top:[[28,284,-.12],[156,250,-.44],[230,166,-1.65],[323,52,0],[389,117,1.42],[458,158,0],[516,119,-.79],[578,112,.46],[628,209,1.85]],bottom:[[28,284,.03],[188,296,.06],[421,294,-.03],[628,281,-.1]], light:[249,60,325,290],tones:[205,232,254]},
 {id:"near-peak", top:[[347,235,-.6],[363,225,-.55],[399,245,0],[442,211,-1.5],[487,124,-1.87],[551,53,0],[602,95,1.32],[635,168,2.2]],bottom:[[347,235,2.24],[398,280,0],[468,270,-.25],[561,288,.13],[635,292,0]], light:[466,79,545,278],tones:[222,249,218]},
 {id:"arch",arch:[728,144,94,286],light:[635,83,771,276],tones:[208,239,251]},
];
const fmt=n=>+n.toFixed(5), v=a=>'vec2f('+a.map(fmt).join(',')+')';
const svgGrad=p=>`<linearGradient id="${p.id}-light" gradientUnits="userSpaceOnUse" x1="${p.light[0]}" y1="${p.light[1]}" x2="${p.light[2]}" y2="${p.light[3]}">${p.tones.map((c,i)=>'<stop offset="'+i/2+'" stop-color="#'+c.toString(16).repeat(3)+'"/>').join('')}</linearGradient>`;
function cubics(knots){return knots.slice(1).map(([x,y,m],i)=>{const [a,b,n]=knots[i],h=(x-a)/3;return 'C'+[a+h,b+n*h,x-h,y-m*h,x,y].map(fmt).join(' ')}).join(' ')}
function svgShape(p){
 const fill='id="'+p.id+'" fill="url(#'+p.id+'-light)"';
 if(p.disc){const [x,y,r]=p.disc;return `<circle ${fill} cx="${x}" cy="${y}" r="${r}"/>`}
 let d;if(p.arch){const [x,y,r,b]=p.arch;d=`M${x-r} ${b}V${y}a${r} ${r} 0 0 1 ${r*2} 0V${b}Z`;}
 else{const back=[...p.bottom].reverse();d='M'+p.top[0].slice(0,2).join(' ')+cubics(p.top)+'L'+back[0].slice(0,2).join(' ')+cubics(back)+'Z';}
 return `<path ${fill} d="${d}"/>`;
}
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="name"><title id="name">OYN — mountain relief</title>
<defs><linearGradient id="base-fade" gradientUnits="userSpaceOnUse" x1="0" y1="${foot[0]}" x2="0" y2="${foot[1]}"><stop stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient><mask id="ground"><rect width="100%" height="100%" fill="url(#base-fade)"/></mask>
${planes.map(svgGrad).join('\n')}</defs>
<g mask="url(#ground)">${planes.map(svgShape).join('\n')}</g>
</svg>\n`;
const functions=[];
function ridge(name,knots){
 let body='';
 for(let i=1;i<knots.length;i++){const [a,b,m]=knots[i-1],[x,y,n]=knots[i],dx=x-a;
 const expr=`hermite(clamp((x-${a})/${dx},0.0,1.0),${b},${y},${fmt(dx*m)},${fmt(dx*n)})`;
 body+=i===knots.length-1?'return '+expr+';':`if(x<${x}){return ${expr};}\n`;}
 functions.push(`fn ${name}(x:f32)->f32{${body}}`);return name+'(p.x)';
}
const compose=planes.map((s,i)=>{
 let d;
 if(s.disc)d=`length(p-${v(s.disc.slice(0,2))})-${s.disc[2]}`;
 else if(s.arch){const [x,y,r,b]=s.arch;d=`max(length(vec2f(p.x-${x},min(p.y-${y},0.0)))-${r},p.y-${b})`;}
 else d=`max(max(${s.top[0][0]}-p.x,p.x-${s.top.at(-1)[0]}),max(${ridge('top'+i,s.top)}-p.y,p.y-${ridge('bottom'+i,s.bottom)}))`;
 return `{let d=${d}; let aa=max(fwidth(d),0.001); let mask=clamp(0.5-d/aa,0.0,1.0);
 let a=${v(s.light.slice(0,2))};let b=${v(s.light.slice(2))};let axis=b-a;
 let t=clamp(0.5+dot(p-(a+b)*0.5,vec2f(axis.x*params.x-axis.y*params.y,axis.x*params.y+axis.y*params.x))/dot(axis,axis),0.0,1.0);
 let shade=(mix(${s.tones[0]}.0f,${s.tones[1]}.0f,min(t*2.0,1.0))+(${s.tones[2]}.0f-${s.tones[1]}.0f)*max(0.0,t*2.0-1.0))/255.0;
 ink=vec4f(vec3f(shade)*mask,mask)+ink*(1.0-mask);}`;
}).join('\n');
const shader=`
struct Frame { viewport:vec4f, rect:vec4f, geometry:vec4f, light:vec4f }
@group(0) @binding(0) var<uniform> frame:Frame;
@group(0) @binding(1) var<uniform> params:vec4f;
struct Out { @builtin(position) clip:vec4f, @location(0) local:vec2f }
@vertex fn vertex(@builtin(vertex_index) i:u32)->Out {
 let corners=array<vec2f,6>(vec2f(0,0),vec2f(1,0),vec2f(0,1),vec2f(0,1),vec2f(1,0),vec2f(1,1));
 let xy=corners[i]*frame.rect.zw;var out:Out;
 out.clip=vec4f(xy/frame.viewport.xy*vec2f(2,-2)+vec2f(-1,1),0,1);
 out.local=xy;return out;
}
fn hermite(t:f32,a:f32,b:f32,m:f32,n:f32)->f32{return a+(b-a)*t*t*(3.0-2.0*t)+m*t*(1.0-t)*(1.0-t)-n*t*t*(1.0-t);}
${functions.join('\n')}
@fragment fn relief(input:Out)->@location(0) vec4f {
 let p=(input.local-frame.rect.zw*0.5)/min(frame.rect.z/${W},frame.rect.w/${H})+vec2f(${W/2},${H/2});var ink=vec4f(0);
 ${compose}
 return ink * clamp((${foot[1]}-p.y)/${foot[1]-foot[0]},0.0,1.0);
}`;
const module=parseWgsl(shader),info=validate(module),blocks={};
function compile(stage,entryPoint){const result=writeGlsl(module,info,{version:"300 es",stage,entryPoint,reflect:true,flags:{adjustCoordinateSpace:false}});for(const [k,v] of Object.entries(result.reflection.uniforms))blocks[k]=v.binding;return result.code;}
const gpu={vertex:compile('vertex','vertex'),fragments:{relief:compile('fragment','relief')},blocks};
info.free();module.free();
const note='// Generated from tools/brand/relief.mjs; do not edit.\n';
for(const [name,contents] of Object.entries({'oyn-relief.svg':svg,'shader.ts':note+'export const shader = '+JSON.stringify(shader)+';\n','glsl.ts':note+'import {shader} from "./shader.js";\nexport default new Map([[shader,'+JSON.stringify(gpu)+']]);\n'})){
 const dest=new URL(name,dir);if(process.argv.includes('--check')){if(await readFile(dest,'utf8')!==contents)throw Error('Stale '+name);}else await writeFile(dest,contents);
}
