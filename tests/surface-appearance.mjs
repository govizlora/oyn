import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const base='http://127.0.0.1:5193';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5193','--strictPort'],{stdio:'pipe'});
let browser;
try{
 for(let i=0;i<80;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:900,height:700}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>{
  const stats=window.stats={buffers:0,pipelines:0,submits:0,parameterWrites:0,frameWrites:0,pointerListeners:0};
  const subscriptions=new Set();
  const add=window.addEventListener,remove=window.removeEventListener;
  window.addEventListener=function(type,listener,...args){if(type==='pointermove'){subscriptions.add(listener);stats.pointerListeners=subscriptions.size;}return add.call(this,type,listener,...args);};
  window.removeEventListener=function(type,listener,...args){if(type==='pointermove'){subscriptions.delete(listener);stats.pointerListeners=subscriptions.size;}return remove.call(this,type,listener,...args);};
  for(const [proto,name,key]of [[GPUDevice.prototype,'createBuffer','buffers'],[GPUDevice.prototype,'createRenderPipeline','pipelines'],[GPUQueue.prototype,'submit','submits']]){const original=proto[name];proto[name]=function(...args){stats[key]++;return original.apply(this,args);};}
  const write=GPUQueue.prototype.writeBuffer;GPUQueue.prototype.writeBuffer=function(buffer,...args){if(buffer.size===48)stats.frameWrites++;else if(buffer.size===112)stats.parameterWrites++;return write.call(this,buffer,...args);};
 });
 await page.goto(`${base}/tests/fixtures/surface-appearance.html`);await page.locator('#sample canvas').waitFor();
 const settle=()=>page.waitForTimeout(150);
 const state=()=>page.evaluate(()=>({stats:{...window.stats},creates:api.records.creates,disposes:api.records.disposes,last:api.records.frames.at(-1),errors:api.records.errors}));
 await settle();assert.equal((await state()).stats.pointerListeners,1);
 const size=()=>page.locator('canvas').evaluate(c=>[c.width,c.height]);
 const initialSize=await size();
 const initial=await state();await page.evaluate(()=>{window.firstCanvas=document.querySelector('canvas');api.rerender();});await settle();
 let current=await state();assert.equal(current.creates,initial.creates);assert.equal(current.stats.buffers,initial.stats.buffers);assert.equal(current.stats.submits,initial.stats.submits);
 await page.evaluate(()=>api.setProps({elevation:8,color:'#cc8844'}));await settle();current=await state();
 assert.equal(current.creates,initial.creates);assert.equal(current.stats.buffers,initial.stats.buffers);assert.equal(current.stats.pipelines,initial.stats.pipelines);assert.ok(current.stats.parameterWrites>initial.stats.parameterWrites);
 assert.equal(await page.evaluate(()=>window.firstCanvas===document.querySelector('canvas')),true);
 assert.deepEqual(await size(),initialSize,'Omitted maxElevation keeps initial budget when lowering');
 await page.evaluate(()=>api.setProps({elevation:32}));await settle();
 assert.deepEqual(await size(),initialSize,'Omitted maxElevation does not follow later elevation increases');
 await page.evaluate(()=>api.setProps({elevation:8,maxElevation:40}));await settle();
 assert.ok((await size())[0]>initialSize[0],'Explicit maximum can expand reserved space');

 const beforePointer=await state();await page.evaluate(()=>window.dispatchEvent(new PointerEvent('pointermove',{clientX:700,clientY:70})));await settle();current=await state();assert.equal(current.stats.parameterWrites,beforePointer.stats.parameterWrites);assert.ok(current.stats.frameWrites>beforePointer.stats.frameWrites);
 const hold=current.last;await page.evaluate(()=>{document.dispatchEvent(new PointerEvent('pointerout',{relatedTarget:null}));window.dispatchEvent(new Event('blur'));});await settle();assert.deepEqual((await state()).last,hold,'Default holds last position after leave/blur');
 await page.evaluate(()=>api.setProps({elevation:8,maxElevation:40,light:{position:{x:90,y:80},onLeave:'return',onBlur:'return'}}));await settle();
 await page.evaluate(()=>{window.dispatchEvent(new Event('focus'));window.dispatchEvent(new PointerEvent('pointermove',{clientX:650,clientY:100}));});await settle();const pointed=(await state()).last;
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await settle();const returned=(await state()).last;assert.notDeepEqual(returned,pointed);
 const expected=await page.locator('canvas').evaluate(c=>{const r=c.getBoundingClientRect();return [90-r.left,80-r.top];});assert.ok(Math.abs(returned[0]-expected[0])<.01&&Math.abs(returned[1]-expected[1])<.01);
 await page.evaluate(()=>{window.dispatchEvent(new Event('focus'));window.dispatchEvent(new PointerEvent('pointermove',{clientX:650,clientY:100}));document.dispatchEvent(new PointerEvent('pointerout',{relatedTarget:null}));});await settle();assert.deepEqual((await state()).last,returned,'Leave return is independent of focus');
 await page.evaluate(()=>api.setProps({elevation:8,maxElevation:40,light:{source:'fixed',position:{x:90,y:80}}}));await settle();assert.equal((await state()).stats.pointerListeners,0,'Fixed light never subscribes to pointer');
 const fixed=await state();await page.evaluate(()=>window.dispatchEvent(new PointerEvent('pointermove',{clientX:500,clientY:400})));await settle();assert.equal((await state()).stats.submits,fixed.stats.submits);
 await page.evaluate(()=>api.setMode('dark'));await settle();assert.equal((await state()).creates,initial.creates,'Theme updates existing appearance');
 await page.evaluate(()=>api.setAlternate(true));await settle();assert.ok((await state()).creates>initial.creates);
 const beforeTag=(await state()).creates;await page.evaluate(()=>api.setTag(true));await settle();assert.ok((await state()).creates>beforeTag,'New DOM target owns a new instance');
 await page.evaluate(()=>{window.boundNode=document.getElementById('sample');api.setAttached(false);});await settle();
 assert.equal(await page.locator('canvas').count(),0,'Ref detachment releases the surface');
 assert.equal(await page.evaluate(()=>document.getElementById('sample')===window.boundNode),true,'Ref detachment preserves the DOM');
 await page.evaluate(()=>api.setAttached(true));await page.locator('canvas').waitFor();await settle();
 assert.equal(await page.locator('canvas').count(),1,'Ref reattachment recreates the surface');
 await page.evaluate(()=>api.setQuiet(true));await settle();assert.equal((await state()).stats.pointerListeners,0,'No-input appearance has no implicit pointer subscription');const quiet=await state();await page.evaluate(()=>window.dispatchEvent(new PointerEvent('pointermove',{clientX:10,clientY:10})));await settle();assert.equal((await state()).stats.submits,quiet.stats.submits);
 await page.evaluate(()=>api.setMounted(false));await settle();assert.equal(await page.locator('canvas').count(),0);
 const final=await state();assert.equal(final.creates,final.disposes,'All instrumented instances disposed');assert.deepEqual(final.errors,[]);assert.deepEqual(errors,[]);
 const defaults=await page.evaluate(async()=>(await import('/packages/ceramic/src/index.ts')).ceramicDefaults);
 assert.deepEqual(defaults.light,{source:'pointer',position:{x:100,y:100},onLeave:'hold',onBlur:'hold',onHidden:'hold'});
 assert.equal('maxElevation' in defaults,false,'Maximum budget is derived per binding, not a fixed default');
 const inputChecks=await page.evaluate(async()=>{
  const {createInputs}=await import('/packages/surface/src/createInputs.ts');
  const service=createInputs(window),pointer=service.inputs.pointer;
  const initial=pointer.getSnapshot();let notifications=0;
  const a=pointer.subscribe(()=>notifications++),b=pointer.subscribe(()=>notifications++);
  const listenerCount=window.stats.pointerListeners;
  window.dispatchEvent(new PointerEvent('pointermove',{clientX:321,clientY:123}));
  window.dispatchEvent(new Event('blur'));document.dispatchEvent(new PointerEvent('pointerout',{relatedTarget:null}));
  const left=pointer.getSnapshot();
  Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));
  const hidden=pointer.getSnapshot();delete document.hidden;
  a();const afterOne=window.stats.pointerListeners;b();const afterBoth=window.stats.pointerListeners;
  service.dispose();return {initial,left,hidden,listenerCount,afterOne,afterBoth,notifications};
 });
 assert.equal(inputChecks.initial.position,null);assert.equal(inputChecks.listenerCount,1);assert.equal(inputChecks.afterOne,1);assert.equal(inputChecks.afterBoth,0);
 assert.deepEqual(inputChecks.left.position,{x:321,y:123});assert.equal(inputChecks.left.inside,false);assert.equal(inputChecks.left.focused,false);assert.equal(inputChecks.hidden.visible,false);assert.equal(inputChecks.notifications,8);
 await page.evaluate(()=>window.unmountSurface());
 console.log('PASS appearance API: StrictMode, stable instances/canvases/buffers, props/theme, shared lazy pointer, hold/return/fixed policy, no-input idle, target/appearance replacement and cleanup.');
}finally{await browser?.close();server.kill();}
