import { chromium, devices } from 'playwright';
const out = process.argv[2];
const scheme = process.argv[3] || 'light';
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'], colorScheme: scheme });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const B = 'http://localhost:5173';
// Haritada Bul: yanlış cevap → bilgi kartı
await p.goto(B + '/oyun/memleket/bul/karadeniz');
await p.waitForSelector('path.unit', { state: 'attached' }); await p.waitForTimeout(900);
await p.screenshot({ path: `${out}/g-bul.png` });
const title = await p.locator('h1').first().textContent();
// Hedef olmayan bir ile dokun
const ids = await p.$$eval('.grp-focus path.unit', (els) => els.map((e) => e.dataset.u));
const nameToId = { Rize: '53', Trabzon: '61', Samsun: '55', Ordu: '52' };
let wrong = ids.find((id) => id !== nameToId[title]);
await p.locator(`path[data-u="${wrong}"]`).tap({ force: true });
await p.waitForTimeout(1500);
await p.screenshot({ path: `${out}/g-bul-yanlis.png` });
console.log('bul prompt', title, 'card?', await p.locator('text=Devam').count());
// Bu Neresi
await p.goto(B + '/oyun/cihan/neresi/afrika');
await p.waitForSelector('path.unit', { state: 'attached' }); await p.waitForTimeout(1200);
await p.screenshot({ path: `${out}/g-neresi.png` });
await p.locator('[data-option]').first().tap(); await p.waitForTimeout(1300);
await p.screenshot({ path: `${out}/g-neresi-cevap.png` });
// Yakın atış
await p.goto(B + '/oyun/memleket/yakin/tum');
await p.waitForSelector('path.unit', { state: 'attached' }); await p.waitForTimeout(900);
await p.touchscreen.tap(200, 420); await p.waitForTimeout(1500);
await p.screenshot({ path: `${out}/g-yakin.png` });
// Siluet
await p.goto(B + '/oyun/cihan/siluet/avrupa');
await p.waitForSelector('path.unit', { state: 'attached' }); await p.waitForTimeout(900);
await p.screenshot({ path: `${out}/g-siluet.png` });
// Bir turu baştan sona: neresi, hep ilk şık
await p.goto(B + '/oyun/memleket/neresi/ege');
await p.waitForSelector('path.unit', { state: 'attached' }); await p.waitForTimeout(800);
for (let i = 0; i < 12; i++) {
  if (await p.locator('text=Tur bitti').count()) break;
  const opt = p.locator('[data-option]:not([disabled])').first();
  if (await opt.count()) { await opt.tap(); await p.waitForTimeout(900); }
  const next = p.getByRole('button', { name: /Devam|Sonuçları gör/ });
  if (await next.count()) { await next.tap(); await p.waitForTimeout(900); }
}
await p.screenshot({ path: `${out}/g-sonuc.png` });
console.log('sonuç?', await p.locator('text=Tur bitti').count());
// Hub
await p.goto(B + '/oyna'); await p.waitForTimeout(600);
await p.screenshot({ path: `${out}/hub.png` });
await p.goto(B + '/istatistik'); await p.waitForTimeout(800);
await p.screenshot({ path: `${out}/stats.png` });
await p.goto(B + '/memleket'); await p.waitForSelector('path.unit', { state: 'attached' });
await p.getByRole('button', { name: 'Öğrenme haritası' }).tap(); await p.waitForTimeout(700);
await p.screenshot({ path: `${out}/learn.png` });
console.log('errors', errs);
await b.close();
