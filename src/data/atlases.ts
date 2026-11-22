import { geoConicConformal, geoEqualEarth } from 'd3-geo';
import type { Topology } from 'topojson-specification';
import { buildAtlas, hydrateAtlas, type AtlasConfig } from '../map-engine/atlas';
import type { Atlas } from '../map-engine/types';
import { BOLGELER, ILLER_BY_PLAKA } from './memleket';
import flags from './generated/bayraklar.json';
import { AD_DUZELTME, EK_SECILEBILIR, KITA_DUZELTME, KITALAR, KONUM_DUZELTME, ulkeMi } from './cihan';

export type AtlasId = 'memleket' | 'cihan';
export const ATLAS_IDS: AtlasId[] = ['memleket', 'cihan'];

const memleketConfig: AtlasConfig = {
  id: 'memleket',
  rootName: 'Türkiye',
  objectName: 'iller',
  width: 1000,
  projection: () => geoConicConformal().parallels([36.5, 41.5]).rotate([-35, 0]),
  groups: BOLGELER.map((b) => ({ id: b.id, slug: b.id, name: b.ad, hue: b.hue, sat: b.sat, darkHue: b.darkHue })),
  unit: (p) => {
    const il = ILLER_BY_PLAKA.get(String(p.id));
    if (!il) return null;
    return {
      id: il.plaka, name: il.ad, groupId: il.bolge, selectable: true,
      label: [Number(p.lx), Number(p.ly)], extra: { plaka: il.plaka },
    };
  },
};

const kitaByNe = new Map(KITALAR.map((k) => [k.ne, k]));

const cihanConfig: AtlasConfig = {
  id: 'cihan',
  rootName: 'Dünya',
  objectName: 'ulkeler',
  width: 1000,
  // Kesim çizgisi 169°B: Samoa, Tonga, Fiji Okyanusya'nın yanında kalır
  projection: () => geoEqualEarth().rotate([-11, 0]),
  rootBox: [[-168.9, -58], [190.9, 84]],
  groups: KITALAR.map((k) => ({
    id: k.id, slug: k.id, name: k.ad, hue: k.hue, sat: k.sat, darkHue: k.darkHue, box: k.kutu, label: k.etiket, selectable: true,
  })),
  unit: (p) => {
    const id = String(p.id);
    const ne = KITA_DUZELTME[id] ?? String(p.kita);
    const kita = kitaByNe.get(ne);
    if (!kita) return null;
    const ulke = ulkeMi(id, String(p.tur));
    return {
      id, name: AD_DUZELTME[id] ?? String(p.ad), groupId: kita.id,
      selectable: ulke || EK_SECILEBILIR.includes(id),
      label: KONUM_DUZELTME[id]?.etiket ?? [Number(p.lx), Number(p.ly)],
      box: KONUM_DUZELTME[id]?.kutu,
      extra: { ulke, nufus: Number(p.nufus), bayrak: (flags as Record<string, string>)[id] },
    };
  },
};

const CONFIGS: Record<AtlasId, AtlasConfig> = { memleket: memleketConfig, cihan: cihanConfig };
const FILES: Record<AtlasId, string> = { memleket: 'geo/turkiye.topo.json', cihan: 'geo/dunya.topo.json' };

const cache = new Map<AtlasId, Promise<Atlas>>();

export const atlasUrl = (id: AtlasId) => import.meta.env.BASE_URL + FILES[id];

function loadOnMainThread(id: AtlasId): Promise<Atlas> {
  return fetch(atlasUrl(id))
    .then((r) => {
      if (!r.ok) throw new Error(`${FILES[id]}: ${r.status}`);
      return r.json() as Promise<Topology>;
    })
    .then((topo) => buildAtlas(topo, CONFIGS[id]));
}

/** Harita verisi bir Web Worker'da işlenir; ana iş parçacığı (dokunma, animasyon) donmaz. */
function loadInWorker(id: AtlasId): Promise<Atlas> {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL('./atlas.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<{ ok: true; atlas: Omit<Atlas, 'project' | 'invert' | 'pathOf' | 'boundsOf'> } | { ok: false; error: string }>) => {
      w.terminate();
      if (e.data.ok) resolve(hydrateAtlas(e.data.atlas, CONFIGS[id]));
      else reject(new Error(e.data.error));
    };
    w.onerror = (e) => {
      w.terminate();
      reject(e);
    };
    w.postMessage({ id, url: new URL(atlasUrl(id), location.href).href });
  });
}

export function loadAtlas(id: AtlasId): Promise<Atlas> {
  let p = cache.get(id);
  if (!p) {
    p = (typeof Worker !== 'undefined' ? loadInWorker(id) : Promise.reject(new Error('worker yok'))).catch(() => loadOnMainThread(id));
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return p;
}

export function atlasConfig(id: AtlasId): AtlasConfig {
  return CONFIGS[id];
}

/** Test ve betikler için: hazır topolojiden atlas kur */
export function atlasFromTopology(id: AtlasId, topo: Topology): Atlas {
  return buildAtlas(topo, CONFIGS[id]);
}
