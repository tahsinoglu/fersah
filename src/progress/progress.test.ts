import { describe, expect, it } from 'vitest';
import { masteryOf, review, weightOf } from './leitner';
import { mergeProgress, streaks, type Progress } from './store';

describe('Leitner kutuları', () => {
  it('doğru cevap kutuyu yükseltir, yanlış başa döndürür', () => {
    let c = review(undefined, true);
    expect(c.box).toBe(2);
    c = review(c, true);
    c = review(c, true);
    c = review(c, true);
    c = review(c, true);
    expect(c.box).toBe(5);
    c = review(c, false);
    expect(c.box).toBe(1);
    expect(c.seen).toBe(6);
    expect(c.wrong).toBe(1);
  });
  it('az bilinen yer daha ağır, iyi bilinen hafif', () => {
    expect(weightOf({ box: 1, seen: 3, correct: 0, wrong: 3, last: 0 })).toBeGreaterThan(weightOf(undefined));
    expect(weightOf({ box: 5, seen: 9, correct: 9, wrong: 0, last: 0 })).toBeLessThan(1);
    expect(masteryOf({ box: 5, seen: 9, correct: 9, wrong: 0, last: 0 })).toBe(1);
  });
});

describe('seri', () => {
  it('bugüne ya da düne kadar ardışık günleri sayar', () => {
    expect(streaks(['2026-11-19', '2026-11-20', '2026-11-21'], '2026-11-21')).toEqual({ current: 3, longest: 3 });
    expect(streaks(['2026-11-19', '2026-11-20'], '2026-11-21')).toEqual({ current: 2, longest: 2 });
    expect(streaks(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-20'], '2026-11-22').current).toBe(0);
    expect(streaks(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-20'], '2026-11-22').longest).toBe(3);
  });
});

describe('ilerleme birleştirme', () => {
  const base = (): Progress => ({ v: 1, cards: {}, rounds: [], best: {}, daily: {}, days: [] });
  it('iki cihazın ilerlemesi kayıpsız birleşir', () => {
    const a = base();
    const b = base();
    a.cards['memleket:34'] = { box: 2, seen: 2, correct: 1, wrong: 1, last: 10 };
    b.cards['memleket:34'] = { box: 4, seen: 5, correct: 4, wrong: 1, last: 20 };
    b.cards['cihan:KEN'] = { box: 1, seen: 1, correct: 0, wrong: 1, last: 5 };
    a.rounds.push({ at: 1, atlas: 'memleket', scope: 'tum', mode: 'bul', total: 10, correct: 5, score: 500, ms: 1 });
    b.rounds.push({ at: 1, atlas: 'memleket', scope: 'tum', mode: 'bul', total: 10, correct: 5, score: 500, ms: 1 });
    b.rounds.push({ at: 2, atlas: 'cihan', scope: 'tum', mode: 'bul', total: 10, correct: 5, score: 500, ms: 1 });
    a.best['memleket:tum:hepsi'] = 90000;
    b.best['memleket:tum:hepsi'] = 80000;
    a.days = ['2026-11-20'];
    b.days = ['2026-11-21'];
    const m = mergeProgress(a, b);
    expect(m.cards['memleket:34'].seen).toBe(5);
    expect(m.cards['cihan:KEN']).toBeTruthy();
    expect(m.rounds).toHaveLength(2);
    expect(m.best['memleket:tum:hepsi']).toBe(80000);
    expect(m.days).toEqual(['2026-11-20', '2026-11-21']);
  });
});
