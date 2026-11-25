import { StrictMode, Suspense, startTransition, useLayoutEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { type Appearance, type SurfaceBinding } from 'oyn';
import { OynProvider, useMaterial } from 'oyn/react';
import type { ColorScheme } from 'oyn/materials/ceramic';
import { ceramic, type CeramicProps } from 'oyn/materials/ceramic';

const records = { failUpdate:false, creates:0, disposes:0, createdElevations:[] as (number | undefined)[], updatedElevations:[] as (number | undefined)[], frames:[] as number[][], errors:[] as string[] };
const probe: Appearance<CeramicProps> = {
 create(props) {
  records.creates++;
  records.createdElevations.push(props.elevation);
  const instance=ceramic.create(props);
  const cache=new Map<NonNullable<typeof instance.material.bind>,NonNullable<typeof instance.material.bind>>();
  const material={...instance.material,
   get shader(){return instance.material.shader;}, get passes(){return instance.material.passes;},measurePadding:(w:number,h:number)=>instance.material.measurePadding(w,h),
   get bind(){
    const original=instance.material.bind!;
    if(!cache.has(original))cache.set(original,ctx=>{
     const binding=original(ctx);
     return {...binding,frame(frame){const extras=binding.frame!(frame);records.frames.push([...extras]);return extras;}} satisfies SurfaceBinding;
    });
    return cache.get(original)!;
   },
  };
  return {material,update(next){if(records.failUpdate) throw Error('test appearance failure');records.updatedElevations.push(next.elevation);return instance.update(next);},dispose(){records.disposes++;instance.dispose?.();}};
 },
};
const other:Appearance<CeramicProps>={create:probe.create};
// No bind hook: a surface with no pointer consumer must not subscribe or redraw on it.
const inert:Appearance<{}>={create(){
 const source=ceramic.create({light:{source:'fixed'},colorScheme:'light'});
 return {material:{...source.material,bind:undefined},update(){}};
}};
const pending = new Promise<never>(()=>{});
function App(){
 const [suspended,setSuspended]=useState(false);
 const [attached,setAttached]=useState(true);
 const [props,setProps]=useState<CeramicProps>({elevation:16});
 const [colorScheme,setMode]=useState<ColorScheme>('light');
 const [mounted,setMounted]=useState(true),[alternate,setAlternate]=useState(false),[tag,setTag]=useState(false);
 const [quiet,setQuiet]=useState(false),[tick,setTick]=useState(0);
 useLayoutEffect(()=>{Object.assign(window,{api:{records,prepare:()=>startTransition(()=>{setProps({elevation:77});setSuspended(true);}),cancel:()=>{setProps({elevation:16});setSuspended(false);},setAttached,setProps,setMode,setMounted,setAlternate,setTag,setQuiet,rerender:()=>setTick(t=>t+1)}});});
 return <OynProvider>
  <span data-tick={tick}/>
  <Suspense fallback={null}>{mounted&&<Sample suspended={suspended} appearance={quiet?inert:alternate?other:probe} props={{...props, colorScheme}} attached={attached} tag={tag}/>}</Suspense>
 </OynProvider>;
}
function Sample({appearance,props,attached,tag,suspended}:{suspended:boolean;appearance:Appearance<CeramicProps>;props:CeramicProps;attached:boolean;tag:boolean}){
 const surfaceRef=useMaterial({appearance,props});
 if(suspended) throw pending;
 const ref=attached?surfaceRef:undefined;
 return tag?<section id="sample" ref={ref} style={{width:240,height:140,borderRadius:24,margin:150}}/>:<div id="sample" ref={ref} style={{width:240,height:140,borderRadius:24,margin:150}}/>;
}
const root=createRoot(document.getElementById('root')!);
root.render(<StrictMode><App/></StrictMode>);
Object.assign(window,{unmountSurface:()=>root.unmount()});
