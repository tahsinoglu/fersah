import type { Feature, Geometry } from 'geojson';

export type Box = [[number, number], [number, number]];
export type Pt = [number, number];

/** Haritadaki en küçük tıklanabilir parça (il, ülke). */
export interface MapUnit {
  id: string;
  slug: string;
  name: string;
  groupId: string;
  /** Kendi başına seçilebilir mi (ör. küçük bağımlı topraklar değil) */
  selectable: boolean;
  feature: Feature<Geometry>;
  /** Önceden hesaplanmış SVG yolu (projeksiyon koordinatlarında) */
  d: string;
  bbox: Box;
  /** Kamera çerçevesi (ana kara parçası) */
  frame: Box;
  label: Pt;
  /** Aynı renk ailesinde ton sırası (0-3), komşular farklı olsun diye */
  tone: number;
  /** Sınır komşusu birimler */
  neighbors: string[];
  extra: Record<string, unknown>;
}

/** Bir üst seviye: coğrafi bölge, kıta. */
export interface MapGroup {
  id: string;
  slug: string;
  name: string;
  hue: number;
  sat: number;
  darkHue: number;
  units: MapUnit[];
  outline: string;
  frame: Box;
  label: Pt;
  selectable: boolean;
}

export interface Atlas {
  id: string;
  rootName: string;
  groups: MapGroup[];
  units: MapUnit[];
  unitById: Map<string, MapUnit>;
  groupById: Map<string, MapGroup>;
  /** Farklı gruplar arasındaki sınırlar */
  groupBorders: string;
  /** Kıyı/dış sınır */
  outline: string;
  frame: Box;
  /** Gezinmeye izin verilen alan */
  extent: Box;
  /** Projeksiyonun ölçek ve kaydırması (işçiden ana iş parçacığına aktarmak için) */
  fit: { scale: number; translate: Pt };
  /** [boylam, enlem] → projeksiyon koordinatı */
  project: (lonlat: Pt) => Pt | null;
  /** projeksiyon koordinatı → [boylam, enlem] */
  invert: (p: Pt) => Pt | null;
}

/** Haritadaki seçim yolu: kök → grup → birim */
export interface Selection {
  groupId?: string;
  unitId?: string;
}

export type Depth = 0 | 1 | 2;
export const depthOf = (s: Selection): Depth => (s.unitId ? 2 : s.groupId ? 1 : 0);
