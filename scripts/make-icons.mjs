// public/icons/icon.svg'den PNG uygulama ikonları üretir (Playwright ile). Kimlik rehberi: beyaz zeminde işaret.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const svg = readFileSync('public/icons/icon.svg', 'utf8');
const b = await chromium.launch();
const p = await b.newPage();
async function shot(size, file, markRatio, bg) {
  await p.setViewportSize({ width: size, height: size });
  const m = Math.round(size * markRatio);
  await p.setContent(`<html><body style="margin:0;width:${size}px;height:${size}px;display:grid;place-items:center;background:${bg}">${svg.replace('<svg ', `<svg width="${m}" height="${m}" `)}</body></html>`);
  await p.screenshot({ path: `public/icons/${file}`, omitBackground: bg === 'transparent' });
}
await shot(192, 'icon-192.png', 0.86, '#FFFFFF');
await shot(512, 'icon-512.png', 0.86, '#FFFFFF');
await shot(180, 'apple-touch-icon.png', 0.8, '#FFFFFF');
// Maskelenebilir: güvenli alan (%80 daire) içinde
await shot(512, 'icon-maskable-512.png', 0.62, '#FFFFFF');
await b.close();
