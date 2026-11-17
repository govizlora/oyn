import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { ceramicShadowWGSL } from '../packages/material-ceramic/dist/effects/shadow.js';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5199','--strictPort'],{stdio:'pipe'});
let browser;
try {
 for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:5199')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5199');
 const cases=[];for(const coverage of [0,.2,.5,1])for(const strength of [0,.09,.8,1])for(const contact of [0,.015,.4,1])cases.push({coverage,strength,contact});
 const actual=await page.evaluate(async({kernel,cases})=>{
 const adapter=await navigator.gpu.requestAdapter();const device=await adapter.requestDevice();device.pushErrorScope('validation');
 const code=`var<private> coverage:f32;
 fn geometryShadowCoverage(p:vec2f,s:f32,b:f32,h:f32)->f32{return coverage;}
 fn geometryShadowDistance(p:vec2f)->f32{return 0.0;}
 ${kernel}
 @group(0) @binding(0) var<storage,read_write> result:array<f32>;
 @compute @workgroup_size(1) fn main(){${cases.map((c,i)=>`coverage=${c.coverage.toFixed(5)};result[${i}]=ceramicShadow(vec2f(0),vec2f(100),1.0,vec4f(480,240,${c.strength.toFixed(5)},${c.contact.toFixed(5)})).a;`).join('\n')}}`;
 const module=device.createShaderModule({code});const pipeline=device.createComputePipeline({layout:'auto',compute:{module,entryPoint:'main'}});
 const size=cases.length*4;const output=device.createBuffer({size,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC});const read=device.createBuffer({size,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
 const bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:output}}]});const encoder=device.createCommandEncoder();const pass=encoder.beginComputePass();pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.dispatchWorkgroups(1);pass.end();encoder.copyBufferToBuffer(output,0,read,0,size);device.queue.submit([encoder.finish()]);
 const error=await device.popErrorScope();if(error)throw Error(error.message);await read.mapAsync(GPUMapMode.READ);const values=[...new Float32Array(read.getMappedRange())];read.unmap();device.destroy();return values;
 },{kernel:ceramicShadowWGSL,cases});
 cases.forEach((c,i)=>{const p=c.coverage*c.strength;assert.ok(Math.abs(actual[i]-(p+c.contact*(1-p)))<1e-6,JSON.stringify(c));assert.ok(actual[i]>=0&&actual[i]<=1+1e-6);});
 console.log(`Passed ${cases.length} GPU contact-composition cases, including unshadowed edges at full shadow strength.`);
}finally{await browser?.close();server.kill();}
