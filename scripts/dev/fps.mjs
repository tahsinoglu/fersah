// Kamera geçişleri sırasında kare sürelerini ölçer (telefon taklidi + CPU yavaşlatma)
import { chromium, devices } from 'playwright';
const base = process.argv[2] || 'http://localhost:4173';
const rate = Number(process.argv[3] || 4);
const css = process.argv[4] || '';
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['Pixel 7'] });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate });
async function measure(label, action) {
  await p.evaluate(() => {
    window.__f = [];
    let last = performance.now();
    const loop = (t) => { window.__f.push(t - last); last = t; if (window.__f.length < 400) window.__raf = requestAnimationFrame(loop); };
    window.__raf = requestAnimationFrame(loop);
  });
  await action();
  await p.waitForTimeout(1100);
  const f = await p.evaluate(() => { cancelAnimationFrame(window.__raf); return window.__f.slice(1); });
  const win = f.slice(0, Math.max(1, f.findIndex((x, i) => f.slice(0, i + 1).reduce((a, c) => a + c, 0) > 900)));
  const avg = win.reduce((a, c) => a + c, 0) / win.length;
  const sorted = [...win].sort((a, c) => a - c);
  console.log(`${label}: ort ${(1000 / avg).toFixed(0)} fps, p95 kare ${sorted[Math.floor(sorted.length * 0.95)].toFixed(1)} ms, >33ms kare: ${win.filter((x) => x > 33).length}/${win.length}`);
}
const tapAt = async (sel) => { const bx = await p.locator(sel).boundingBox(); await p.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2); };
await p.goto(base + '/memleket'); await p.waitForSelector('path.unit'); await p.waitForTimeout(1500);
await measure('Türkiye → İç Anadolu', () => p.locator('path[data-u="06"]').tap());
await p.waitForTimeout(500);
await measure('İç Anadolu → Ankara', () => p.locator('path[data-u="06"]').tap({ force: true }));
await p.waitForTimeout(500);
await measure('geri: Ankara → İç Anadolu', () => p.goBack());
await p.goto(base + '/cihan'); await p.waitForSelector('path.unit'); if (css) await p.addStyleTag({ content: css }); await p.waitForTimeout(1500);
await measure('Dünya → Afrika', () => p.locator('path[data-u="COD"]').tap());
await p.waitForTimeout(500);
await measure('Afrika → Kenya', () => p.locator('path[data-u="KEN"]').tap({ force: true }));
await p.waitForTimeout(500);
await measure('geri: Kenya → Afrika', () => p.goBack());
await b.close();
