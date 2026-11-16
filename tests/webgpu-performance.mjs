import { chromium, firefox } from 'playwright';
import { mkdir,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { BENCHMARK } from '../src/benchmark-config.ts';
const {cards:count,dpr}=BENCHMARK;
const base=process.env.BASE_URL||'http://127.0.0.1:5178';
const smoke=process.env.SMOKE==='1';
const themes=process.env.THEMES?.split(',')||(smoke?['light','dark']:['light']);
await mkdir('test-results/webgpu',{recursive:true});
const browserName=process.env.BROWSER||'chrome';
assert.ok(['chrome','firefox'].includes(browserName));
const browser=browserName==='firefox'?await firefox.launch({headless:true}):await chromium.launch({channel:'chrome',headless:true,args:['--window-size=1440,1000']});
const info=browserName==='chrome'?await(await browser.newBrowserCDPSession()).send('SystemInfo.getInfo'):null;
const result={date:new Date().toISOString(),browserName,browser:browser.version(),gpu:info?.gpu.devices??null,features:info?.gpu.featureStatus??null,viewport:{width:1440,height:900},warmupMs:5000,sampleMs:12000,runs:[]};
const pct=(a,p)=>a.slice().sort((a,b)=>a-b)[Math.floor((a.length-1)*p)]||0;
try{
for(let round=0;round<(smoke?1:2);round++)for(const theme of themes)for(const mode of(round%2?['individual','shared']:['shared','individual'])){
 const page=await browser.newPage({viewport:result.viewport,deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>{
  window.probe={record:false,frames:[],draws:0,passes:0,submits:0,devices:0,pipelines:0,configs:0,copies:0,instances:0,longtaskSupported:PerformanceObserver.supportedEntryTypes.includes('longtask'),longtasks:[]};
  const p=window.probe;
  for(const [proto,key,counter]of[[GPUDevice.prototype,'createRenderPipelineAsync','pipelines'],[GPUAdapter.prototype,'requestDevice','devices'],[GPUCanvasContext.prototype,'configure','configs'],[GPUCommandEncoder.prototype,'beginRenderPass','passes'],[GPUQueue.prototype,'submit','submits'],[GPUCommandEncoder.prototype,'copyTextureToTexture','copies'],[CanvasRenderingContext2D.prototype,'drawImage','copies']]){
   const orig=proto[key];proto[key]=function(...a){p[counter]++;return orig.apply(this,a);};
  }
  const origDraw=GPURenderPassEncoder.prototype.draw;
  GPURenderPassEncoder.prototype.draw=function(...a){p.draws++;p.instances+=a[1]??1;return origDraw.apply(this,a);};
  if(p.longtaskSupported)new PerformanceObserver(l=>{if(p.record)p.longtasks.push(...l.getEntries().map(x=>x.duration));}).observe({type:'longtask',buffered:true});
  const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>raf(t=>{const d=p.draws,s=p.submits,b=p.passes,i=p.instances,c=p.copies,start=performance.now();fn(t);if(p.record&&p.submits>s)p.frames.push({t,ms:performance.now()-start,draws:p.draws-d,passes:p.passes-b,submits:p.submits-s,instances:p.instances-i,copies:p.copies-c});});
 });
 await page.goto(`${base}/?mode=${mode}&theme=${theme}&paused=1`);
 await page.waitForFunction(()=>document.querySelector('#benchmark-data')?.textContent||document.querySelector('[role=alert]'),{},{timeout:60000});
 const alert=await page.getByRole('alert').count();
 if(alert){
  const error=await page.getByRole('alert').innerText();
  assert.equal(mode,'shared');assert.match(error,/exceeds WebGPU texture limit/);
  assert.equal(await page.locator('canvas').count(),0);
  const probe=await page.evaluate(()=>window.probe);assert.equal(probe.devices,0);assert.equal(probe.submits,0);
  result.runs.push({round,theme,count,dpr,mode,unsupported:error});console.log('UNSUPPORTED',theme,mode,error);
  await writeFile(`test-results/webgpu/${smoke?`smoke-${browserName}`:`performance-${browserName}-${themes.join('-')}`}.json`,JSON.stringify(result,null,2));
  await page.close();continue;
 }
 const initial=await page.evaluate(()=>({metrics:JSON.parse(document.querySelector('#benchmark-data').textContent),probe:window.probe}));
 assert.equal(initial.metrics.cards,count);assert.equal(initial.metrics.dpr,dpr);assert.equal(initial.metrics.theme,theme);assert.equal(initial.probe.pipelines,2);assert.equal(initial.probe.devices,1);assert.equal(initial.probe.configs,mode==='shared'?1:count);assert.equal(initial.probe.draws,mode==='shared'?2:2*count);assert.equal(initial.probe.instances,2*count);assert.equal(initial.probe.submits,1);assert.equal(initial.probe.copies,0);
 await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>window.probe.submits),1);
 await page.locator('article').last().getByRole('button').click();
 assert.equal(await page.locator('article').last().getByRole('button').textContent(),'Clicked ✓');
 if(!smoke){
  await page.getByLabel('Light source',{exact:true}).selectOption('auto');await page.getByLabel('Continuous lighting redraw').check();await page.getByLabel('Auto scroll').check();
  await page.waitForTimeout(result.warmupMs);await page.evaluate(()=>window.probe.record=true);await page.waitForTimeout(result.sampleMs);
  const raw=await page.evaluate(()=>{window.probe.record=false;return{probe:window.probe,metrics:JSON.parse(document.querySelector('#benchmark-data').textContent),visibility:document.visibilityState,error:document.querySelector('[role=alert]')?.textContent};});
  assert.equal(raw.visibility,'visible');assert.equal(raw.error,undefined);
  const frames=raw.probe.frames,intervals=frames.slice(1).map((f,i)=>f.t-frames[i].t);
  assert.ok(frames.length>20);for(const f of frames){assert.equal(f.draws,mode==='shared'?2:2*count);assert.equal(f.instances,2*count);assert.equal(f.submits,1);assert.equal(f.copies,0);}
  const run={round,theme,count,dpr,mode,frames:frames.length,fps:(frames.length-1)*1000/(frames.at(-1).t-frames[0].t),intervalP50:pct(intervals,.5),intervalP95:pct(intervals,.95),submitP50:pct(frames.map(f=>f.ms),.5),submitP95:pct(frames.map(f=>f.ms),.95),over33ms:intervals.filter(x=>x>33.4).length/intervals.length,longtaskSupported:raw.probe.longtaskSupported,longtasks:raw.probe.longtasks,metrics:raw.metrics};
  result.runs.push(run);console.log(JSON.stringify(run));
  await writeFile(`test-results/webgpu/raw-${browserName}-${theme}-${round}-${count}-${dpr}-${mode}.json`,JSON.stringify(raw));
 }else{result.runs.push({theme,count,dpr,mode,initial});
  for(const next of [theme==='light'?'dark':'light',theme]){
   await page.getByLabel('Appearance',{exact:true}).selectOption(next);
   await page.waitForFunction(theme=>JSON.parse(document.querySelector('#benchmark-data').textContent).theme===theme,next);
   assert.equal(await page.locator('html').getAttribute('data-theme'),next);
   assert.ok((await page.locator('nav a').first().getAttribute('href')).includes(`theme=${next}`));
  }
  const final=await page.evaluate(()=>window.probe);
  assert.equal(final.devices,1);assert.equal(final.pipelines,2);assert.equal(final.configs,initial.probe.configs);assert.equal(final.submits,3);assert.equal(final.copies,0);
  console.log('PASS',theme,mode,count,dpr,'+ live theme switches');}
 await page.screenshot({path:`test-results/webgpu/${browserName}-${theme}-${mode}-${count}-${dpr}.png`});assert.deepEqual(errors,[]);await page.close();
 await writeFile(`test-results/webgpu/${smoke?`smoke-${browserName}`:`performance-${browserName}-${themes.join('-')}`}.json`,JSON.stringify(result,null,2));
}
}finally{await browser.close();}
