import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Topology } from 'topojson-specification';
import { atlasFromTopology } from '../data/atlases';
import { BOLGELER, ILLER } from '../data/memleket';
import ilcelerJson from '../data/generated/ilceler.json';
import karayoluJson from '../data/generated/karayolu.json';

const ilceler = ilcelerJson as Record<string, string[]>;
const karayolu = karayoluJson as Record<string, number>;
import { createRng } from './random';
import { distanceOptions, generateMemleketTest, roadKey, uniqueDistricts, type TestData } from './memleketTest';

const atlas = atlasFromTopology('memleket', JSON.parse(readFileSync('public/geo/turkiye.topo.json', 'utf8')) as Topology);
const data: TestData = {
  iller: ILLER,
  bolgeAd: Object.fromEntries(BOLGELER.map((b) => [b.id, b.ad])),
  ilceler,
  komsular: Object.fromEntries(atlas.units.map((u) => [u.id, u.neighbors])),
  karayolu,
};

describe('ilçe verisi', () => {
  it('81 il, 973 ilçe', () => {
    expect(Object.keys(ilceler)).toHaveLength(81);
    expect(Object.values(ilceler).reduce((n, l) => n + l.length, 0)).toBe(973);
    expect(ilceler['53']).toContain('Ardeşen');
  });
  it('birden çok ilde geçen ilçe adı sorulmaz', () => {
    const owner = uniqueDistricts(ilceler);
    expect(owner.has('Merkez')).toBe(false);
    expect(owner.get('Ardeşen')).toBe('53');
  });
  it('karayolu mesafesi simetrik anahtarla okunur', () => {
    expect(karayolu[roadKey('06', '34')]).toBeGreaterThan(400);
    expect(karayolu[roadKey('34', '06')]).toBe(karayolu[roadKey('06', '34')]);
  });
});

describe('Memleket Testi', () => {
  it('10 soru, her birinde 4 farklı şık ve doğru cevap şıklarda', () => {
    const qs = generateMemleketTest({ data, seed: 'a' });
    expect(qs).toHaveLength(10);
    for (const q of qs) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
    }
    expect(new Set(qs.map((q) => q.type)).size).toBeGreaterThanOrEqual(4);
  });
  it('cevaplar gerçekten doğru', () => {
    const ilAd = new Map(ILLER.map((il) => [il.ad, il.plaka]));
    for (let s = 0; s < 30; s++) {
      for (const q of generateMemleketTest({ data, seed: s })) {
        const right = q.options[q.answer];
        if (q.type === 'ilce-il') {
          const ilce = q.prompt.replace(' hangi ilin ilçesi?', '');
          expect(ilceler[ilAd.get(right)!]).toContain(ilce);
          // Yanlış şıklarda bu ilçe yok
          for (const o of q.options) if (o !== right) expect(ilceler[ilAd.get(o)!]).not.toContain(ilce);
        }
        if (q.type === 'il-ilce') {
          expect(ilceler[q.about]).toContain(right);
          for (const o of q.options) if (o !== right) expect(ilceler[q.about]).not.toContain(o);
        }
        if (q.type === 'disinda') {
          expect(ilceler[q.about]).not.toContain(right);
          for (const o of q.options) if (o !== right) expect(ilceler[q.about]).toContain(o);
        }
        if (q.type === 'ilce-sayisi') expect(Number(right)).toBe(ilceler[q.about].length);
        if (q.type === 'yakin-il') {
          const km = (n: string) => karayolu[roadKey(q.about, ilAd.get(n)!)];
          for (const o of q.options) if (o !== right) expect(km(o)).toBeGreaterThan(km(right));
        }
        if (q.type === 'komsu') {
          expect(data.komsular[q.about]).toContain(ilAd.get(right));
          for (const o of q.options) if (o !== right) expect(data.komsular[q.about]).not.toContain(ilAd.get(o));
        }
      }
    }
  });
  it('bölge kapsamında sorular o bölgenin illeriyle ilgili', () => {
    const qs = generateMemleketTest({ data, seed: 'k', scope: 'karadeniz' });
    const kd = new Set(ILLER.filter((il) => il.bolge === 'karadeniz').map((il) => il.plaka));
    for (const q of qs) expect(kd.has(q.about)).toBe(true);
    expect(qs.some((q) => q.type === 'bolge')).toBe(false);
  });
  it('mesafe şıkları birbirinden belirgin farklı', () => {
    const { options, answer } = distanceOptions(453, createRng(1));
    expect(options[answer]).toBe('450 km');
    expect(new Set(options).size).toBe(4);
  });
});
