import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { bakedCeramic, decodeGeometry } from '@oyn/ceramic/baked';
import { bakeControl, controls } from '../tools/geometry/controls.mjs';
const bytes=await readFile('examples/atelier/public/geometries/controls/thumbDial.bin');
assert.deepEqual(bytes,bakeControl(controls.thumbDial),'Homepage profile is reproducible');
const geometry=decodeGeometry(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
const material=bakedCeramic(geometry,{elevation:12,maxElevation:24,mode:'light'});
const parameters=material.parameters,data=material.data;
material.setRotation(1.75);material.setElevation(3);
assert.equal(material.parameters,parameters);
assert.equal(material.data,data,'Pose updates never rebuild/reupload geometry');
assert.equal(parameters.get(8),3);assert.equal(parameters.get(9),1.75);
assert.throws(()=>material.setElevation(-1));
assert.throws(()=>material.setElevation(25));
assert.throws(()=>material.setRotation(Infinity));
assert.ok(material.shader.includes('lightCeramic(ceramicOptics(),ceramicGeometry(in)'));
assert.ok(!material.shader.includes('sphereCut')&&!material.shader.includes('heightAt'));
const base = process.env.BASE_URL ?? 'http://127.0.0.1:5194';
const server = process.env.BASE_URL
  ? null
  : spawn(
      process.execPath,
      [
        'node_modules/vite/bin/vite.js',
        'preview',
        '--host',
        '127.0.0.1',
        '--port',
        '5194',
        '--strictPort',
      ],
      { stdio: 'pipe' },
    );
let browser;
try {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    if (i === 59) throw Error('Preview did not start');
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.addInitScript(()=>{
    window.bakedStats={storage:0,uploads:0,shaders:[],pipelines:0};
    const buffers=new Set();
    const create=GPUDevice.prototype.createBuffer,write=GPUQueue.prototype.writeBuffer,shader=GPUDevice.prototype.createShaderModule,pipeline=GPUDevice.prototype.createRenderPipeline;
    GPUDevice.prototype.createBuffer=function(d){const b=create.call(this,d);if(d.usage&GPUBufferUsage.STORAGE){buffers.add(b);window.bakedStats.storage++;}return b;};
    GPUQueue.prototype.writeBuffer=function(b,...args){if(buffers.has(b))window.bakedStats.uploads++;return write.call(this,b,...args);};
    GPUDevice.prototype.createShaderModule=function(d){window.bakedStats.shaders.push(d.code);return shader.call(this,d);};
    GPUDevice.prototype.createRenderPipeline=function(d){window.bakedStats.pipelines++;return pipeline.call(this,d);};
  });
  await page.goto(base);
  await page.locator('.crown-cap canvas').waitFor();
  await page.mouse.move(350, 150);
  await page.waitForTimeout(700);
  const initial=await page.evaluate(()=>window.bakedStats);
  assert.equal(initial.storage,10,'All 22 controls share ten prebuilt profiles');
  assert.equal(initial.uploads,10,'Each profile is uploaded once');
  assert.equal(initial.pipelines,5,'Raised Ceramic, inset Ceramic, and one baked adapter');
  assert.ok(initial.shaders.some(s=>s.includes('var<storage,read> data')));
  assert.ok(initial.shaders.every(s=>!s.includes('sphereCut')&&!s.includes('cutVisibility')),'No old sculpted geometry evaluator is rendered');
  await mkdir('test-results/sculpted', { recursive: true });
  await page.screenshot({ path: 'test-results/sculpted/desktop.png' });
  const before = await page.locator('.dished-keys').screenshot();
  await page.mouse.move(1200, 850);
  await page.waitForTimeout(150);
  assert.notDeepEqual(
    await page.locator('.dished-keys').screenshot(),
    before,
    'Face lighting must follow the pointer',
  );
  await page.screenshot({ path: 'test-results/sculpted/alternate-light.png' });
  for (const name of [
    'Bridge switch',
    'Thumb switch',
    'Rocker 1',
    'Rocker 2',
    'Rocker 3',
  ]) {
    const control = page.getByRole('switch', { name, exact: true });
    const before = await control.getAttribute('aria-checked');
    await control.focus();
    await page.keyboard.press('Space');
    assert.notEqual(await control.getAttribute('aria-checked'), before);
  }
  for (const name of ['Graphite dished key', 'Dimple pad 2', 'Detent 4']) {
    const control = page.getByRole('button', { name, exact: true });
    await control.click();
    assert.equal(await control.getAttribute('aria-pressed'), 'true');
  }
  await page.waitForTimeout(200);
  const poseUploads=await page.evaluate(()=>window.bakedStats.uploads);
  for (const name of ['Thumb dial', 'Saddle fader', 'Pocket dial']) {
    const slider = page.getByRole('slider', { name });
    await slider.fill('75');
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await slider.inputValue(), '76');
  }
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(()=>window.bakedStats.uploads),poseUploads,'Dials and faders only change pose; no geometry uploads');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.mouse.move(30, 100);
  await page.waitForTimeout(300);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: 'test-results/sculpted/mobile.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Original ceramic studies' }).click();
  assert.match(page.url(), /study=1/);
  await page.locator('.composition canvas').first().waitFor();
  assert.deepEqual(errors, []);
  console.log(
    'Baked homepage: shared profiles, pose updates, no runtime cuts, light response, 9 control families, keyboard, mobile, and original study navigation passed.',
  );
} finally {
  await browser?.close();
  server?.kill();
}
