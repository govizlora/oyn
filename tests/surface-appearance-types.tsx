import { SurfaceProvider, useSurface, type Appearance } from '@oyn/surface';
import { ceramic, type CeramicProps } from '@oyn/ceramic';
const alternate:Appearance<{phase:number}>={create(){throw Error('type test only');}};
function Generic<P>(appearance:Appearance<P>,props:P){return useSurface({appearance,props});}
function Check(){
 const ref=useSurface({appearance:ceramic,props:{elevation:12,light:{onBlur:'return'}}});
 useSurface({appearance:alternate,props:{phase:2}});
 Generic(ceramic,{elevation:3} satisfies CeramicProps);
 // @ts-expect-error Unknown Ceramic prop.
 useSurface({appearance:ceramic,props:{phase:1}});
 // @ts-expect-error Numeric elevation required.
 useSurface({appearance:ceramic,props:{elevation:'high'}});
 // @ts-expect-error Appearance props are not interchangeable.
 useSurface({appearance:alternate,props:{elevation:3}});
 // @ts-expect-error Required appearance prop is missing.
 useSurface({appearance:alternate,props:{}});
 // @ts-expect-error Legacy material-only hook has been removed.
 useSurface({material:{}});
 // @ts-expect-error Ref composition belongs to the consumer, not useSurface.
 useSurface({appearance:ceramic,props:{}}, () => {});
 // @ts-expect-error Surface lifetime is controlled by DOM binding, not an enabled option.
 useSurface({appearance:ceramic,props:{},enabled:false});
 // @ts-expect-error Theme is an appearance prop, not a provider responsibility.
 const provider = <SurfaceProvider mode="dark"><div /></SurfaceProvider>;
 // @ts-expect-error Appearance no longer receives an ambient context.
 ceramic.create({}, {mode:'dark'});
 return <button ref={ref}/>;
}
