import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { materialAppearance } from 'oyn';
import { OynProvider, useMaterial } from 'oyn/react';
import type { ColorScheme } from 'oyn/materials/ceramic';
import { createCeramicMaterial } from 'oyn/materials/ceramic';

const shared = createCeramicMaterial();
const fixed = createCeramicMaterial({ colorScheme: 'dark' });
function Sample({ id, mode, material = shared }: { id: string; mode: ColorScheme; material?: typeof shared }) {
  const ref = useMaterial({ appearance: materialAppearance, props: { material } });
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
    <Sample id="fixed" mode={mode} material={fixed} />
    <Sample id="light" mode="light" />
    <Sample id="dark" mode="dark" />
  </OynProvider>;
}
createRoot(document.getElementById('root')!).render(<App />);
