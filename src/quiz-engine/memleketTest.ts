import { createRng, shuffle, type Rng } from './random';

/** Haritasız, metin tabanlı soru (Memleket Testi) */
export interface TextQuestion {
  type: 'ilce-il' | 'il-ilce' | 'bolge' | 'komsu' | 'mesafe';
  prompt: string;
  options: string[];
  answer: number;
  /** Sorunun ilgili olduğu il (plaka): öğrenme kutuları ve "tekrar çalış" listesi için */
  about: string;
  /** Cevaptan sonra gösterilen kısa açıklama */
  explain: string;
}

export interface TestData {
  iller: { plaka: string; ad: string; bolge: string }[];
  bolgeAd: Record<string, string>;
  /** plaka → ilçe adları */
  ilceler: Record<string, string[]>;
  /** plaka → komşu il plakaları */
  komsular: Record<string, string[]>;
  /** "AA-BB" (AA < BB) → karayolu km */
  karayolu: Record<string, number>;
}

export interface TestOptions {
  data: TestData;
  seed: number | string;
  count?: number;
  /** Bölge kimliği ya da 'tum' */
  scope?: string;
  /** Aralıklı tekrar ağırlığı (il plakası) */
  weight?: (plaka: string) => number;
}

/** Birden çok ilde geçen ilçe adları (Merkez, Bozkurt…) sorulamaz: cevap belirsiz olur */
export function uniqueDistricts(ilceler: Record<string, string[]>): Map<string, string> {
  const count = new Map<string, number>();
  for (const list of Object.values(ilceler)) for (const n of list) count.set(n, (count.get(n) ?? 0) + 1);
  const owner = new Map<string, string>();
  for (const [plaka, list] of Object.entries(ilceler)) for (const n of list) if (count.get(n) === 1 && n !== 'Merkez') owner.set(n, plaka);
  return owner;
}

const pick = <T,>(a: readonly T[], rng: Rng): T => a[Math.floor(rng() * a.length)];

function withOptions(correct: string, distractors: string[], rng: Rng): { options: string[]; answer: number } {
  const uniq = [...new Set(distractors.filter((d) => d !== correct))].slice(0, 3);
  const options = shuffle([correct, ...uniq], rng);
  return { options, answer: options.indexOf(correct) };
}

export const roadKey = (a: string, b: string) => (a < b ? `${a}-${b}` : `${b}-${a}`);

/** Karayolu mesafesi şıkları: doğru değer ve ondan belirgin biçimde farklı üç değer (10'a yuvarlı) */
export function distanceOptions(km: number, rng: Rng): { options: string[]; answer: number } {
  const round10 = (x: number) => Math.max(10, Math.round(x / 10) * 10);
  const correct = round10(km);
  const factors = shuffle([0.55, 0.7, 1.35, 1.6, 1.9, 0.4], rng);
  const out: number[] = [];
  for (const f of factors) {
    const v = round10(km * f);
    if (out.length < 3 && v !== correct && out.every((o) => Math.abs(o - v) >= Math.max(20, correct * 0.12))) out.push(v);
  }
  const fmt = (n: number) => `${n.toLocaleString('tr-TR')} km`;
  return withOptions(fmt(correct), out.map(fmt), rng);
}

export function generateMemleketTest(o: TestOptions): TextQuestion[] {
  const { data } = o;
  const rng = createRng(o.seed);
  const scope = o.scope ?? 'tum';
  const ilByPlaka = new Map(data.iller.map((il) => [il.plaka, il]));
  const inScope = data.iller.filter((il) => scope === 'tum' || il.bolge === scope);
  const owner = uniqueDistricts(data.ilceler);
  const uniqueOf = (plaka: string) => (data.ilceler[plaka] ?? []).filter((n) => owner.get(n) === plaka);
  const near = (plaka: string) => {
    const nb = data.komsular[plaka] ?? [];
    const same = data.iller.filter((x) => x.bolge === ilByPlaka.get(plaka)?.bolge && x.plaka !== plaka).map((x) => x.plaka);
    return shuffle([...new Set([...nb, ...same])], rng);
  };
  const others = (plaka: string) => shuffle(data.iller.map((x) => x.plaka).filter((p) => p !== plaka), rng);

  // Soru türleri: bölge sorusu yalnızca tüm Türkiye kapsamında anlamlı
  const types: TextQuestion['type'][] = ['ilce-il', 'il-ilce', 'komsu', 'mesafe', ...(scope === 'tum' ? (['bolge'] as const) : [])];
  const count = Math.min(o.count ?? 10, 30);
  const questions: TextQuestion[] = [];
  const usedIl = new Set<string>();
  const weightOf = (p: string) => (o.weight ? o.weight(p) : 1);

  let guard = 0;
  while (questions.length < count && guard++ < count * 20) {
    // Ağırlıklı il seçimi, mümkünse tekrar etmeden
    const pool = inScope.filter((il) => !usedIl.has(il.plaka));
    const src = pool.length ? pool : inScope;
    const total = src.reduce((s, il) => s + weightOf(il.plaka), 0);
    let r = rng() * total;
    const il = src.find((x) => (r -= weightOf(x.plaka)) < 0) ?? src[src.length - 1];
    const type = types[questions.length % types.length];
    const q = make(type, il);
    if (!q) continue;
    usedIl.add(il.plaka);
    questions.push(q);
  }
  return shuffle(questions, rng);

  function make(type: TextQuestion['type'], il: { plaka: string; ad: string; bolge: string }): TextQuestion | null {
    const P = il.plaka;
    if (type === 'ilce-il') {
      const list = uniqueOf(P);
      if (!list.length) return null;
      const ilce = pick(list, rng);
      const { options, answer } = withOptions(il.ad, [...near(P), ...others(P)].map((p) => ilByPlaka.get(p)!.ad), rng);
      return { type, prompt: `${ilce} hangi ilin ilçesi?`, options, answer, about: P, explain: `${ilce}, ${il.ad} ilinin ilçesidir.` };
    }
    if (type === 'il-ilce') {
      const list = uniqueOf(P);
      if (!list.length) return null;
      const ilce = pick(list, rng);
      const wrong = [...near(P), ...others(P)].flatMap((p) => uniqueOf(p).slice(0, 2));
      const { options, answer } = withOptions(ilce, shuffle(wrong, rng), rng);
      return { type, prompt: `Hangisi ${il.ad} ilinin ilçesi?`, options, answer, about: P, explain: `${ilce}, ${il.ad} ilinin ilçesidir.` };
    }
    if (type === 'bolge') {
      const correct = data.bolgeAd[il.bolge];
      const { options, answer } = withOptions(correct, shuffle(Object.values(data.bolgeAd), rng), rng);
      return { type, prompt: `${il.ad} hangi bölgede?`, options, answer, about: P, explain: `${il.ad}, ${correct} Bölgesi'ndedir.` };
    }
    if (type === 'komsu') {
      const nb = data.komsular[P] ?? [];
      if (!nb.length) return null;
      const correct = ilByPlaka.get(pick(nb, rng))!.ad;
      const sameRegionNon = data.iller.filter((x) => x.bolge === il.bolge && x.plaka !== P && !nb.includes(x.plaka)).map((x) => x.ad);
      const rest = others(P).filter((p) => !nb.includes(p)).map((p) => ilByPlaka.get(p)!.ad);
      const { options, answer } = withOptions(correct, [...shuffle(sameRegionNon, rng), ...rest], rng);
      return {
        type, prompt: `Hangisi ${il.ad} ile komşu?`, options, answer, about: P,
        explain: `${il.ad} ilinin komşuları: ${nb.map((p) => ilByPlaka.get(p)!.ad).sort((a, b) => a.localeCompare(b, 'tr')).join(', ')}.`,
      };
    }
    // mesafe: kapsamdaki ilden, çok yakın olmayan bir ile karayolu
    const candidates = others(P).filter((p) => (data.karayolu[roadKey(P, p)] ?? 0) >= 80);
    if (!candidates.length) return null;
    const other = ilByPlaka.get(candidates[0])!;
    const km = data.karayolu[roadKey(P, other.plaka)];
    const { options, answer } = distanceOptions(km, rng);
    return {
      type, prompt: `${il.ad} ile ${other.ad} arası karayoluyla yaklaşık kaç km?`, options, answer, about: P,
      explain: `${il.ad} ile ${other.ad} arası karayoluyla yaklaşık ${km.toLocaleString('tr-TR')} km.`,
    };
  }
}
