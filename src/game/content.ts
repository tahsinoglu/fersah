import type { AtlasId } from '../data/atlases';
import factsMemleket from '../data/facts/memleket.json';
import factsCihan from '../data/facts/cihan.json';
import capitals from '../data/generated/baskentler.json';
import type { Atlas, MapUnit } from '../map-engine/types';
import type { QuizItem } from '../quiz-engine/types';

export interface Fact {
  metin: string;
  kaynak: string;
  dogrulandi: boolean;
}

const FACTS: Record<AtlasId, Record<string, Fact>> = { memleket: factsMemleket, cihan: factsCihan };
const CAPS = capitals as Record<string, { ad: string; lon: number; lat: number }[]>;

export const factOf = (atlasId: AtlasId, id: string): Fact | undefined => FACTS[atlasId][id];
export const capitalsOf = (id: string): string[] => (CAPS[id] ?? []).map((c) => c.ad);

/** Sorulabilir mi: Memleket'te tüm iller, Cihan'da ülkeler (KKTC ve bağımlı topraklar hariç) */
export function isQuizzable(atlasId: AtlasId, u: MapUnit): boolean {
  return u.selectable && (atlasId === 'memleket' || !!u.extra.ulke);
}

/** Kapsam: 'tum' ya da grup kimliği */
export type Scope = string;

export function scopeUnits(atlasId: AtlasId, atlas: Atlas, scope: Scope): MapUnit[] {
  const units = scope === 'tum' ? atlas.units : (atlas.groupById.get(scope)?.units ?? []);
  return units.filter((u) => isQuizzable(atlasId, u));
}

export const toItems = (units: MapUnit[]): QuizItem[] => units.map((u) => ({ id: u.id, name: u.name, groupId: u.groupId }));

export function scopeName(atlasId: AtlasId, atlas: Atlas, scope: Scope): string {
  if (scope === 'tum') return atlasId === 'memleket' ? 'Tüm Türkiye' : 'Tüm Dünya';
  const g = atlas.groupById.get(scope);
  return g ? (atlasId === 'memleket' ? `${g.name} Bölgesi` : g.name) : '';
}

/** Türkçe "-i hâli" eki: "Kastamonu'yu", "Rize'yi", "Muş'u" */
export function accusative(name: string): string {
  const vowels = 'aeıioöuüâîû';
  const lower = name.toLocaleLowerCase('tr');
  const lastV = [...lower].reverse().find((c) => vowels.includes(c)) ?? 'e';
  const harmony: Record<string, string> = { a: 'ı', ı: 'ı', â: 'ı', e: 'i', i: 'i', î: 'i', o: 'u', u: 'u', û: 'u', ö: 'ü', ü: 'ü' };
  const v = harmony[lastV] ?? 'i';
  const endsVowel = vowels.includes(lower[lower.length - 1]);
  return `${name}'${endsVowel ? 'y' : ''}${v}`;
}
