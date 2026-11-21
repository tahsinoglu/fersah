// public/icons/icon.svg'den PNG ikonları üretir (Playwright ile)
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const svg = readFileSync('public/icons/icon.svg', 'utf8');
const b = await chromium.launch();
const p = await b.newPage();
async function shot(size, file, pad = 0, bg = 'transparent') {
  await p.setViewportSize({ width: size, height: size });
  const inner = size - pad * 2;
  await p.setContent(`<html><body style="margin:0;background:${bg}"><div style="padding:${pad}px;width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body></html>`);
  await p.screenshot({ path: `public/icons/${file}`, omitBackground: bg === 'transparent' });
}
await shot(192, 'icon-192.png');
await shot(512, 'icon-512.png');
await shot(180, 'apple-touch-icon.png', 0, '#1a8f93');
// Maskelenebilir ikon: kenarları dolu, güvenli alan içinde
await p.setViewportSize({ width: 512, height: 512 });
await p.setContent(`<html><body style="margin:0;background:linear-gradient(135deg,#14a9a4,#1c5f6e)"><div style="padding:64px">${svg.replace('<rect width="512" height="512" rx="112" fill="url(#g)"/>', '').replace('<svg ', '<svg width="384" height="384" ')}</div></body></html>`);
await p.screenshot({ path: 'public/icons/icon-maskable-512.png' });
await b.close();
