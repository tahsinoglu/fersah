// İlçe sınırları (geoBoundaries TUR ADM2 ← OpenStreetMap, ODbL 1.0) → public/geo/ilceler.topo.json
// İl sınırları da ilçelerin birleşiminden üretilir (public/geo/turkiye.topo.json): iki katman birebir örtüşür.
// build-geo.mjs'ten sonra çalışır (il plakası eşlemesi için data-src/iller.geojson gerekir).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import polylabel from 'polylabel';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'data-src');
const out = join(root, 'public', 'geo');
const mapshaper = join(root, 'node_modules', '.bin', 'mapshaper');
const run = (args) => execFileSync(mapshaper, args, { stdio: ['ignore', 'inherit', 'inherit'] });

const RAW = join(src, 'geoBoundaries-TUR-ADM2_simplified.geojson');
if (!existsSync(RAW)) {
  const url = 'https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/main/releaseData/gbOpen/TUR/ADM2/geoBoundaries-TUR-ADM2_simplified.geojson';
  console.log('indiriliyor', url);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`ilçe verisi: ${r.status}`);
  writeFileSync(RAW, Buffer.from(await r.arrayBuffer()));
}

// ---- Geometri yardımcıları ----
function polys(geom) {
  return geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
}
function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  return Math.abs(a / 2);
}
const largest = (geom) => polys(geom).reduce((b, p) => (ringArea(p[0]) > ringArea(b[0]) ? p : b));
function insideRing(ring, [x, y]) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const inside = (geom, pt) => polys(geom).some((p) => insideRing(p[0], pt) && !p.slice(1).some((h) => insideRing(h, pt)));
const round = (n) => Math.round(n * 1000) / 1000;

// ---- Ad eşleme ----
const FOLD = { ç: 'c', ğ: 'g', ı: 'i', i: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
const fold = (s) => s.toLocaleLowerCase('tr').replace(/[^\u0000-\u007f]/g, (c) => FOLD[c] ?? c.normalize('NFD').replace(/[̀-ͯ]/g, '')).replace(/[^a-z0-9]/g, '');
const ilceListe = JSON.parse(readFileSync(join(root, 'src', 'data', 'generated', 'ilceler.json'), 'utf8'));
const iller = JSON.parse(readFileSync(join(src, 'iller.geojson'), 'utf8')).features;

/** OSM adı → resmî ilçe adı (ilceler.json'daki yazım) */
// OSM'de İngilizce ya da farklı yazılan adlar
const ALIAS = { imbros: 'Gökçeada', princeislands: 'Adalar', karakeceli: 'Karakeçili', gedizmerkez: 'Gediz', giresundistrict: 'Merkez' };
const IL_ADI = Object.fromEntries(
  [...readFileSync(join(root, 'src', 'data', 'memleket.ts'), 'utf8').matchAll(/\['(\d\d)', '([^']+)'/g)].map((m) => [m[1], fold(m[2])]),
);
function officialName(il, raw) {
  const list = ilceListe[il] ?? [];
  const f = fold(raw.replace(/\(.*\)/, ''));
  const exact = list.find((n) => fold(n) === f);
  if (exact) return exact;
  if (ALIAS[f] && list.includes(ALIAS[f])) return ALIAS[f];
  // "Adıyaman merkez", "Afyonkarahisar (Merkez İlçe)", "Ardahan" → Merkez
  const rest = fold(raw.replace(/\(.*\)/, '').replace(/merkez/gi, ''));
  if (list.includes('Merkez') && (/merkez/i.test(raw) || f === IL_ADI[il]) && (rest === '' || rest.startsWith(IL_ADI[il]))) return 'Merkez';
  return null;
}

const raw = JSON.parse(readFileSync(RAW, 'utf8'));
const unmatched = [];
const used = new Set();
for (const f of raw.features) {
  const name = String(f.properties.shapeName).trim();
  const [x, y] = polylabel(largest(f.geometry), 0.002);
  // Önce noktayı içeren il, sonra ada göre komşu iller
  const hits = iller.filter((il) => inside(il.geometry, [x, y])).map((il) => il.properties.id);
  const dist = (il) => {
    const [cx, cy] = polylabel(largest(il.geometry), 0.05);
    return Math.hypot(cx - x, cy - y);
  };
  const near = [...iller].sort((a, b) => dist(a) - dist(b)).slice(0, 8).map((il) => il.properties.id);
  let il = null;
  let ad = null;
  for (const cand of [...hits, ...near]) {
    const n = officialName(cand, name);
    if (n && !used.has(`${cand}:${n}`)) {
      il = cand;
      ad = n;
      break;
    }
  }
  if (!il) {
    unmatched.push(`${name} (${hits.join(',') || '?'})`);
    il = hits[0] ?? near[0];
    ad = name.replace(/\s*\(.*\)/, '');
  }
  used.add(`${il}:${ad}`);
  f.properties = { il, ad, lx: round(x), ly: round(y) };
}
const missing = Object.entries(ilceListe).flatMap(([il, list]) => list.filter((n) => !used.has(`${il}:${n}`)).map((n) => `${il}:${n}`));
console.log('ilçe sınırı', raw.features.length, 'eşleşmeyen', unmatched.length, unmatched.slice(0, 40), 'haritada olmayan', missing.length, missing.slice(0, 40));
const tmp = join(src, 'ilceler-eslesmis.geojson');
writeFileSync(tmp, JSON.stringify(raw));

// ---- Sadeleştir (ortak sınırlar korunur) → ilçe katmanı + illerin birleşimi ----
const ilceGeo = join(src, 'ilceler.geojson');
const ilGeo = join(src, 'iller-osm.geojson');
run([
  '-i', tmp, 'name=ilceler',
  '-simplify', process.env.ILCE_SIMPLIFY ?? '22%', 'keep-shapes', 'weighting=0.7',
  '-clean',
  '-o', 'format=geojson', 'precision=0.0001', ilceGeo,
  '-dissolve', 'il', 'copy-fields=', '+', 'name=iller',
  '-each', 'id=il', '-filter-fields', 'id',
  '-o', 'format=geojson', 'precision=0.0001', ilGeo,
]);
const ilFC = JSON.parse(readFileSync(ilGeo, 'utf8'));
for (const f of ilFC.features) {
  const [x, y] = polylabel(largest(f.geometry), 0.005);
  f.properties.lx = round(x);
  f.properties.ly = round(y);
}
writeFileSync(ilGeo, JSON.stringify(ilFC));
console.log('il', ilFC.features.length);
run(['-i', ilGeo, 'name=iller', '-o', 'format=topojson', 'quantization=100000', join(out, 'turkiye.topo.json')]);
run(['-i', ilceGeo, 'name=ilceler', '-o', 'format=topojson', 'quantization=100000', join(out, 'ilceler.topo.json')]);
