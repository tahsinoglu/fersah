// Ham Natural Earth verisini indirir, sadeleştirir ve TopoJSON'a çevirir.
// Kullanım: npm run geo
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import polylabel from 'polylabel';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'data-src');
const out = join(root, 'public', 'geo');
mkdirSync(src, { recursive: true });
mkdirSync(out, { recursive: true });

const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/10m_cultural';
const LAYERS = ['ne_10m_admin_0_countries_tur', 'ne_10m_admin_1_states_provinces', 'ne_10m_populated_places'];

for (const layer of LAYERS) {
  for (const ext of ['shp', 'dbf', 'prj', 'cpg']) {
    const file = join(src, `${layer}.${ext}`);
    if (existsSync(file)) continue;
    console.log('indiriliyor', `${layer}.${ext}`);
    const res = await fetch(`${NE}/${layer}.${ext}`);
    if (!res.ok) {
      if (ext === 'cpg') continue;
      throw new Error(`${layer}.${ext}: ${res.status}`);
    }
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
}

const mapshaper = join(root, 'node_modules', '.bin', 'mapshaper');
const run = (args) => execFileSync(mapshaper, args, { stdio: ['ignore', 'inherit', 'inherit'] });

// Türkiye illeri (ISO 3166-2 kodu = plaka)
const ilGeo = join(src, 'iller.geojson');
run([
  '-i', join(src, 'ne_10m_admin_1_states_provinces.shp'), 'encoding=utf8',
  '-filter', 'adm0_a3=="TUR"',
  '-each', 'id=iso_3166_2.slice(3)',
  '-filter-fields', 'id',
  '-simplify', '18%', 'keep-shapes', 'weighting=0.7',
  '-clean',
  '-o', 'format=geojson', 'precision=0.0001', ilGeo,
]);

// Dünya ülkeleri (Türkiye bakış açısı sürümü)
const ulkeGeo = join(src, 'ulkeler.geojson');
run([
  '-i', join(src, 'ne_10m_admin_0_countries_tur.shp'), 'encoding=utf8',
  '-each', 'id=ADM0_A3, ad=NAME_TR, kita=CONTINENT, tur=TYPE, nufus=POP_EST, lx=LABEL_X, ly=LABEL_Y',
  '-filter-fields', 'id,ad,kita,tur,nufus,lx,ly',
  '-simplify', '3%', 'keep-shapes', 'weighting=0.7',
  '-clean',
  '-o', 'format=geojson', 'precision=0.001', ulkeGeo,
]);

// Etiket noktaları: il için en büyük poligonun "erişilemezlik kutbu"
function largestPolygon(geom) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  let best = polys[0], bestA = -1;
  for (const p of polys) {
    const ring = p[0];
    let a = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
    a = Math.abs(a / 2);
    if (a > bestA) { bestA = a; best = p; }
  }
  return best;
}
/** Düzlemsel nokta-çokgen testi (sadeleştirilmiş kıyıya göre) */
function insideRing(ring, [x, y]) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function insideAny(geom, pt) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  return polys.some((p) => insideRing(p[0], pt) && !p.slice(1).some((h) => insideRing(h, pt)));
}
const round = (n) => Math.round(n * 1000) / 1000;

const iller = JSON.parse(readFileSync(ilGeo, 'utf8'));
for (const f of iller.features) {
  const [x, y] = polylabel(largestPolygon(f.geometry), 0.005);
  f.properties.lx = round(x);
  f.properties.ly = round(y);
}
writeFileSync(ilGeo, JSON.stringify(iller));

const ulkeler = JSON.parse(readFileSync(ulkeGeo, 'utf8'));
for (const f of ulkeler.features) {
  if (!f.geometry) continue;
  // Natural Earth etiket noktası denize düşüyorsa (ör. Yeni Zelanda) karaya al
  if (!insideAny(f.geometry, [f.properties.lx, f.properties.ly])) {
    const [x, y] = polylabel(largestPolygon(f.geometry), 0.01);
    f.properties.lx = x;
    f.properties.ly = y;
  }
  f.properties.lx = round(f.properties.lx);
  f.properties.ly = round(f.properties.ly);
}
writeFileSync(ulkeGeo, JSON.stringify(ulkeler));

// Siluet modu için daha ayrıntılı ülke şekilleri (yalnızca o modda yüklenir)
run([
  '-i', join(src, 'ne_10m_admin_0_countries_tur.shp'), 'encoding=utf8',
  '-each', 'id=ADM0_A3', '-filter-fields', 'id',
  '-simplify', '12%', 'keep-shapes', 'weighting=0.7', '-clean',
  '-o', 'format=topojson', 'quantization=100000', join(out, 'dunya-siluet.topo.json'),
]);

run(['-i', ilGeo, 'name=iller', '-o', 'format=topojson', 'quantization=100000', join(out, 'turkiye.topo.json')]);
run(['-i', ulkeGeo, 'name=ulkeler', '-o', 'format=topojson', 'quantization=100000', join(out, 'dunya.topo.json')]);
// Başkentler (Natural Earth yerleşimleri, "Admin-0 capital")
const capCsv = join(src, 'baskentler.json');
run([
  '-i', join(src, 'ne_10m_populated_places.shp'), 'encoding=utf8',
  '-filter', 'FEATURECLA === "Admin-0 capital" && ADM0CAP === 1',
  '-each', 'ulke=ADM0_A3, ad=NAME_TR || NAME, lon=Math.round(LONGITUDE*1000)/1000, lat=Math.round(LATITUDE*1000)/1000',
  '-filter-fields', 'ulke,ad,lon,lat',
  '-o', 'format=json', capCsv,
]);
const caps = {};
for (const c of JSON.parse(readFileSync(capCsv, 'utf8'))) (caps[c.ulke] ??= []).push({ ad: c.ad, lon: c.lon, lat: c.lat });
for (const k of Object.keys(caps)) caps[k].sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
mkdirSync(join(root, 'src', 'data', 'generated'), { recursive: true });
writeFileSync(join(root, 'src', 'data', 'generated', 'baskentler.json'), JSON.stringify(caps, null, 0));
console.log('tamam');
