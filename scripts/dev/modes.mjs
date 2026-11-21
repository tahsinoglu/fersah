import { chromium, devices } from 'playwright';
const out = process.argv[2];
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'] });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type()==='error' && errs.push(m.text()));
const B = 'http://localhost:5173';
for (const [path, name] of [['/oyun/memleket/plaka/tum', 'plaka'], ['/oyun/cihan/bayrak/avrupa', 'bayrak']]) {
  await p.goto(B + path); await p.waitForSelector('[data-option]'); await p.waitForTimeout(700);
  await p.screenshot({ path: `${out}/x-${name}1.png` });
  // ikinci yönü de görmek için birkaç soru ilerle
  for (let i = 0; i < 3; i++) {
    await p.locator('[data-option]:not([disabled])').first().tap(); await p.waitForTimeout(900);
    const n = p.getByRole('button', { name: /Devam/ }); if (await n.count()) { await n.tap(); await p.waitForTimeout(900); }
  }
  await p.screenshot({ path: `${out}/x-${name}2.png` });
}
await p.goto(B + '/oyun/memleket/yakin/tum'); await p.waitForSelector('path.unit', { state: 'attached' }); await p.waitForTimeout(800);
await p.touchscreen.tap(120, 430); await p.waitForTimeout(1400);
await p.screenshot({ path: `${out}/x-yakin.png` });
console.log('errors', errs);
await b.close();
