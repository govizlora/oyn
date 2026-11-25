import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Material } from 'oyn';
import { OynProvider, useMaterial } from 'oyn/react';
import type { ColorScheme } from 'oyn/materials/ceramic';
import { createCeramicMaterial } from 'oyn/materials/ceramic';

const shared = createCeramicMaterial();
const fixed = createCeramicMaterial({ colorScheme: 'dark' });
const view = (source: typeof shared): Material<{}> => ({ create: () => ({ ...source, update: undefined }) });
const sharedView = view(shared), fixedView = view(fixed);
function Sample({ id, mode, material = sharedView }: { id: string; mode: ColorScheme; material?: Material<{}> }) {
  const ref = useMaterial({ material, props: {} });
  return <div id={id} ref={ref} data-mode={mode} style={{ colorScheme: id === 'system' ? undefined : mode, width: 100, height: 60, margin: 20 }}>{id}</div>;
}
function App() {
  const [mode, setMode] = useState<ColorScheme>(() => matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const update = () => setMode(media.matches ? 'dark' : 'light');
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return <OynProvider>
    <Sample id="system" mode={mode} />
    <Sample id="fixed" mode={mode} material={fixedView} />
    <Sample id="light" mode="light" />
    <Sample id="dark" mode="dark" />
  </OynProvider>;
}
createRoot(document.getElementById('root')!).render(<App />);
