import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { BENCHMARK } from '../src/benchmark-config.ts';
const base=process.env.BASE_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
for(const scenario of ['cancel','loss','configure-error','pointer']){
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.route('**/lifecycle',r=>r.fulfill({contentType:'text/html',body:'<html><head><link rel="icon" href="data:,"></head><body></body></html>'}));
 await page.goto(`${base}/lifecycle`);
 await page.evaluate(async ({scenario,dpr})=>{
  window.errors=[];window.devices=0;window.destroyed=0;window.lastUniform=[];
  const req=GPUAdapter.prototype.requestDevice;GPUAdapter.prototype.requestDevice=async function(...a){const d=await req.apply(this,a);window.device=d;window.devices++;const destroy=d.destroy.bind(d);d.destroy=()=>{window.destroyed++;destroy();};return d;};
  const write=GPUQueue.prototype.writeBuffer;GPUQueue.prototype.writeBuffer=function(...a){if(a[2] instanceof Float32Array&&a[2].length===16)window.lastUniform=[...a[2]];return write.apply(this,a);};
  if(scenario==='configure-error')GPUCanvasContext.prototype.configure=function(){throw Error('injected configure failure');};
  const {createBenchmark}=await import('/src/benchmark-renderer.ts');
  const stage=document.createElement('div');stage.style.cssText='position:relative;width:1124px;height:2000px;margin:100px 40px';stage.innerHTML='<article style="position:absolute;left:80px;top:80px;width:300px;height:180px"></article>';document.body.append(stage);
  window.stage=stage;window.controls={theme:'light',running:scenario==='pointer',autoScroll:false,lightSource:'pointer'};
  window.engine=createBenchmark(stage,'individual',dpr,()=>window.controls,s=>window.stats=s,e=>window.errors.push(e));
  if(scenario==='cancel')window.engine.dispose();
 },{scenario,dpr:BENCHMARK.dpr});
 if(scenario==='cancel'){await page.waitForTimeout(500);assert.equal(await page.locator('canvas').count(),0);assert.equal(await page.evaluate(()=>window.devices),0);}
 else if(scenario==='configure-error'){await page.waitForFunction(()=>window.errors.length);assert.equal(await page.locator('canvas').count(),0);assert.equal(await page.evaluate(()=>window.destroyed),1);}
 else{
  await page.waitForFunction(()=>window.stats);
  if(scenario==='loss'){await page.evaluate(()=>window.device.destroy());await page.waitForFunction(()=>window.errors.length);assert.equal(await page.locator('canvas').count(),0);}
  else{
   await page.mouse.move(350,400);
   const verify=()=>page.waitForFunction(()=>{const b=window.stage.getBoundingClientRect();return Math.abs(window.lastUniform[2]-(350-b.left))<.1&&Math.abs(window.lastUniform[3]-(400-b.top))<.1;});
   await verify();await page.evaluate(()=>scrollTo(0,300));await verify();
   await page.evaluate(()=>window.engine.dispose());assert.equal(await page.locator('canvas').count(),0);
  }
 }
 console.log('PASS',scenario);await page.close();
}
}finally{await browser.close();}
