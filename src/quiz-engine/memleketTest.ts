import { createRng, shuffle, type Rng } from './random';

/** Haritasız, metin tabanlı soru (Memleket Testi) */
export interface TextQuestion {
  type: 'ilce-il' | 'il-ilce' | 'disinda' | 'bolge' | 'komsu' | 'mesafe' | 'yakin-il' | 'ilce-sayisi';
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
  /** plaka → ilçe → mahalle sayısı (ilçe büyüklüğü/bilinirliği için kaba ölçü) */
  buyukluk?: Record<string, Record<string, number>>;
}

/** Sorulan türlerin kabaca zorluğu (tur kolaydan zora ilerler) */
const DIFFICULTY: Record<TextQuestion['type'], number> = {
  bolge: 0, 'ilce-sayisi': 1, komsu: 1, 'il-ilce': 2, 'yakin-il': 2, 'ilce-il': 3, disinda: 3, mesafe: 3,
};
/** Mesafe sorularında ikinci uç: herkesin bildiği büyük şehirler */
const BUYUK = ['34', '06', '35', '16', '07', '01', '42', '27', '61', '55', '21', '25'];

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
  const ad = (p: string) => ilByPlaka.get(p)!.ad;
  const inScope = data.iller.filter((il) => scope === 'tum' || il.bolge === scope);
  const owner = uniqueDistricts(data.ilceler);
  const uniqueOf = (plaka: string) => (data.ilceler[plaka] ?? []).filter((n) => owner.get(n) === plaka);
  const size = (plaka: string, ilce: string) => data.buyukluk?.[plaka]?.[ilce] ?? 10;
  /** Daha büyük (çok mahalleli) ilçeler daha sık sorulur: çok küçük köy ilçeleri tahmine döner */
  const pickDistrict = (plaka: string): string | null => {
    const list = uniqueOf(plaka);
    if (!list.length) return null;
    const total = list.reduce((t, n) => t + Math.sqrt(size(plaka, n)), 0);
    let r = rng() * total;
    return list.find((n) => (r -= Math.sqrt(size(plaka, n))) < 0) ?? list[0];
  };
  const nb = (p: string) => data.komsular[p] ?? [];
  /** İki adım ötedeki iller (komşunun komşusu): inandırıcı ama yanlış şıklar */
  const twoHop = (p: string) => shuffle([...new Set(nb(p).flatMap(nb))].filter((x) => x !== p && !nb(p).includes(x)), rng);
  const sameRegion = (p: string) => shuffle(data.iller.filter((x) => x.bolge === ilByPlaka.get(p)?.bolge && x.plaka !== p).map((x) => x.plaka), rng);
  const others = (p: string) => shuffle(data.iller.map((x) => x.plaka).filter((x) => x !== p), rng);
  const road = (a: string, b: string) => data.karayolu[roadKey(a, b)];

  const types: TextQuestion['type'][] = ['ilce-il', 'il-ilce', 'disinda', 'komsu', 'mesafe', 'yakin-il', 'ilce-sayisi', ...(scope === 'tum' ? (['bolge'] as const) : [])];
  const count = Math.min(o.count ?? 10, 30);
  const questions: TextQuestion[] = [];
  const usedIl = new Set<string>();
  const usedType = new Map<string, number>();
  const weightOf = (p: string) => (o.weight ? o.weight(p) : 1);

  let guard = 0;
  while (questions.length < count && guard++ < count * 30) {
    const pool = inScope.filter((il) => !usedIl.has(il.plaka));
    const src = pool.length ? pool : inScope;
    const total = src.reduce((t, il) => t + weightOf(il.plaka), 0);
    let r = rng() * total;
    const il = src.find((x) => (r -= weightOf(x.plaka)) < 0) ?? src[src.length - 1];
    // En az sorulmuş türlerden biri (çeşitlilik), aynı tür en çok 2 kez
    const min = Math.min(...types.map((t) => usedType.get(t) ?? 0));
    const fresh = types.filter((t) => (usedType.get(t) ?? 0) === min);
    const type = pick(fresh, rng);
    const q = make(type, il);
    if (!q) {
      usedType.set(type, (usedType.get(type) ?? 0) + 0.5);
      continue;
    }
    usedIl.add(il.plaka);
    usedType.set(type, (usedType.get(type) ?? 0) + 1);
    questions.push(q);
  }
  // Kolaydan zora; aynı zorlukta rastgele
  const order = new Map(questions.map((q) => [q, DIFFICULTY[q.type] + rng() * 1.5]));
  return [...questions].sort((a, b) => order.get(a)! - order.get(b)!);

  function make(type: TextQuestion['type'], il: { plaka: string; ad: string; bolge: string }): TextQuestion | null {
    const P = il.plaka;
    if (type === 'ilce-il') {
      const ilce = pickDistrict(P);
      if (!ilce) return null;
      // Yanlış şıklar komşu ve yakın illerden: "doğu mu batı mı" ile elenemesin
      const { options, answer } = withOptions(il.ad, [...nb(P), ...twoHop(P), ...others(P)].map(ad), rng);
      return { type, prompt: `${ilce} hangi ilin ilçesi?`, options, answer, about: P, explain: `${ilce}, ${il.ad} ilinin ilçesidir. ${il.ad} ilinin komşuları: ${nb(P).map(ad).join(', ')}.` };
    }
    if (type === 'il-ilce') {
      const ilce = pickDistrict(P);
      if (!ilce) return null;
      const wrong = [...nb(P), ...twoHop(P)].flatMap((p) => shuffle(uniqueOf(p), rng).slice(0, 1).map((n) => n));
      if (wrong.length < 3) return null;
      const { options, answer } = withOptions(ilce, shuffle(wrong, rng), rng);
      const whose = (n: string) => ad(owner.get(n)!);
      return {
        type, prompt: `Hangisi ${il.ad} ilinin ilçesi?`, options, answer, about: P,
        explain: `${ilce}, ${il.ad} ilinin ilçesidir. ${options.filter((x) => x !== ilce).map((x) => `${x}: ${whose(x)}`).join(' · ')}`,
      };
    }
    if (type === 'disinda') {
      // Üçü bu ilin, biri komşu ilin ilçesi
      const own = shuffle(uniqueOf(P), rng).sort((a, b) => size(P, b) - size(P, a)).slice(0, 6);
      if (own.length < 3) return null;
      const three = shuffle(own, rng).slice(0, 3);
      const from = nb(P).find((p) => uniqueOf(p).length);
      if (!from) return null;
      const odd = shuffle(uniqueOf(from), rng)[0];
      const options = shuffle([...three, odd], rng);
      return {
        type, prompt: `Hangisi ${il.ad} ilinin ilçesi değildir?`, options, answer: options.indexOf(odd), about: P,
        explain: `${odd}, komşu il ${ad(from)} ilinin ilçesidir; diğerleri ${il.ad} ilindedir.`,
      };
    }
    if (type === 'bolge') {
      const correct = data.bolgeAd[il.bolge];
      const { options, answer } = withOptions(correct, shuffle(Object.values(data.bolgeAd), rng), rng);
      return { type, prompt: `${il.ad} hangi bölgede?`, options, answer, about: P, explain: `${il.ad}, ${correct} Bölgesi'ndedir.` };
    }
    if (type === 'komsu') {
      const n = nb(P);
      if (!n.length) return null;
      const correct = ad(pick(n, rng));
      // Komşunun komşusu (yakın ama sınır yok) en zor yanlış şıktır
      const { options, answer } = withOptions(correct, [...twoHop(P), ...sameRegion(P).filter((x) => !n.includes(x))].map(ad), rng);
      return {
        type, prompt: `Hangisi ${il.ad} ile komşu?`, options, answer, about: P,
        explain: `${il.ad} ilinin komşuları: ${n.map(ad).sort((a, b) => a.localeCompare(b, 'tr')).join(', ')}.`,
      };
    }
    if (type === 'yakin-il') {
      // Karayoluyla en yakın: komşulardan en yakını; şıklar biraz daha uzak illerden
      const cands = [...nb(P), ...twoHop(P)].filter((x) => road(P, x)).sort((a, b) => road(P, a) - road(P, b));
      if (cands.length < 4) return null;
      const best = cands[0];
      const rest = cands.slice(1).filter((x) => road(P, x) >= road(P, best) * 1.25);
      if (rest.length < 3) return null;
      const picks = shuffle(rest.slice(0, 6), rng).slice(0, 3);
      const options = shuffle([best, ...picks], rng).map(ad);
      return {
        type, prompt: `Karayoluyla ${il.ad} iline en yakın il hangisi?`, options, answer: options.indexOf(ad(best)), about: P,
        explain: [best, ...picks].map((x) => `${ad(x)} ${road(P, x).toLocaleString('tr-TR')} km`).join(' · '),
      };
    }
    if (type === 'ilce-sayisi') {
      const n = (data.ilceler[P] ?? []).length;
      if (n < 3) return null;
      const set = new Set<number>([n]);
      for (const d of shuffle([-4, -3, -2, 2, 3, 4, 5, -5], rng)) if (set.size < 4 && n + d >= 2) set.add(n + d);
      const options = shuffle([...set], rng).map(String);
      return {
        type, prompt: `${il.ad} ilinin kaç ilçesi var?`, options, answer: options.indexOf(String(n)), about: P,
        explain: `${il.ad} ilinin ${n} ilçesi var: ${(data.ilceler[P] ?? []).join(', ')}.`,
      };
    }
    // mesafe: büyük bir şehirle (İstanbul, Ankara, İzmir…) karayolu mesafesi
    const partner = shuffle(BUYUK.filter((b) => b !== P && (road(P, b) ?? 0) >= 80), rng)[0];
    if (!partner) return null;
    const km = road(P, partner);
    const { options, answer } = distanceOptions(km, rng);
    return {
      type, prompt: `${il.ad} ile ${ad(partner)} arası karayoluyla yaklaşık kaç km?`, options, answer, about: P,
      explain: `${il.ad} ile ${ad(partner)} arası karayoluyla yaklaşık ${km.toLocaleString('tr-TR')} km.`,
    };
  }
}
