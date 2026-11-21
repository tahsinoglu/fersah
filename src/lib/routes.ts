import type { Atlas, Selection } from '../map-engine/types';

export function pathFor(atlasId: string, atlas: Atlas | null, sel: Selection): string {
  let p = `/${atlasId}`;
  if (!atlas || !sel.groupId) return p;
  const g = atlas.groupById.get(sel.groupId);
  if (!g) return p;
  p += `/${g.slug}`;
  if (!sel.unitId) return p;
  const u = atlas.unitById.get(sel.unitId);
  return u ? `${p}/${u.slug}` : p;
}

export interface Parsed {
  selection: Selection;
  /** Adres geçersizse yönlendirilecek doğru adres */
  canonical: string | null;
}

/** Adres parçalarını seçime çevirir; geçersiz parçalar atılır. */
export function parsePath(atlasId: string, atlas: Atlas, groupSlug?: string, unitSlug?: string): Parsed {
  const sel: Selection = {};
  if (groupSlug) {
    const g = atlas.groups.find((x) => x.slug === groupSlug);
    if (g) {
      sel.groupId = g.id;
      if (unitSlug) {
        const u = g.units.find((x) => x.slug === unitSlug && x.selectable);
        if (u) sel.unitId = u.id;
      }
    }
  }
  const want = pathFor(atlasId, atlas, sel);
  const have = `/${atlasId}${groupSlug ? `/${groupSlug}` : ''}${unitSlug ? `/${unitSlug}` : ''}`;
  return { selection: sel, canonical: want === have ? null : want };
}

/** Kökten seçime giden seçim zinciri: [{}, {groupId}, {groupId, unitId}] */
export function chainOf(sel: Selection): Selection[] {
  const chain: Selection[] = [{}];
  if (sel.groupId) chain.push({ groupId: sel.groupId });
  if (sel.unitId) chain.push({ groupId: sel.groupId, unitId: sel.unitId });
  return chain;
}
