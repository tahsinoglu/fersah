import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage();
p.on('console', m => console.log('console', m.type(), m.text().slice(0,300)));
p.on('pageerror', e => console.log('pageerror', String(e).slice(0,500)));
await p.goto('http://localhost:5173/' + (process.argv[2]||'cihan'));
await p.waitForTimeout(4000);
console.log(await p.evaluate(() => document.querySelectorAll('path.unit').length));
await b.close();
