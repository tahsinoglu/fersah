// Cihan haritasındaki şehirler (Natural Earth yerleşimleri, kamu malı): başkentler + bilinen büyük şehirler
import raw from './generated/sehirler.json';
import type { MapCity } from '../map-engine/MapView';

export const SEHIRLER: MapCity[] = (raw as [string, string, number, number, number][]).map(([name, unitId, lon, lat, b], i) => ({
  id: `${unitId}-${i}`,
  name,
  unitId,
  at: [lon, lat],
  capital: b === 1,
}));
