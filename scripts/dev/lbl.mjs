import { chromium, devices } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'] });
const p = await ctx.newPage();
await p.goto('http://localhost:5173/' + process.argv[2]);
await p.waitForSelector('path.unit'); await p.waitForTimeout(1500);
console.log(await p.evaluate(() => { const g=document.querySelector('.world').style.transform; return g + '\n' + [...document.querySelectorAll('text.lbl')].slice(0,12).map(e => `${e.textContent}:${e.classList.contains('lbl-hidden')?'H':'V'} x${e.getAttribute('x')} y${e.getAttribute('y')} fs${e.style.fontSize} w${(+e.dataset.w).toFixed(1)} h${(+e.dataset.h).toFixed(1)}`).join('\n')}));
await b.close();
