import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createBenchmark, type Metrics, type Mode, type Theme } from './benchmark-renderer';
import './style.css';
import { BENCHMARK } from './benchmark-config';

const query = new URLSearchParams(location.search);
const mode: Mode = query.get('mode') === 'individual' ? 'individual' : 'shared';
const {cards:count,dpr}=BENCHMARK;
function link(next: Mode, theme: Theme) { return `/?mode=${next}&theme=${theme}`; }
function App() {
  const [theme,setTheme]=useState<Theme>(query.get('theme')==='dark'?'dark':'light');
  const stage=useRef<HTMLDivElement>(null);
  const [running,setRunning]=useState(query.get('paused') !== '1'), [autoScroll,setAutoScroll]=useState(false);
  const [lightSource,setLightSource]=useState<'pointer' | 'auto'>('pointer');
  const controls=useRef({running,autoScroll,lightSource,theme}); controls.current={running,autoScroll,lightSource,theme};
  const [stats,setStats]=useState<Metrics>(), [error,setError]=useState('');
  useEffect(() => {
    const engine=createBenchmark(stage.current!,mode,dpr,()=>controls.current,setStats,setError);
    return ()=>engine.dispose();
  },[]);
  useEffect(()=>{ document.title=`Canvas benchmark · ${mode}`; },[]);
  useEffect(()=>{document.documentElement.dataset.theme=theme;},[theme]);
  return <>
    <header>
      <strong>Oyn / Canvas benchmark</strong>
      <nav aria-label="Rendering mode"><a aria-current={mode==='shared'?'page':undefined} href={link('shared',theme)}>A · Single canvas / Instancing</a><a aria-current={mode==='individual'?'page':undefined} href={link('individual',theme)}>B · Multiple canvases / Direct drawing</a></nav>
      <span className="fixed-workload">Fixed {count} cards · DPR {dpr}×</span>
      <label>Appearance <select aria-label="Appearance" value={theme} onChange={e=>setTheme(e.target.value as Theme)}><option value="light">Light</option><option value="dark">Dark</option></select></label>
      <label>Light source <select aria-label="Light source" value={lightSource} onChange={e=>setLightSource(e.target.value as 'pointer' | 'auto')}><option value="pointer">Follow pointer</option><option value="auto">Automatic path (stress test)</option></select></label>
      <label><input type="checkbox" checked={running} onChange={e=>setRunning(e.target.checked)}/>Continuous lighting redraw</label>
      <label><input type="checkbox" checked={autoScroll} onChange={e=>setAutoScroll(e.target.checked)}/>Auto scroll</label>
    </header>
    <section className="intro">
      <h1>{mode==='shared'?'One full-content canvas':'One local canvas per card'}</h1>
      <p>Three fixed columns · {count} cards · {theme} Ceramic WGSL / lighting path / separate shadow and surface passes · Full drawing without visibility culling. Native page scrolling.</p>
      <p>{mode==='shared'?'One WebGPU canvas covers the full grid; one render pass and two instanced draws, with geometry covering only each card and its shadow.':'One shared GPUDevice and one WebGPU canvas per card; draw directly to each texture with one submission per frame and no intermediate copies.'}</p>
      <p>The light follows the pointer by default; automatic paths provide repeatable stress tests. Disabling continuous redraw freezes lighting to isolate native scrolling. DPR is fixed for comparison; oversized canvases report an explicit error rather than silently switching architectures.</p>
      <p className="warning">Timing measures wall-clock CPU encoding / submission calls, including possible waits, not GPU timers. Frame intervals include browser scheduling and cannot be attributed solely to shaders. Compare both pages on the same device, viewport, DPR, and settings.</p>
      {error && <p role="alert">{error}</p>}
    </section>
    <aside className="metrics" aria-label="Performance metrics"><strong>{mode==='shared'?'A / Shared':'B / Individual'}</strong>{stats && <>
      <span>{stats.canvases} display canvases · {stats.gpuDevices} GPUDevice</span>
      <span>{stats.drawCalls} draws / frame · {stats.copies} copies / frame</span>
      <span>{(stats.pixels/1e6).toFixed(2)} MP · Estimated single RGBA copy {stats.rgbaMiB.toFixed(1)} MiB</span>
      <span>Submission p50 / p95: {stats.submitP50.toFixed(2)} / {stats.submitP95.toFixed(2)} ms</span>
      <span>{stats.renderPasses} render passes · {stats.submissions} submit / frame</span>
      <span>Frame interval p95: {stats.intervalP95.toFixed(2)} ms · {stats.frames} frames</span>
      <small>Last 120 samples; memory is estimated as pixels × 4, not total GPU usage.</small>
    </>}</aside>
    <div className="stage" ref={stage} data-mode={mode}>
      {Array.from({length:count},(_,i)=><article key={i} data-card=""><span className="number">CERAMIC / {String(i+1).padStart(3,'0')}</span><h2>Surface {i+1}</h2><p>Identical shapes, lighting, and content.<br/>Only drawing and presentation paths differ.</p><button onClick={e=>{e.currentTarget.textContent='Clicked ✓';}}>Native button ↗</button></article>)}
    </div>
    <footer>This test page does not use Surface automatic owner/group logic or modify the shadcn demo. Cross-card shadow composition order differs by architecture; this experiment does not simulate shadows cast between objects.</footer>
    <output id="benchmark-data" hidden>{JSON.stringify(stats)}</output>
  </>;
}
createRoot(document.getElementById('root')!).render(<App/>);
