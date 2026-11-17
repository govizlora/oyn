import { useMemo, useState } from 'react';
import { materialAppearance, useSurface } from '@oyn/surface';
import { initial, labMaterial, methods, type Settings } from './shadow-lab-material';
import './shadow-lab.css';
const specimens = [
 {name:'Large sheet',width:206,height:120,lift:1,radius:1},
 {name:'Portrait',width:88,height:116,lift:.65,radius:.4},
 {name:'Round token',width:64,height:64,lift:.25,radius:0},
 {name:'Small note',width:112,height:72,lift:.4,radius:.35},
 {name:'Paper strip',width:170,height:34,lift:.125,radius:.2},
];
function Card({index,settings,specimen}:{index:number;settings:Settings;specimen:typeof specimens[number]}) {
 const elevation=settings.elevation*specimen.lift;
 const material=useMemo(()=>labMaterial(index,{...settings,elevation}),[index,settings,elevation]);
 const ref=useSurface({appearance: materialAppearance, props: { material: material }});
 return <div className="sl-specimen" data-specimen={specimen.name}><div className="sl-card" ref={ref} style={{width:specimen.width,height:specimen.height,borderRadius:specimen.radius===0?'50%':settings.radius*specimen.radius}}/><span>{specimen.name} · {elevation.toFixed(1)} px</span></div>;
}
function Specimens({index,settings}:{index:number;settings:Settings}){return <div className="sl-stage">{specimens.map(specimen=><Card key={specimen.name} index={index} settings={settings} specimen={specimen}/>)}</div>;}
const sliders:[keyof Settings,string,number,number,number][]=[
 ['elevation','Card elevation',0,64,1],['radius','Corner radius',0,64,1],['lightHeight','Shadow light height',160,1000,10],['lightSize','Light size',0,480,5],['strength','Shadow opacity',0,1,.01],['contact','Contact darkening',0,.2,.005],['surfaceLight','Surface light height',1,240,1],['gloss','Surface highlight',0,5,.1],
];
export function ShadowLab(){
 const [settings,set]=useState<Settings>(initial);const [view,setView]=useState('grid');const [candidate,setCandidate]=useState(1);const [reference,setReference]=useState(false);
 const change=(key:keyof Settings,value:number|boolean|string)=>set(s=>({...s,[key]:value}));
 return <section className="shadow-lab">
 <header><a href="./">oyn / RESEARCH</a><span>EXPERIMENT 01 · SHADOWS</span></header>
 <div className="sl-intro"><h1>A collection of cards.<br/><em>Uniform shadows. Six to three.</em></h1><p>Find the simplest shadow worth keeping. Five sizes and elevations in every box. One global pointer light, unchanged Ceramic surface lighting.</p></div>
 <div className="sl-layout"><aside><div className="sl-controls-title"><h2>Shared scene</h2><button onClick={()=>set({...initial})}>Reset</button></div>
 <div className="sl-presets">{[['Original',initial],['Soft & lifted',{...initial,elevation:48,strength:.22,lightSize:360}],['Hard light',{...initial,lightSize:0,strength:.3,contact:0}],['Contact off',{...initial,contact:0}]].map(([name,value])=><button key={String(name)} onClick={()=>set({...value as Settings})}>{String(name)}</button>)}</div>
 {sliders.map(([key,label,min,max,step])=><label className="sl-slider" key={key}><span>{label}<output>{Number(settings[key]).toFixed(step<1?3:0)}</output></span><input aria-label={label} type="range" min={min} max={max} step={step} value={settings[key] as number} onChange={e=>change(key,+e.target.value)}/></label>)}
 <label className="sl-check">Card color <input aria-label="Card color" type="color" value={settings.color} onChange={e=>change('color',e.target.value)}/></label>
 <label className="sl-check"><input type="checkbox" checked={settings.shadowsOnly} onChange={e=>change('shadowsOnly',e.target.checked)}/> Shadows only</label>
 <p className="sl-note">Your pointer is the global light position, anywhere on the page. Each card responds to its actual distance and direction from the pointer. Card elevation sets the large sheet’s height; smaller pieces use proportional heights. All methods share the optional contact term. Cards do not cast shadows onto each other.</p>
 </aside><div className="sl-results"><div className="sl-toolbar"><div><button aria-pressed={view==='grid'} onClick={()=>setView('grid')}>Side by side</button><button aria-pressed={view==='compare'} onClick={()=>setView('compare')}>Same-position A/B</button></div><span>Live WebGPU · no ray marching</span></div>
 {view==='grid'?<div className="sl-grid">{methods.map(([title,description,cost],i)=><article key={title}><div className="sl-tile-heading"><span>0{i+1}</span><h2>{title}</h2>{i===0&&<b>REFERENCE</b>}{i===2&&<b>PRODUCTION</b>}</div><Specimens index={i} settings={settings}/><footer><code>{cost}</code><p>{description}</p></footer></article>)}</div>:<article className="sl-ab" tabIndex={0} onKeyDown={e=>{if(e.key==='1')setReference(true);if(e.key==='2')setReference(false);}}>
 <div className="sl-ab-controls"><label>Candidate <select aria-label="Candidate" value={candidate} onChange={e=>{setCandidate(+e.target.value);setReference(false);}}>{methods.slice(1).map(([name],i)=><option value={i+1} key={name}>{name}</option>)}</select></label><button onClick={()=>setReference(v=>!v)}>Switch A / B</button></div>
 <Specimens index={reference?0:candidate} settings={settings}/><footer><h2 aria-live="polite">{reference?'A · Uniform / 6 heights':`B · ${methods[candidate][0]}`}</h2><p>Focus this panel. Press 1 for baseline, 2 for candidate. Both occupy exactly the same pixels.</p></footer></article>}
 <div className="sl-footnote"><h2>One uniform rule. Four layer counts.</h2><p>Six, five, four and three equally weighted height samples. Every group uses uniform spacing and the same mean height (7H/12), projection, Gaussian coverage, surface lighting and contact darkening. Four layers are now used in production. The historical six-layer reference and the previous uniform three-layer positions are unchanged.</p><p>Sample height: H × [1/12 + (i + 1/2) / N], for i = 0 … N−1. Each sample carries weight 1/N. Compare at the same position using A/B, with contact darkening on and off. All previews use the global pointer light. Operation counts are not measured GPU speedups. Extreme shadows can be cropped by preview boundaries and the 240 px drawing margin.</p></div>
 </div></div></section>;
}
