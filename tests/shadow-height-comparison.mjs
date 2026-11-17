import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5196','--strictPort'],{stdio:'pipe'});
let browser;
try{
 for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:5196')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:640,height:480},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:5196/tests/fixtures/surface.html');
 await page.evaluate(async()=>{
 const {labMaterial,initial,heightRules}=await import('/examples/atelier/src/shadow-lab-material.ts');const {createRenderer}=await import('/packages/surface/src/renderer.ts');const {createCeramicMaterial}=await import('/packages/ceramic/src/index.ts');
 for(let rule=0;rule<heightRules.length;rule++){
 const {heights,weights}=heightRules[rule];if(weights.some(w=>w<=0))throw Error('Nonpositive weight');
 const degree=1;
 if(heights.length!==6-rule)throw Error("Wrong layer count");
 for(let i=0;i<heights.length;i++){
 if(Math.abs(weights[i]-1/heights.length)>1e-12)throw Error("Unequal weights");
 if(i&&Math.abs(heights[i]-heights[i-1]-1/heights.length)>1e-12)throw Error("Nonuniform spacing");
 }
 for(let power=0;power<=degree;power++){
 const expected=heightRules[0].heights.reduce((sum,h)=>sum+h**power/6,0);
 const actual=heights.reduce((sum,h,i)=>sum+weights[i]*h**power,0);
 if(Math.abs(actual-expected)>1e-12)throw Error(`Rule ${rule}, moment ${power} mismatch`);
 }
 }
 document.body.innerHTML='';document.body.style.cssText='margin:0;background:#e8e8e8';const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;document.body.append(canvas);
 const renderer=await createRenderer(e=>{throw e;});let target;
 window.renderCase=async(kind,settings,light)=>{
 if(target)renderer.release(target);
 const indices={'six':0,'five':1,'four':2,'three':3,'production':2};
 let material=labMaterial(indices[kind],{...initial,...settings});
 if(kind==='production')material={...material,shader:createCeramicMaterial().shader};
 target=renderer.createTarget(canvas,material);renderer.draw([{target,material,frame:new Float32Array([640,480,...light,217,180,206,120,settings.radius??24,1,1,0])}]);
 await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
 };
 });
 await mkdir('test-results/shadow-heights',{recursive:true});const report=[];
 for(const [name,settings,light] of [
 ['raised-contact-off',{elevation:40,contact:0,strength:.25},[80,60]],
 ['raised-contact-on',{elevation:40,contact:.015,strength:.25},[80,60]],
 ['near-light',{elevation:40,contact:0,strength:.25},[290,170]],
 ['far-light',{elevation:40,contact:0,strength:.25},[-600,-500]],
 ['soft',{elevation:48,contact:0,strength:.22,lightSize:360},[80,60]],
 ]){
 const images={};for(const kind of ['six','five','four','three','production']){await page.evaluate(({kind,settings,light})=>window.renderCase(kind,settings,light),{kind,settings,light});const bytes=await page.locator('canvas').screenshot();images[kind]=PNG.sync.read(bytes);await writeFile(`test-results/shadow-heights/${name}-${kind}.png`,bytes);}
 assert.deepEqual(images.production.data,images.four.data,'Production must match approved uniform four-layer lab output');
 const metric=kind=>{const a=images.six.data,b=images[kind].data;let sum=0,max=0;for(let i=0;i<a.length;i+=4){const d=Math.abs(a[i]-b[i]);sum+=d;max=Math.max(max,d);}return {meanAbsoluteError:sum/(a.length/4),maxError:max};};
 report.push({name,five:metric('five'),four:metric('four'),three:metric('three')});
 }
 assert.deepEqual(errors,[]);await writeFile('test-results/shadow-heights/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser?.close();server.kill();}
