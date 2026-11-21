import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1366, height: 860 }, reducedMotion: 'reduce' });
await p.goto('http://localhost:5173/cihan/afrika');
await p.waitForSelector('path.unit'); await p.waitForTimeout(800);
const pts = await p.$$eval('text.lbl', ts => ts.map(t => ({ id: t.dataset.key.slice(2), x: +t.getAttribute('x'), y: +t.getAttribute('y') })));
for (const q of pts.slice(0, 8)) {
  await p.mouse.move(q.x, q.y);
  console.log(q.id, q.x, q.y, await p.evaluate(({x,y}) => [document.querySelector('path.unit.hot')?.dataset.u, document.elementFromPoint(x,y)?.dataset?.u, document.querySelector('svg.map').getAttribute('class')], q));
}
await b.close();
