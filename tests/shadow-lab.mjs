import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5198','--strictPort'],{stdio:'pipe'});
let browser;
try{
 for(let i=0;i<40;i++){try{if((await fetch('http://127.0.0.1:5198')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:5198/?view=shadow-lab');
 await page.locator('.sl-card canvas').nth(19).waitFor();await page.waitForTimeout(800);
 assert.equal(await page.locator('[role=alert]').count(),0);
 await mkdir('test-results/shadow-lab',{recursive:true});await page.screenshot({path:'test-results/shadow-lab/default.png',fullPage:true});
 assert.equal(await page.locator('.sl-card canvas').count(),20);
 assert.equal(await page.locator('[data-specimen="Round token"]').count(),4);
 await page.mouse.move(20,20);await page.waitForTimeout(150);
 const leftImage=await page.locator('.sl-grid article').first().screenshot();
 // Move outside the previews: Surface's global pointer path must still update light.
 await page.mouse.move(1400,50);await page.waitForTimeout(150);
 assert.notDeepEqual(await page.locator('.sl-grid article').first().screenshot(),leftImage);
 const before=await page.locator('.sl-grid article').first().screenshot();
 await page.getByRole('button',{name:'Soft & lifted',exact:true}).click();await page.waitForTimeout(250);
 assert.notDeepEqual(await page.locator('.sl-grid article').first().screenshot(),before);
 await page.screenshot({path:'test-results/shadow-lab/soft.png',fullPage:true});
 await page.getByRole('checkbox',{name:'Shadows only'}).check();
 await page.getByRole('button',{name:'Same-position A/B',exact:true}).click();await page.waitForTimeout(250);
 assert.equal(await page.locator('.sl-card canvas').count(),5);
 await page.locator('.sl-ab').focus();await page.keyboard.press('1');await page.waitForTimeout(150);
 assert.match(await page.locator('.sl-ab footer h2').innerText(),/^A/);
 await page.keyboard.press('2');await page.waitForTimeout(150);assert.match(await page.locator('.sl-ab footer h2').innerText(),/^B/);
 for(let i=1;i<4;i++){await page.getByLabel('Candidate',{exact:true}).selectOption(String(i));await page.waitForTimeout(100);}
 await page.getByRole('button',{name:'Hard light',exact:true}).click();await page.waitForTimeout(150);
 await page.getByLabel('Card elevation',{exact:true}).fill('0');await page.waitForTimeout(150);
 await page.getByRole('button',{name:'Reset',exact:true}).click();await page.getByRole('button',{name:'Side by side',exact:true}).click();
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:'test-results/shadow-lab/mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('Shadow lab: 20 specimens, global pointer lighting, four shaders, presets, parameter changes, A/B, zero elevation, mobile, and GPU validation passed.');
}finally{await browser?.close();server.kill();}
