import { type Appearance } from 'oyn';
import { OynProvider, useMaterial } from 'oyn/react';
import { ceramic, type CeramicProps } from 'oyn/materials/ceramic';
const alternate:Appearance<{phase:number}>={create(){throw Error('type test only');}};
function Generic<P>(appearance:Appearance<P>,props:P){return useMaterial({appearance,props});}
function Check(){
 const ref=useMaterial({appearance:ceramic,props:{elevation:12,light:{onBlur:'return'}}});
 useMaterial({appearance:alternate,props:{phase:2}});
 useMaterial({appearance:ceramic,props:{color:'#c0c0c0',colorScheme:'dark',lighting:'soft'}});
 // @ts-expect-error Theme palettes belong upstream.
 useMaterial({appearance:ceramic,props:{color:{light:'#fff',dark:'#000'}}});
 // @ts-expect-error Optical branches are not color schemes.
 useMaterial({appearance:ceramic,props:{lighting:'dark'}});
 // @ts-expect-error Removed parallel base-color control.
 useMaterial({appearance:ceramic,props:{lightSurface:192}});
 Generic(ceramic,{elevation:3} satisfies CeramicProps);
 // @ts-expect-error Animation curves belong to the consumer, not Ceramic.
 useMaterial({appearance:ceramic,props:{elevation:8,transition:'spring'}});
 // @ts-expect-error External MotionNumber values use bindMotion, not numeric props.
 useMaterial({appearance:ceramic,props:{elevation:{get:()=>8,on:()=>()=>{}}}});
 // @ts-expect-error GPU failure handling is not a Provider callback API.
 const errors = <OynProvider onError={()=>{}}><div /></OynProvider>;
 // @ts-expect-error Unknown Ceramic prop.
 useMaterial({appearance:ceramic,props:{phase:1}});
 // @ts-expect-error Numeric elevation required.
 useMaterial({appearance:ceramic,props:{elevation:'high'}});
 // @ts-expect-error Appearance props are not interchangeable.
 useMaterial({appearance:alternate,props:{elevation:3}});
 // @ts-expect-error Required appearance prop is missing.
 useMaterial({appearance:alternate,props:{}});
 // @ts-expect-error Legacy material-only hook has been removed.
 useMaterial({material:{}});
 // @ts-expect-error Ref composition belongs to the consumer, not useMaterial.
 useMaterial({appearance:ceramic,props:{}}, () => {});
 // @ts-expect-error Surface lifetime is controlled by DOM binding, not an enabled option.
 useMaterial({appearance:ceramic,props:{},enabled:false});
 // @ts-expect-error Theme is an appearance prop, not a provider responsibility.
 const provider = <OynProvider mode="dark"><div /></OynProvider>;
 // @ts-expect-error Appearance no longer receives an ambient context.
 ceramic.create({}, {colorScheme:'dark'});
 return <button ref={ref}/>;
}
