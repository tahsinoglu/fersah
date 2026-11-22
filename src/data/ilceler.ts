// İlçe sınırları (geoBoundaries ← OpenStreetMap, ODbL): yalnızca bir ile girilince indirilir.
import { feature, mesh } from 'topojson-client';
import type { Feature, Geometry } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { Atlas, Pt, SubUnit } from '../map-engine/types';

interface Props {
  il: string;
  ad: string;
  lx: number;
  ly: number;
}

let topoP: Promise<Topology> | null = null;

export function loadIlceTopo(): Promise<Topology> {
  if (!topoP) {
    topoP = fetch(`${import.meta.env.BASE_URL}geo/ilceler.topo.json`).then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<Topology>;
    });
    topoP.catch(() => (topoP = null));
  }
  return topoP;
}

export interface IlceLayer {
  subs: SubUnit[];
  borders: string;
}

const cache = new WeakMap<Topology, Map<string, IlceLayer>>();

/** Bir ilin ilçeleri: SVG yolları, etiket noktaları ve ilçeler arası sınırlar */
export function ilceLayer(atlas: Atlas, topo: Topology, il: string): IlceLayer {
  let m = cache.get(topo);
  if (!m) cache.set(topo, (m = new Map()));
  const hit = m.get(il);
  if (hit) return hit;
  const obj = topo.objects.ilceler as GeometryCollection<Props>;
  const geoms = obj.geometries.filter((g) => (g.properties as Props | undefined)?.il === il);
  const subs: SubUnit[] = geoms.map((g) => {
    const f = feature(topo, g) as Feature<Geometry, Props>;
    const p = g.properties as Props;
    return {
      id: `${il}:${p.ad}`,
      name: p.ad,
      d: atlas.pathOf(f),
      bbox: atlas.boundsOf(f),
      label: (atlas.project([p.lx, p.ly]) ?? [0, 0]) as Pt,
    };
  });
  const sub = { ...obj, geometries: geoms };
  const borders = atlas.pathOf(mesh(topo, sub, (a, b) => a !== b));
  const layer = { subs, borders };
  m.set(il, layer);
  return layer;
}
