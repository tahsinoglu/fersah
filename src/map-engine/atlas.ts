import { geoPath, type GeoProjection } from 'd3-geo';
import { feature, merge, mesh, neighbors } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { Atlas, Box, MapGroup, MapUnit, Pt } from './types';
import { slugify as slugBase } from '../lib/slug';
import { hslToOklchHue } from '../lib/color';

export interface GroupDef {
  id: string;
  slug: string;
  name: string;
  hue: number;
  sat: number;
  /** Koyu tema OKLCH tonu; verilmezse açık tonun karşılığı kullanılır */
  darkHue?: number;
  /** İsteğe bağlı elle verilmiş kamera kutusu (boylam/enlem) */
  box?: Box;
  label?: Pt;
  selectable?: boolean;
}

export interface UnitDef {
  id: string;
  name: string;
  groupId: string;
  selectable: boolean;
  label: Pt; // boylam/enlem
  /** Elle verilmiş kamera kutusu (boylam/enlem) */
  box?: Box;
  extra?: Record<string, unknown>;
}

export interface AtlasConfig {
  id: string;
  rootName: string;
  objectName: string;
  projection: () => GeoProjection;
  /** Projeksiyonun sığdırılacağı sanal genişlik */
  width: number;
  groups: GroupDef[];
  /** Ham özellikten birim tanımı; null dönerse birim atlanır */
  unit: (props: Record<string, unknown>) => UnitDef | null;
  /** Kök görünüm kutusu (boylam/enlem); verilmezse tüm harita */
  rootBox?: Box;
}

const unionBox = (boxes: Box[]): Box => [
  [Math.min(...boxes.map((b) => b[0][0])), Math.min(...boxes.map((b) => b[0][1]))],
  [Math.max(...boxes.map((b) => b[1][0])), Math.max(...boxes.map((b) => b[1][1]))],
];

/** Boylam/enlem kutusunu kenarlarından örnekleyerek projekte eder. */
function projectBox(proj: GeoProjection, box: Box): Box {
  const pts: Pt[] = [];
  const [[w, s], [e, n]] = box;
  for (let i = 0; i <= 16; i++) {
    const x = w + ((e - w) * i) / 16;
    const y = s + ((n - s) * i) / 16;
    pts.push([x, s], [x, n], [w, y], [e, y]);
  }
  const p = pts.map((c) => proj(c)).filter((c): c is [number, number] => !!c);
  return [
    [Math.min(...p.map((c) => c[0])), Math.min(...p.map((c) => c[1]))],
    [Math.max(...p.map((c) => c[0])), Math.max(...p.map((c) => c[1]))],
  ];
}

/** Ana kara çerçevesi: en büyük parçanın %15'inden büyük parçaların kutusu. */
function frameOf(path: ReturnType<typeof geoPath>, f: Feature<Geometry>): Box {
  const g = f.geometry;
  if (g.type !== 'MultiPolygon') return path.bounds(f) as Box;
  const parts = (g as MultiPolygon).coordinates.map((coordinates) => {
    const pf: Feature<Polygon> = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates } };
    return { area: path.area(pf), box: path.bounds(pf) as Box };
  });
  const max = Math.max(...parts.map((p) => p.area));
  return unionBox(parts.filter((p) => p.area >= max * 0.15).map((p) => p.box));
}

/** Komşu birimlere farklı ton ver (açgözlü boyama). */
function assignTones(units: { groupId: string }[], nb: number[][]): number[] {
  const tones = new Array<number>(units.length).fill(-1);
  const order = units.map((_, i) => i).sort((a, b) => nb[b].length - nb[a].length);
  for (const i of order) {
    const used = new Set(nb[i].filter((j) => units[j].groupId === units[i].groupId).map((j) => tones[j]));
    let t = 0;
    while (used.has(t)) t++;
    tones[i] = t % 4;
  }
  return tones;
}

export function buildAtlas(topo: Topology, cfg: AtlasConfig): Atlas {
  const obj = topo.objects[cfg.objectName] as GeometryCollection;
  const fc = feature(topo, obj) as FeatureCollection<Geometry, Record<string, unknown>>;

  const projection = cfg.projection();
  const fitTarget: FeatureCollection = cfg.rootBox
    ? { type: 'FeatureCollection', features: [] }
    : fc;
  if (cfg.rootBox) {
    const [[w, s], [e, n]] = cfg.rootBox;
    projection.fitWidth(cfg.width, {
      type: 'Feature', properties: {},
      geometry: { type: 'MultiPoint', coordinates: [[w, s], [e, n], [w, n], [e, s], [(w + e) / 2, s], [(w + e) / 2, n]] },
    });
  } else {
    projection.fitWidth(cfg.width, fitTarget);
  }
  const path = geoPath(projection);

  const defs: (UnitDef | null)[] = fc.features.map((f) => (f.geometry ? cfg.unit(f.properties ?? {}) : null));
  const keepIdx = defs.map((d, i) => (d ? i : -1)).filter((i) => i >= 0);
  const nbAll = neighbors(obj.geometries);
  const idxMap = new Map(keepIdx.map((orig, k) => [orig, k]));
  const nb = keepIdx.map((orig) => nbAll[orig].map((j) => idxMap.get(j)).filter((j): j is number => j !== undefined));
  const keptDefs = keepIdx.map((i) => defs[i]!);
  const tones = assignTones(keptDefs, nb);

  const usedSlugs = new Set<string>();
  const units: MapUnit[] = keepIdx.map((orig, k) => {
    const def = keptDefs[k];
    const f = fc.features[orig];
    let slug = slugBase(def.name);
    while (usedSlugs.has(slug)) slug += '-2';
    usedSlugs.add(slug);
    const lp = projection(def.label) ?? (path.centroid(f) as Pt);
    return {
      id: def.id, slug, name: def.name, groupId: def.groupId, selectable: def.selectable,
      feature: f, d: path(f) ?? '', bbox: path.bounds(f) as Box, frame: def.box ? projectBox(projection, def.box) : frameOf(path, f),
      label: lp as Pt, tone: tones[k], neighbors: nb[k].map((j) => keptDefs[j].id), extra: def.extra ?? {},
    };
  });

  const groupOf = new Map(keepIdx.map((orig, k) => [orig, keptDefs[k].groupId]));
  const groups: MapGroup[] = cfg.groups.map((g) => {
    const members = units.filter((u) => u.groupId === g.id);
    const geoms = obj.geometries.filter((_, i) => groupOf.get(i) === g.id);
    const merged = merge(topo, geoms as never);
    const outline = path(merged) ?? '';
    const frame = g.box ? projectBox(projection, g.box) : unionBox(members.map((u) => u.frame));
    const label = g.label ? ((projection(g.label) ?? [0, 0]) as Pt) : (path.centroid(merged) as Pt);
    return { id: g.id, slug: g.slug, name: g.name, hue: g.hue, sat: g.sat, darkHue: g.darkHue ?? hslToOklchHue(g.hue, g.sat), units: members, outline, frame, label, selectable: g.selectable ?? true };
  });

  const gIndex = new Map(obj.geometries.map((g, i) => [g, i]));
  const grp = (g: unknown) => groupOf.get(gIndex.get(g as never) ?? -1);
  const groupBorders = path(mesh(topo, obj, (a, b) => a !== b && grp(a) !== grp(b))) ?? '';
  const outline = path(mesh(topo, obj, (a, b) => a === b)) ?? '';

  const frame = cfg.rootBox ? projectBox(projection, cfg.rootBox) : (path.bounds(fc) as Box);
  const all = path.bounds(fc) as Box;
  const w = all[1][0] - all[0][0];
  const h = all[1][1] - all[0][1];
  const extent: Box = [[all[0][0] - w * 0.5, all[0][1] - h * 0.5], [all[1][0] + w * 0.5, all[1][1] + h * 0.5]];

  return {
    id: cfg.id, rootName: cfg.rootName, groups, units,
    unitById: new Map(units.map((u) => [u.id, u])),
    groupById: new Map(groups.map((g) => [g.id, g])),
    groupBorders, outline, frame, extent,
    fit: { scale: projection.scale(), translate: projection.translate() as Pt },
    ...projectionFns(projection),
  };
}

function projectionFns(projection: GeoProjection): Pick<Atlas, 'project' | 'invert'> {
  return {
    project: (p) => (projection(p) as Pt | null) ?? null,
    invert: (p) => (projection.invert?.(p) as Pt | null) ?? null,
  };
}

/** İşçiden gelen (işlevleri olmayan) atlası yeniden kullanılabilir hale getirir */
export function hydrateAtlas(data: Omit<Atlas, 'project' | 'invert'>, cfg: AtlasConfig): Atlas {
  const projection = cfg.projection().scale(data.fit.scale).translate(data.fit.translate);
  return { ...data, ...projectionFns(projection) };
}
