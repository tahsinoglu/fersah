import { chromium, devices } from 'playwright';
const out = process.argv[2];
const b = await chromium.launch();
const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage();
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type()==='error' && errs.push(m.text()));
await p.goto('http://localhost:5173/oyun/memleket/test/tum'); await p.waitForSelector('[data-option]'); await p.waitForTimeout(400);
await p.screenshot({ path: `${out}/t1.png` });
await p.locator('[data-option]').first().tap(); await p.waitForTimeout(500);
await p.screenshot({ path: `${out}/t2.png` });
for (let i = 0; i < 12 && !(await p.getByText('Tur bitti').count()); i++) {
  const n = p.getByRole('button', { name: /Devam|Sonuçları gör/ }); if (await n.count()) { await n.tap(); await p.waitForTimeout(250); }
  const o = p.locator('[data-option]:not([disabled])').first(); if (await o.count()) { await o.tap(); await p.waitForTimeout(250); }
}
console.log('sonuç', await p.getByText('Tur bitti').count());
await p.goto('http://localhost:5173/memleket/karadeniz/rize'); await p.waitForSelector('path.unit', { state: 'attached' }); await p.waitForTimeout(1200);
await p.locator('[data-handle]').tap(); await p.waitForTimeout(700);
await p.screenshot({ path: `${out}/t3.png` });
console.log('errors', errs);
await b.close();
