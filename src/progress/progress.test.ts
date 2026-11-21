import { describe, expect, it } from 'vitest';
import { masteryOf, review, weightOf } from './leitner';
import { streaks } from './store';

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
