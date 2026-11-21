import { describe, expect, it } from 'vitest';
import type { Feature, Polygon } from 'geojson';
import { distanceToFeatureKm, haversineKm } from './geo';
import { answerScore, nearShotScore, shareText, tileOf } from './score';

describe('haversine', () => {
  it('Ankara–İstanbul yaklaşık 350 km', () => {
    const d = haversineKm([32.85, 39.93], [28.98, 41.01]);
    expect(d).toBeGreaterThan(340);
    expect(d).toBeLessThan(360);
  });
  it('ekvatorda 1 derece ≈ 111 km', () => {
    expect(haversineKm([0, 0], [1, 0])).toBeCloseTo(111.2, 0);
  });
});

describe('Yakın Atış', () => {
  const kare: Feature<Polygon> = {
    type: 'Feature', properties: {},
    geometry: { type: 'Polygon', coordinates: [[[30, 38], [30, 40], [32, 40], [32, 38], [30, 38]]] },
  };
  it('içindeki nokta 0 km ve 1000 puan', () => {
    expect(distanceToFeatureKm(kare, [31, 39]).km).toBe(0);
    expect(nearShotScore(0, 150)).toBe(1000);
  });
  it('dışarıdaki nokta en yakın kenara ölçülür', () => {
    const { km } = distanceToFeatureKm(kare, [33, 39]); // doğu kenarına 1 boylam ≈ 86 km (39°K)
    expect(km).toBeGreaterThan(80);
    expect(km).toBeLessThan(90);
  });
  it('puan uzaklıkla azalır, 0–1000 aralığında', () => {
    const s = [0, 50, 150, 500, 5000].map((d) => nearShotScore(d, 150));
    expect(s[0]).toBe(1000);
    for (let i = 1; i < s.length; i++) expect(s[i]).toBeLessThan(s[i - 1]);
    expect(s[4]).toBeGreaterThanOrEqual(0);
    expect(nearShotScore(150, 150)).toBe(368);
  });
});

describe('puan ve paylaşım', () => {
  it('doğru cevap hızlıysa ek puan alır', () => {
    expect(answerScore(false, 500)).toBe(0);
    expect(answerScore(true, 0)).toBe(150);
    expect(answerScore(true, 20000)).toBe(100);
  });
  it('paylaşım metni cevap içermez', () => {
    const tiles = [tileOf('bul', true), tileOf('yakin', false, 500), tileOf('neresi', false)];
    const text = shareText({ title: 'Memleket · Günün Haritası', number: 325, tiles, score: 1234, ms: 102000 });
    expect(text).toBe('Memleket · Günün Haritası #325\n🟩🟨🟥\n1/3 · 1234 puan · 1:42');
  });
});
