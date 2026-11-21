// Önizleme yayını: bellek içi yönlendirme, servis çalışanı yok. Sayfa parçası + yanındaki dosyalar.
// Kullanım: node scripts/build-preview.mjs <çıktı klasörü>
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2];
if (!out) throw new Error('çıktı klasörü gerekli');
execSync('npx vite build --mode preview-static --outDir dist-preview --emptyOutDir', {
  stdio: 'inherit',
  env: { ...process.env, VITE_PREVIEW: '1' },
});
const dir = 'dist-preview';
const html = readFileSync(join(dir, 'index.html'), 'utf8');
const js = /<script type="module" crossorigin src="\.\/(assets\/[^"]+\.js)"/.exec(html)[1];
const css = /<link rel="stylesheet" crossorigin href="\.\/(assets\/[^"]+\.css)"/.exec(html)[1];
const theme = /<script>\s*\/\/ Tema[\s\S]*?<\/script>/.exec(html)[0];
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
writeFileSync(
  join(out, 'index.html'),
  `<title>Memleket & Cihan</title>
<meta name="theme-color" content="#f6f4ef">
${theme}
<link rel="stylesheet" href="${css}">
<div id="root"></div>
<script type="module" src="${js}"></script>
`,
);
// Yalnızca gereken dosyalar: betikler, stiller, latin yazı tipleri, harita verisi
const files = {};
mkdirSync(join(out, 'assets'), { recursive: true });
for (const f of readdirSync(join(dir, 'assets'))) {
  if (/\.woff$/.test(f) || (/\.woff2$/.test(f) && (!/latin/.test(f) || /cyrillic|greek|vietnamese/.test(f)))) continue;
  cpSync(join(dir, 'assets', f), join(out, 'assets', f));
  files[`assets/${f}`] = join(out, 'assets', f);
}
mkdirSync(join(out, 'geo'), { recursive: true });
for (const f of readdirSync(join(dir, 'geo'))) {
  cpSync(join(dir, 'geo', f), join(out, 'geo', f));
  files[`geo/${f}`] = join(out, 'geo', f);
}
writeFileSync(join(out, 'files.json'), JSON.stringify(files, null, 1));
console.log(Object.keys(files).length, 'dosya');
