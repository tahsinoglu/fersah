import { createRng, shuffle, weightedSample, type Rng } from './random';
import type { ModeId, Question, QuestionKind, QuizItem, RoundPlan } from './types';

export interface GenerateOptions {
  pool: QuizItem[];
  mode: ModeId;
  /** Soru sayısı ("hepsi" modunda yok sayılır) */
  count?: number;
  seed: number | string;
  /** Aralıklı tekrar ağırlığı; verilmezse eşit */
  weight?: (id: string) => number;
  /** Komşu yerler: çeldiricileri daha öğretici yapmak için */
  neighbors?: (id: string) => string[];
}

export const DEFAULT_COUNT = 10;

/** Dört şık: hedef + 3 çeldirici. Çeldiricilerin yarısına kadarı komşu ya da aynı gruptan. */
export function pickOptions(target: QuizItem, pool: QuizItem[], rng: Rng, neighbors?: (id: string) => string[]): string[] {
  const others = pool.filter((p) => p.id !== target.id);
  const near = new Set([...(neighbors?.(target.id) ?? []), ...others.filter((o) => o.groupId === target.groupId).map((o) => o.id)]);
  const nearPool = shuffle(others.filter((o) => near.has(o.id)), rng);
  const chosen: QuizItem[] = nearPool.slice(0, Math.min(2, nearPool.length));
  const rest = shuffle(others.filter((o) => !chosen.includes(o)), rng);
  while (chosen.length < 3 && rest.length) chosen.push(rest.shift()!);
  return shuffle([target.id, ...chosen.map((c) => c.id)], rng);
}

function makeQuestion(kind: QuestionKind, target: QuizItem, pool: QuizItem[], rng: Rng, neighbors?: (id: string) => string[]): Question {
  if (kind === 'neresi') return { kind, target: target.id, options: pickOptions(target, pool, rng, neighbors) };
  if (kind === 'plaka' || kind === 'bayrak') {
    return { kind, target: target.id, options: pickOptions(target, pool, rng, neighbors), variant: rng() < 0.5 ? 'kod' : 'ad' };
  }
  return { kind, target: target.id };
}

export function generateRound(o: GenerateOptions): RoundPlan {
  const rng = createRng(o.seed);
  if (o.pool.length === 0) return { mode: o.mode, questions: [] };
  if (o.mode === 'hepsi') {
    return { mode: 'hepsi', questions: shuffle(o.pool, rng).map((t) => ({ kind: 'bul', target: t.id })) };
  }
  const n = Math.min(o.count ?? DEFAULT_COUNT, o.pool.length);
  const targets = weightedSample(o.pool, n, (it) => o.weight?.(it.id) ?? 1, rng);
  return { mode: o.mode, questions: targets.map((t) => makeQuestion(o.mode as QuestionKind, t, o.pool, rng, o.neighbors)) };
}

/** Günün Haritası: herkese aynı 10 soru, karışık türlerde. */
/** 5. soru bölüme özeldir (Memleket'te plaka, Cihan'da bayrak) */
export const DAILY_KINDS: (QuestionKind | 'ozel')[] = ['bul', 'neresi', 'bul', 'yakin', 'ozel', 'neresi', 'bul', 'yakin', 'neresi', 'bul'];

export function generateDaily(
  pool: QuizItem[],
  seed: string,
  neighbors?: (id: string) => string[],
  special: 'plaka' | 'bayrak' = 'plaka',
): RoundPlan {
  const rng = createRng(seed);
  // Havuzu kararlı sıraya koy ki veri sırası değişse de aynı gün aynı sorular gelsin
  const sorted = [...pool].sort((a, b) => (a.id < b.id ? -1 : 1));
  const targets = shuffle(sorted, rng).slice(0, DAILY_KINDS.length);
  return {
    mode: 'gunluk',
    questions: targets.map((t, i) => {
      const k = DAILY_KINDS[i];
      return makeQuestion(k === 'ozel' ? special : k, t, sorted, rng, neighbors);
    }),
  };
}
