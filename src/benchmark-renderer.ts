/// <reference types="@webgpu/types" />
import { ceramicWGSL } from './ceramic-benchmark.wgsl';
import { createCeramicMaterial } from '../packages/ceramic/src/index';
export type Mode = 'shared' | 'individual';
export type Theme = 'light' | 'dark';
export type Controls = { theme: Theme; running: boolean; autoScroll: boolean; lightSource: 'pointer' | 'auto' };
export type Metrics = { mode: Mode; theme: Theme; cards: number; canvases: number; gpuDevices: number; dpr: number; pixels: number; rgbaMiB: number; drawCalls: number; renderPasses: number; submissions: number; copies: number; frames: number; intervalP95: number; submitP50: number; submitP95: number };
const percentile = (a:number[],p:number)=>[...a].sort((a,b)=>a-b)[Math.floor((a.length-1)*p)]||0;

// One lifecycle and frame scheduler; only target selection/draw ranges differ.
export function createBenchmark(stage:HTMLElement, mode:Mode, dpr:number, controls:()=>Controls, report:(stats:Metrics)=>void, fail:(message:string)=>void) {
  let disposed=false, raf=0, device:GPUDevice|undefined;
  const buffers:GPUBuffer[]=[], targets:{canvas:HTMLCanvasElement;context:GPUCanvasContext}[]=[];
  let pointer={x:innerWidth/2,y:100};
  const move=(event:PointerEvent)=>{pointer={x:event.clientX,y:event.clientY};};
  function dispose(){
    if(disposed)return;disposed=true;cancelAnimationFrame(raf);window.removeEventListener('pointermove',move);
    for(const {canvas,context} of targets){context.unconfigure();canvas.remove();canvas.width=canvas.height=0;}
    buffers.forEach(b=>b.destroy());device?.destroy();
  }
  function error(reason:unknown){if(disposed)return;const message=String(reason);dispose();fail(message);}
  async function initialize(){
    if(!navigator.gpu)throw Error('WebGPU unavailable; use a supported browser on localhost/HTTPS.');
    const materials={light:createCeramicMaterial({colorScheme:'light',elevation:6}),dark:createCeramicMaterial({colorScheme:'dark',elevation:6})};
    const pad=80; // Preserve the historical benchmark workload; package bounds are adaptive.
    const cards=[...stage.querySelectorAll<HTMLElement>('article')];
    const rects=cards.map(c=>[c.offsetLeft,c.offsetTop,c.offsetWidth,c.offsetHeight]);
    const tileWidth=rects[0][2]+pad*2,tileHeight=rects[0][3]+pad*2;
    const width=mode==='shared'?stage.clientWidth:tileWidth,height=mode==='shared'?stage.clientHeight:tileHeight;
    const w=Math.round(width*dpr),h=Math.round(height*dpr);
    const adapter=await navigator.gpu.requestAdapter();if(disposed)return;
    if(!adapter)throw Error('WebGPU adapter unavailable');
    const required=Math.max(w,h);
    if(required>adapter.limits.maxTextureDimension2D)throw Error(`Canvas ${w} × ${h} exceeds WebGPU texture limit ${adapter.limits.maxTextureDimension2D}.`);
    device=await adapter.requestDevice({requiredLimits:{maxTextureDimension2D:Math.max(8192,required)}});
    if(disposed){device.destroy();return;}
    device.lost.then(info=>{if(!disposed)error(`WebGPU device lost: ${info.message}`);});
    device.addEventListener('uncapturederror',event=>error(event.error.message));
    device.pushErrorScope('validation');
    const module=device.createShaderModule({code:ceramicWGSL});
    const compilation=await module.getCompilationInfo();if(disposed)return;
    const errors=compilation.messages.filter(m=>m.type==='error');if(errors.length)throw Error(errors.map(m=>m.message).join('\n'));
    const uniform=device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    const instances=device.createBuffer({size:rects.length*16,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});
    buffers.push(uniform,instances);device.queue.writeBuffer(instances,0,new Float32Array(rects.flat()));
    const layout=device.createBindGroupLayout({entries:[
      {binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}},
      {binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:'read-only-storage'}},
    ]});
    const bind=device.createBindGroup({layout,entries:[{binding:0,resource:{buffer:uniform}},{binding:1,resource:{buffer:instances}}]});
    const pipelineLayout=device.createPipelineLayout({bindGroupLayouts:[layout]});
    const format=navigator.gpu.getPreferredCanvasFormat();
    const blend:GPUBlendState={color:{srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha'}};
    const pipelines=await Promise.all(['shadow','surface'].map(entryPoint=>device!.createRenderPipelineAsync({
      layout:pipelineLayout,vertex:{module,entryPoint:'vertex'},fragment:{module,entryPoint,targets:[{format,blend}]},primitive:{topology:'triangle-list'},
    })));
    if(disposed)return;
    const validation=await device.popErrorScope();if(validation)throw Error(validation.message);if(disposed)return;
    for(const host of mode==='shared'?[stage]:cards){
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.dataset.benchmarkCanvas='';canvas.setAttribute('aria-hidden','true');
      canvas.style.cssText=`position:absolute;pointer-events:none;left:${mode==='shared'?0:-pad}px;top:${mode==='shared'?0:-pad}px;width:${width}px;height:${height}px;z-index:-1`;
      const context=canvas.getContext('webgpu');if(!context)throw Error('WebGPU canvas unavailable');
      targets.push({canvas,context});context.configure({device,format,alphaMode:'premultiplied'});host.append(canvas);
    }
    window.addEventListener('pointermove',move);
    const pixels=w*h*targets.length;
    let frames=0,previous=0,published=0,started=0,wasRunning=false,previousSource=controls().lightSource,previousTheme:Theme|undefined;
    const intervals:number[]=[],submits:number[]=[];
    const data=new Float32Array([width,height,0,0,16,0,0,pad,0,0,0,mode==='individual'?1:0,0,0,0,0]);
    function applyMaterial(theme:Theme){
      const u=materials[theme].parameters.snapshot();
      data[5]=u[1];data[6]=u[2];data.set(u.slice(4,7),8);
      data[12]=u[8];data[13]=u[9];
    }
    function draw(now:number){
      if(disposed)return;
      try{
        const {running,autoScroll,lightSource,theme='light'}=controls();
        if(theme!==previousTheme)applyMaterial(theme);
        if(running!==wasRunning||lightSource!==previousSource||theme!==previousTheme){previous=0;published=0;started=now;frames=0;intervals.length=submits.length=0;wasRunning=running;previousSource=lightSource;previousTheme=theme;}
        if(running||frames===0){
          if(previous)intervals.push(now-previous);previous=now;
          const start=performance.now();
          if(running&&autoScroll)scrollTo(0,(1-Math.cos((now-started)/3000))/2*(document.documentElement.scrollHeight-innerHeight));
          const bounds=stage.getBoundingClientRect(),phase=(now-started)/1500;
          data[2]=lightSource==='pointer'?pointer.x-bounds.left:stage.clientWidth*(0.5+0.4*Math.sin(phase));
          data[3]=lightSource==='pointer'?pointer.y-bounds.top:stage.clientHeight*(0.5+0.45*Math.cos(phase*0.7));
          device!.queue.writeBuffer(uniform,0,data);
          const encoder=device!.createCommandEncoder();
          targets.forEach(({context},index)=>{
            const pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:[0,0,0,0]}]});
            pass.setBindGroup(0,bind);
            for(const pipeline of pipelines){pass.setPipeline(pipeline);pass.draw(6,mode==='shared'?cards.length:1,0,mode==='shared'?0:index);}
            pass.end();
          });
          device!.queue.submit([encoder.finish()]);
          submits.push(performance.now()-start);frames++;
          if(submits.length>120)submits.shift();if(intervals.length>120)intervals.shift();
        }
        if(now-published>1000||published===0){published=now;report({mode,theme,cards:cards.length,canvases:targets.length,gpuDevices:1,dpr,pixels,rgbaMiB:pixels*4/1048576,drawCalls:targets.length*2,renderPasses:targets.length,submissions:1,copies:0,frames,intervalP95:percentile(intervals,.95),submitP50:percentile(submits,.5),submitP95:percentile(submits,.95)});}
        raf=requestAnimationFrame(draw);
      }catch(reason){error(reason);}
    }
    raf=requestAnimationFrame(draw);
  }
  void initialize().catch(error);
  return {dispose};
}
