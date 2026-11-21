import { geoEqualEarth, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';

let cache: Promise<Map<string, Feature<Geometry>>> | null = null;

/** Siluet modu için ayrıntılı ülke şekilleri (yalnızca gerektiğinde yüklenir) */
export function loadDetailedCountries(): Promise<Map<string, Feature<Geometry>>> {
  if (!cache) {
    cache = fetch(import.meta.env.BASE_URL + 'geo/dunya-siluet.topo.json')
      .then((r) => r.json() as Promise<Topology>)
      .then((topo) => {
        const obj = Object.values(topo.objects)[0] as GeometryCollection;
        const fc = feature(topo, obj) as FeatureCollection<Geometry, { id: string }>;
        return new Map(fc.features.filter((f) => f.geometry).map((f) => [f.properties.id, f]));
      });
    cache.catch(() => (cache = null));
  }
  return cache;
}

/** Şekli 100×100 kutuya sığdırılmış SVG yolu */
export function silhouettePath(f: Feature<Geometry>): string {
  const proj = geoEqualEarth().rotate([-11, 0]).fitSize([100, 100], f);
  return geoPath(proj)(f) ?? '';
}
