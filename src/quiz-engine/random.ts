/** Metinden 32 bit tohum (FNV-1a) */
export function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export type Rng = () => number;

/** Tohumlu, tekrarlanabilir rastgele sayı üreteci (mulberry32), [0,1) */
export function createRng(seed: number | string): Rng {
  let a = typeof seed === 'string' ? hashSeed(seed) : seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Ağırlıklı, yerine koymadan örnekleme */
export function weightedSample<T>(items: readonly T[], count: number, weight: (t: T) => number, rng: Rng): T[] {
  const pool = items.map((item) => ({ item, w: Math.max(0, weight(item)) }));
  const out: T[] = [];
  while (out.length < count && pool.length) {
    const total = pool.reduce((s, p) => s + p.w, 0);
    let idx: number;
    if (total <= 0) idx = Math.floor(rng() * pool.length);
    else {
      let r = rng() * total;
      idx = pool.findIndex((p) => (r -= p.w) < 0);
      if (idx < 0) idx = pool.length - 1;
    }
    out.push(pool[idx].item);
    pool.splice(idx, 1);
  }
  return out;
}
