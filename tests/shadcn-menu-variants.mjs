import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 700, height: 600 } });
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  const base = 'http://127.0.0.1:5176';
  await page.context().grantPermissions(['local-network-access'], { origin: base });
  // Import exactly the same Vite module identities as the real components.
  const main = await (await page.request.get(base + '/src/main.tsx')).text();
  const select = await (await page.request.get(base + '/src/ceramic/select.tsx')).text();
  const react = main.match(/from "([^"]*\/react\.js[^"]*)"/)[1];
  const dom = main.match(/from "([^"]*\/react-dom_client\.js[^"]*)"/)[1];
  const surface = select.match(/import \{ useMaterial \} from "([^"]*)"/)[1];
  await page.route('**/__menu-fixture', route => route.fulfill({ contentType: 'text/html', body: `
    <html><body><div id="root"></div><script type="module">
    import React from '${react}';
    import ReactDOM from '${dom}';
    import { OynProvider } from '${surface}';
    import * as D from '/src/ceramic/dropdown-menu.tsx';
    import * as S from '/src/ceramic/select.tsx';
    import '/src/style.css';
    const h = React.createElement;
    function Fixture() {
      const [choice,setChoice] = React.useState('one');
      return h(OynProvider,{},h('main',{style:{padding:50,display:'flex',gap:24}},
        h(D.DropdownMenu,null,
          h(D.DropdownMenuTrigger,null,'Variants'),
          h(D.DropdownMenuContent,{ref:node=>{window.menuRef=node}},
            h(D.DropdownMenuItem,{disabled:true},'Disabled action'),
            h(D.DropdownMenuItem,{onSelect:event=>{event.preventDefault();window.selected=(window.selected||0)+1}},'Keep open'),
            h(D.DropdownMenuRadioGroup,{value:choice,onValueChange:setChoice},
              h(D.DropdownMenuRadioItem,{value:'one'},'One'),
              h(D.DropdownMenuRadioItem,{value:'two'},'Two')),
            h(D.DropdownMenuSub,null,
              h(D.DropdownMenuSubTrigger,null,'More choices'),
              h(D.DropdownMenuSubContent,null,h(D.DropdownMenuItem,null,'Nested action'))),
            ...Array.from({length:40},(_,i)=>h(D.DropdownMenuItem,{key:i},'Action '+i)))),
        h(S.Select,{defaultValue:'0'},
          h(S.SelectTrigger,{'aria-label':'Long select'},h(S.SelectValue)),
          h(S.SelectContent,null,...Array.from({length:50},(_,i)=>h(S.SelectItem,{key:i,value:String(i),disabled:i===1},'Option '+i))))));
    }
    ReactDOM.createRoot(document.getElementById('root')).render(h(Fixture));
    </script></body></html>` }));
  await page.goto(base + '/__menu-fixture');
  await page.getByRole('button', { name: 'Variants' }).click();
  const rootMenu = page.locator('[data-slot=dropdown-menu-content]');
  await rootMenu.locator(':scope > [data-oyn-layer] canvas').waitFor();
  assert.ok(await page.evaluate(() => window.menuRef === document.querySelector('[data-slot=dropdown-menu-content]')));
  assert.ok(await rootMenu.locator('[data-menu-scroll]').evaluate(el => el.scrollHeight > el.clientHeight), 'long menu scrolls inside the card');
  const disabled = page.getByRole('menuitem', { name: 'Disabled action' });
  await disabled.dispatchEvent('pointerenter');
  await page.waitForTimeout(100);
  assert.equal(await disabled.getAttribute('data-surface-elevation'), null);
  await page.getByRole('menuitem', { name: 'Keep open' }).click();
  assert.equal(await page.evaluate(() => window.selected), 1);
  assert.ok(await rootMenu.isVisible(), 'consumer onSelect prevention preserved');
  await page.getByRole('menuitemradio', { name: 'Two', exact: true }).click();
  await rootMenu.waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Variants' }).click();
  assert.equal(await page.getByRole('menuitemradio', { name: 'Two', exact: true }).getAttribute('aria-checked'), 'true');
  await page.getByRole('menuitem', { name: 'More choices' }).hover();
  const nested = page.getByRole('menuitem', { name: 'Nested action' });
  await nested.waitFor();
  await nested.hover();
  await page.waitForTimeout(650);
  assert.equal(await nested.getAttribute('data-surface-elevation'), '-4');
  assert.equal(await rootMenu.locator('[data-slot=dropdown-menu-sub-content]').count(), 0, 'submenu is portaled outside parent scroll clipping');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.getByRole('combobox', { name: 'Long select' }).click();
  const list = page.getByRole('listbox');
  await list.locator(':scope > [data-oyn-layer] canvas').waitFor();
  await page.keyboard.press('Home');
  await page.waitForTimeout(60);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(60);
  assert.match(await page.evaluate(() => document.activeElement.textContent), /Option 2/, 'disabled option is skipped');
  await page.keyboard.press('End');
  await page.waitForTimeout(650);
  const last = page.getByRole('option', { name: 'Option 49', exact: true });
  assert.equal(await last.getAttribute('data-surface-elevation'), '-4');
  const bounds = await last.boundingBox();
  assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 600, 'last option scrolls into the viewport');
  await page.keyboard.press('Enter');
  assert.match(await page.getByRole('combobox', { name: 'Long select' }).innerText(), /Option 49/);
  assert.deepEqual(errors, []);
  console.log('PASS: radio items, disabled items, consumer handlers/refs, nested popup portal and long-menu scrolling.');
} finally { await browser.close(); }
