import { StrictMode, useLayoutEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SurfaceProvider, useSurface, type Appearance, type SurfaceBinding } from '@oyn/surface';
import type { ColorScheme } from '@oyn/ceramic';
import { ceramic, type CeramicProps } from '@oyn/ceramic';

const records = { creates:0, disposes:0, frames:[] as number[][], errors:[] as string[] };
const probe: Appearance<CeramicProps> = {
 create(props) {
  records.creates++;
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
  return {material,update:instance.update,dispose(){records.disposes++;instance.dispose?.();}};
 },
};
const other:Appearance<CeramicProps>={create:probe.create};
// No bind hook: a surface with no pointer consumer must not subscribe or redraw on it.
const inert:Appearance<{}>={create(){
 const source=ceramic.create({light:{source:'fixed'},colorScheme:'light'});
 return {material:{...source.material,bind:undefined},update(){}};
}};
function App(){
 const [attached,setAttached]=useState(true);
 const [props,setProps]=useState<CeramicProps>({elevation:16});
 const [colorScheme,setMode]=useState<ColorScheme>('light');
 const [mounted,setMounted]=useState(true),[alternate,setAlternate]=useState(false),[tag,setTag]=useState(false);
 const [quiet,setQuiet]=useState(false),[tick,setTick]=useState(0);
 useLayoutEffect(()=>{Object.assign(window,{api:{records,setAttached,setProps,setMode,setMounted,setAlternate,setTag,setQuiet,rerender:()=>setTick(t=>t+1)}});});
 return <SurfaceProvider onError={error=>records.errors.push(String(error))}>
  <span data-tick={tick}/>
  {mounted&&<Sample appearance={quiet?inert:alternate?other:probe} props={{...props, colorScheme}} attached={attached} tag={tag}/>}
 </SurfaceProvider>;
}
function Sample({appearance,props,attached,tag}:{appearance:Appearance<CeramicProps>;props:CeramicProps;attached:boolean;tag:boolean}){
 const surfaceRef=useSurface({appearance,props});
 const ref=attached?surfaceRef:undefined;
 return tag?<section id="sample" ref={ref} style={{width:240,height:140,borderRadius:24,margin:150}}/>:<div id="sample" ref={ref} style={{width:240,height:140,borderRadius:24,margin:150}}/>;
}
const root=createRoot(document.getElementById('root')!);
root.render(<StrictMode><App/></StrictMode>);
Object.assign(window,{unmountSurface:()=>root.unmount()});
