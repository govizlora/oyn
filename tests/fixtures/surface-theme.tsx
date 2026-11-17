import { createRoot } from 'react-dom/client';
import { materialAppearance, SurfaceProvider, useSurface, useSurfaceMode } from '@oyn/surface';
import { createCeramicMaterial } from '@oyn/ceramic';

const shared = createCeramicMaterial();
const fixed = createCeramicMaterial({ mode: 'dark' });
function Sample({ id, material = shared }: { id: string; material?: typeof shared }) {
  const mode = useSurfaceMode();
  const ref = useSurface({ appearance: materialAppearance, props: { material: material } });
  return <div id={id} ref={ref} data-mode={mode} style={{ width: 100, height: 60, margin: 20 }}>{id}</div>;
}
createRoot(document.getElementById('root')!).render(
  <SurfaceProvider>
    <Sample id="system" />
    <Sample id="fixed" material={fixed} />
    <SurfaceProvider mode="light"><Sample id="light" /></SurfaceProvider>
    <SurfaceProvider mode="dark"><Sample id="dark" /></SurfaceProvider>
  </SurfaceProvider>,
);
