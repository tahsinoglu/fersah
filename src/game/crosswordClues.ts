// Çengel bulmaca ipuçları: Memleket (iller) ve Cihan (ülkeler, başkentler)
import type { Atlas, MapUnit } from '../map-engine/types';
import type { AtlasId } from '../data/atlases';
import type { ClueInput } from '../quiz-engine/crossword';
import { createRng, shuffle } from '../quiz-engine/random';
import { capitalsOf, factOf, isQuizzable } from './content';
import ilcelerJson from '../data/generated/ilceler.json';

const ILCELER = ilcelerJson as Record<string, string[]>;

/** Bilgi kartında yerin adını gizle: "Rize'de çay yetişir" → "___'de çay yetişir" */
function masked(text: string, name: string): string | null {
  const re = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  if (!re.test(text)) return null;
  return text.replace(re, '___');
}

const two = <T,>(xs: T[], rng: () => number) => shuffle(xs, rng).slice(0, 2);

export function crosswordClues(atlasId: AtlasId, atlas: Atlas, seed: string, scopeGroup?: string): ClueInput[] {
  const rng = createRng(`${seed}:ipucu`);
  const name = (id: string) => atlas.unitById.get(id)?.name ?? id;
  // Cihan'da çok küçük/az bilinen ülkeler bulmacayı zorlaştırır: nüfusu 3 milyonun altındakiler çıkar
  const units = atlas.units.filter(
    (u) => isQuizzable(atlasId, u) && (!scopeGroup || u.groupId === scopeGroup) && (atlasId === 'memleket' || Number(u.extra.nufus) >= 3_000_000),
  );
  const group = (u: MapUnit) => atlas.groupById.get(u.groupId)?.name ?? '';
  const out: ClueInput[] = [];

  for (const u of units) {
    const nb = u.neighbors.filter((n) => atlas.unitById.get(n)?.selectable).map(name);
    const options: ClueInput[] = [];
    if (atlasId === 'memleket') {
      options.push({ answer: u.name, clue: `Plakası ${u.extra.plaka} olan il`, about: u.id });
      if (nb.length >= 2) options.push({ answer: u.name, clue: `${group(u)} Bölgesi'nde · Komşuları: ${two(nb, rng).join(', ')}`, about: u.id });
      const ilce = (ILCELER[u.id] ?? []).filter((n) => n !== 'Merkez' && n.toLocaleLowerCase('tr') !== u.name.toLocaleLowerCase('tr'));
      if (ilce.length >= 2) options.push({ answer: u.name, clue: `İlçelerinden ikisi: ${two(ilce, rng).join(', ')}`, about: u.id });
      const f = factOf('memleket', u.id);
      const m = f && masked(f.metin, u.name);
      if (m && m.length <= 110) options.push({ answer: u.name, clue: m, about: u.id });
    } else {
      const caps = capitalsOf(u.id);
      if (caps.length) options.push({ answer: u.name, clue: `Başkenti: ${caps[0]}`, about: u.id });
      if (nb.length >= 2) options.push({ answer: u.name, clue: `${group(u)} · Komşuları: ${two(nb, rng).join(', ')}`, about: u.id });
      const iso = u.extra.bayrak as string | undefined;
      if (iso) options.push({ answer: u.name, clue: 'Bu bayrağın ülkesi', image: `flags/${iso}.svg`, about: u.id });
      // Başkent de cevap olabilir
      if (caps.length === 1 && !caps[0].includes(' ') && Number(u.extra.nufus) >= 15_000_000) out.push({ answer: caps[0], clue: `Başkent · Ülkesi: ${u.name}`, about: u.id });
      const f = factOf('cihan', u.id);
      const m = f && masked(f.metin, u.name);
      if (m && m.length <= 110) options.push({ answer: u.name, clue: m, about: u.id });
    }
    if (options.length) out.push(options[Math.floor(rng() * options.length)]);
  }
  return out;
}
