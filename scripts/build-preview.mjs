// Tek dosyalık önizleme sayfası üretir (JS, CSS ve yazı tipleri gömülü; harita verisi yanında).
// Kullanım: node scripts/build-preview.mjs <çıktı klasörü>
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2];
if (!out) throw new Error('çıktı klasörü gerekli');
execSync('npx vite build --mode preview-static --outDir dist-preview --emptyOutDir', {
  stdio: 'inherit',
  env: { ...process.env, VITE_PREVIEW: '1' },
});
const dir = 'dist-preview';
const html = readFileSync(join(dir, 'index.html'), 'utf8');
const jsFile = /<script type="module" crossorigin src="\.\/(assets\/[^"]+\.js)"/.exec(html)[1];
const cssFile = /<link rel="stylesheet" crossorigin href="\.\/(assets\/[^"]+\.css)"/.exec(html)[1];
let css = readFileSync(join(dir, cssFile), 'utf8');
// Yazı tiplerini göm (yalnızca latin ve latin-ext; Türkçe karakterler latin-ext'te)
css = css.replace(/url\(\.?\/?([^)]+\.woff2)\)/g, (m, f) => {
  const name = f.split('/').pop();
  if (!/latin/.test(name) || /cyrillic|greek|vietnamese/.test(name)) return 'url(data:font/woff2;base64,)';
  const data = readFileSync(join(dir, 'assets', name)).toString('base64');
  return `url(data:font/woff2;base64,${data})`;
});
css = css.replace(/,\s*url\(\.?\/?[^)]+\.woff\)\s*format\("woff"\)/g, '');
const js = readFileSync(join(dir, jsFile), 'utf8').replace(/<\/script/gi, '<\\/script');
const theme = /<script>\s*\/\/ Tema[\s\S]*?<\/script>/.exec(html)[0];
const page = `<title>Memleket & Cihan</title>
<meta name="theme-color" content="#f6f4ef">
${theme}
<style>${css}</style>
<div id="root"></div>
<script type="module">${js}</script>
`;
mkdirSync(join(out, 'geo'), { recursive: true });
writeFileSync(join(out, 'index.html'), page);
for (const f of readdirSync(join(dir, 'geo'))) cpSync(join(dir, 'geo', f), join(out, 'geo', f));
console.log('önizleme:', join(out, 'index.html'), (page.length / 1024).toFixed(0) + ' KB');
