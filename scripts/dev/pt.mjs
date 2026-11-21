import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1366, height: 860 } });
await p.goto('http://localhost:5173/cihan/' + process.argv[2]);
await p.waitForSelector('path.unit'); await p.waitForTimeout(1500);
for (const id of process.argv.slice(3)) {
console.log(await p.evaluate((id) => {
  const t = document.querySelector(`text[data-key="u:${id}"]`);
  const x = +t.getAttribute('x'), y = +t.getAttribute('y');
  const els = document.elementsFromPoint(x, y).slice(0,4).map(e => e.tagName + (e.dataset?.u ? ':' + e.dataset.u : '') + (e.className?.baseVal ? '.' + e.className.baseVal : (typeof e.className === 'string' ? '.' + e.className.slice(0,30) : '')));
  const c = document.querySelector(`.hits circle[data-u="${id}"]`);
  return id + ' ' + x + ',' + y + ' ' + els.join(' | ') + ' circle r=' + (c ? c.getAttribute('r') : 'none');
}, id));
}
await b.close();
