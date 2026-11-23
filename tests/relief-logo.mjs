// Run against the local Atelier server: node tests/relief-logo.mjs http://127.0.0.1:5177
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { PNG } from "pngjs";
const browser = await chromium.launch({channel:"chrome",headless:true});
const proofs = [];
try {
  for (const mode of ["gpu","gl","svg"]) {
    const page = await browser.newPage({viewport:{width:1000,height:650}});
    if (mode !== "gpu") await page.addInitScript(()=>Object.defineProperty(navigator,"gpu",{value:undefined}));
    if (mode === "svg") await page.addInitScript(()=>{
      const get=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(type,...args){
        return type==="webgl2"?null:get.call(this,type,...args);
      };
    });
    await page.goto(new URL("/relief-logo.html",process.argv[2]??"http://127.0.0.1:5177").href);
    const mark=page.getByRole("img",{name:"OYN"});
    await mark.locator("img").evaluate(img=>img.decode());
    if(mode!=="svg")await page.waitForSelector(".oyn-relief-logo[data-oyn-active]");
    assert.equal(await mark.locator("img").isVisible(),mode==="svg");
    const original=await mark.screenshot();proofs.push(PNG.sync.read(original));
    if(mode!=="svg"){
      await page.getByRole("slider").fill("90");
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      assert.ok(!original.equals(await mark.screenshot()));
    }
    await page.close();
  }
  const ref=proofs.pop();
  for(const proof of proofs){
    assert.equal(proof.width,ref.width);
    assert.equal(proof.height,ref.height);
    let difference=0;
    for(let i=0;i<ref.data.length;i+=4)difference+=Math.abs(ref.data[i]-proof.data[i]);
    assert.ok(difference/(ref.width*ref.height)<1,"Default lighting must match vector master");
  }
} finally {await browser.close();}
