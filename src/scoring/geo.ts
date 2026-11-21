import { geoContains } from 'd3-geo';
import type { Feature, Geometry, Position } from 'geojson';

const R = 6371.0088; // km, ortalama Dünya yarıçapı

/** İki nokta arası büyük daire uzaklığı (km), haversine formülü. [boylam, enlem] */
export function haversineKm(a: [number, number], b: [number, number]): number {
  const toRad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * toRad;
  const dLon = (b[0] - a[0]) * toRad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * toRad) * Math.cos(b[1] * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function rings(g: Geometry): Position[][] {
  if (g.type === 'Polygon') return g.coordinates;
  if (g.type === 'MultiPolygon') return g.coordinates.flat();
  return [];
}

/** Noktanın bölgeye uzaklığı: içindeyse 0, değilse sınırdaki en yakın noktaya uzaklık (km). */
export function distanceToFeatureKm(f: Feature<Geometry>, p: [number, number]): { km: number; nearest: [number, number] } {
  if (geoContains(f, p)) return { km: 0, nearest: p };
  let best = Infinity;
  let nearest: [number, number] = p;
  for (const ring of rings(f.geometry)) {
    for (let i = 0; i < ring.length - 1; i++) {
      // Kenarı birkaç parçaya bölerek yaklaşık en yakın noktayı bul
      const [x0, y0] = ring[i];
      const [x1, y1] = ring[i + 1];
      const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.25));
      for (let s = 0; s <= steps; s++) {
        const q: [number, number] = [x0 + ((x1 - x0) * s) / steps, y0 + ((y1 - y0) * s) / steps];
        const d = haversineKm(p, q);
        if (d < best) {
          best = d;
          nearest = q;
        }
      }
    }
  }
  return { km: best, nearest };
}
