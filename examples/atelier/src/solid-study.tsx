import { loadGeometry } from './geometry-assets';
import { useEffect, useState } from 'react';
import { materialAppearance, useSurface } from '@oyn/surface';
import { bakedCeramic } from '@oyn/ceramic/baked';
import type { Material } from '@oyn/surface';
import './solid.css';
const specimens = [
 {name:'Spherical pocket',formula:'ROUNDED BOX − SPHERE',label:'Pocket depth'},
 {name:'Through-ring',formula:'CYLINDER − CYLINDER',label:'Aperture'},
 {name:'Open notch',formula:'ROUNDED BOX − CYLINDER',label:'Notch position'},
 {name:'Twin body',formula:'CYLINDER ∪ CYLINDER',label:'Separation'},
 {name:'Window key',formula:'ROUNDED BOX − ROUNDED BOX',label:'Window width'},
 {name:'Sectioned sphere',formula:'SPHERE ∩ BOX',label:'Section height'},
];
function BakedObject({material,label}:{material:Material;label:string}) {
 const ref=useSurface({appearance: materialAppearance, props: { material: material }});
 return <div className="solid-object" ref={ref} role="img" aria-label={label}/>;
}
function SolidSpecimen({ index }: { index: number }) {
  const spec = specimens[index];
  const [value, setValue] = useState(40),
    [cut, setCut] = useState(true);
  const [material,setMaterial]=useState<Material>();
  const [error,setError]=useState('');
  useEffect(()=>{
    let active=true;setError('');
    loadGeometry(`${index}-${cut ? value : 'primitive'}`).then(geometry=>{if(active)setMaterial(bakedCeramic(geometry));}).catch(error=>{if(active)setError(String(error));});
    return ()=>{active=false;};
  },[index,value,cut]);
  return (
    <article className="solid-tile">
      <header>
        <span>
          0{index + 1} / {spec.name}
        </span>
        <button
          aria-pressed={cut}
          onClick={() => setCut(!cut)}
          aria-label={`${spec.name} boolean operation`}
        >
          {cut ? 'BOOLEAN' : 'PRIMITIVE'}
        </button>
      </header>
      {material ? <BakedObject material={material} label={spec.formula}/> : <div className="solid-object" aria-label="Loading geometry"/>}
      {error && <p role="alert">{error}</p>}
      <div className="solid-formula">{spec.formula}</div>
      <label className="solid-adjust">
        <span>{spec.label}</span>
        <select value={value} onChange={e=>setValue(+e.target.value)} aria-label={spec.label}>
          <option value={0}>Shallow / small</option>
          <option value={40}>Balanced</option>
          <option value={100}>Deep / large</option>
        </select>
      </label>
    </article>
  );
}
export function SolidStudy({
  home,
  compare,
}: {
  home: () => void;
  compare: () => void;
}) {
  return (
    <section className="sculpture-page solid-page">
      <header className="sculpture-heading">
        <div>
          <a className="sculpture-logo" href="./">
            oyn
          </a>
          <span>GEOMETRY LAB / EXPERIMENTAL</span>
        </div>
        <div>
          <button onClick={compare}>Compare original card ↗</button>
          <button onClick={home}>Back to ceramic controls ↗</button>
        </div>
      </header>
      <div className="sculpture-title">
        <h1>
          One material. <em>Different matter.</em>
        </h1>
        <p>
          Primitives → offline bake → ceramic.
          <br />
          The same shape casts the shadow.
        </p>
      </div>
      <div className="solid-grid">
        {specimens.map((_, index) => (
          <SolidSpecimen key={index} index={index} />
        ))}
      </div>
      <footer className="sculpture-footer">
        <span>BAKED GEOMETRY · SHARED CERAMIC LIGHTING</span>
        <span>MOVE THE LIGHT · SELECT A PREBAKED CUT · COMPARE THE PRIMITIVE</span>
      </footer>
    </section>
  );
}
