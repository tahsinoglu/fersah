import { describe, expect, it } from 'vitest';
import { createRng, hashSeed, shuffle, weightedSample } from './random';
import { DAILY_KINDS, generateDaily, generateRound, pickOptions } from './generate';
import { dailyKey, dailyNumber, dailySeed } from './daily';
import type { QuizItem } from './types';

const pool: QuizItem[] = Array.from({ length: 30 }, (_, i) => ({ id: String(i + 1).padStart(2, '0'), name: `Yer ${i + 1}`, groupId: i < 10 ? 'a' : i < 20 ? 'b' : 'c' }));

describe('rastgelelik', () => {
  it('aynı tohum aynı diziyi verir', () => {
    const a = createRng('x');
    const b = createRng('x');
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(hashSeed('a')).not.toBe(hashSeed('b'));
  });
  it('karıştırma elemanları korur', () => {
    expect(shuffle([1, 2, 3, 4], createRng(1)).sort()).toEqual([1, 2, 3, 4]);
  });
  it('ağırlıklı örnekleme tekrarsızdır ve ağırlığa uyar', () => {
    const s = weightedSample(pool, 10, () => 1, createRng(5));
    expect(new Set(s.map((x) => x.id)).size).toBe(10);
    // Ağırlığı çok yüksek olan neredeyse her zaman seçilir
    let hits = 0;
    for (let i = 0; i < 200; i++) if (weightedSample(pool, 1, (x) => (x.id === '07' ? 1000 : 1), createRng(i))[0].id === '07') hits++;
    expect(hits).toBeGreaterThan(180);
  });
});

describe('soru üretimi', () => {
  it('10 farklı hedef, dört farklı şık, hedef şıklarda', () => {
    const r = generateRound({ pool, mode: 'neresi', seed: 'test' });
    expect(r.questions).toHaveLength(10);
    expect(new Set(r.questions.map((q) => q.target)).size).toBe(10);
    for (const q of r.questions) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options).toContain(q.target);
    }
  });
  it('çeldiricilerin bir kısmı komşu/aynı gruptan', () => {
    const t = pool[0];
    const opts = pickOptions(t, pool, createRng(3));
    expect(opts.filter((id) => id !== t.id && pool.find((p) => p.id === id)!.groupId === 'a').length).toBeGreaterThanOrEqual(2);
  });
  it('plaka/bayrak soruları dört şık ve bir yön taşır', () => {
    const r = generateRound({ pool, mode: 'plaka', seed: 'p' });
    for (const q of r.questions) {
      expect(q.options).toHaveLength(4);
      expect(['kod', 'ad']).toContain(q.variant);
    }
    expect(new Set(r.questions.map((q) => q.variant)).size).toBe(2);
  });
  it('küçük havuzda soru sayısı havuzu aşmaz', () => {
    expect(generateRound({ pool: pool.slice(0, 4), mode: 'bul', seed: 1 }).questions).toHaveLength(4);
  });
  it('"Hepsini Bitir" her yeri tam bir kez sorar', () => {
    const r = generateRound({ pool, mode: 'hepsi', seed: 2 });
    expect(r.questions.map((q) => q.target).sort()).toEqual(pool.map((p) => p.id).sort());
  });
});

describe('Günün Haritası', () => {
  it('aynı gün aynı sorular, havuz sırası önemsiz', () => {
    const a = generateDaily(pool, 'gunluk:memleket:2026-11-21');
    const b = generateDaily([...pool].reverse(), 'gunluk:memleket:2026-11-21');
    expect(a).toEqual(b);
    expect(a.questions.map((q) => q.kind)).toEqual(DAILY_KINDS.map((k) => (k === 'ozel' ? 'plaka' : k)));
    expect(generateDaily(pool, 'x', undefined, 'bayrak').questions[4].kind).toBe('bayrak');
    expect(generateDaily(pool, 'gunluk:memleket:2026-11-22')).not.toEqual(a);
  });
  it('Memleket günü Türkiye saatine, Cihan günü UTC\'ye göre değişir', () => {
    // 21 Kasım 22:30 UTC = 22 Kasım 01:30 Türkiye
    const t = new Date(Date.UTC(2026, 10, 21, 22, 30));
    expect(dailyKey('memleket', t)).toBe('2026-11-22');
    expect(dailyKey('cihan', t)).toBe('2026-11-21');
  });
  it('gün numarası ve tohum', () => {
    expect(dailyNumber('2026-01-01')).toBe(1);
    expect(dailyNumber('2026-11-21')).toBe(325);
    expect(dailySeed('cihan', '2026-11-21')).toBe('gunluk:cihan:2026-11-21');
  });
});
