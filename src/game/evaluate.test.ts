import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Topology } from 'topojson-specification';
import { atlasFromTopology } from '../data/atlases';
import { evaluateChoice, evaluateNear } from './evaluate';

const tr = atlasFromTopology('memleket', JSON.parse(readFileSync('public/geo/turkiye.topo.json', 'utf8')) as Topology);
const dunya = atlasFromTopology('cihan', JSON.parse(readFileSync('public/geo/dunya.topo.json', 'utf8')) as Topology);

describe('cevap değerlendirme', () => {
  it('seçmeli: doğru/yanlış ve puan', () => {
    expect(evaluateChoice('bul', '34', '34', 1000)).toMatchObject({ correct: true, score: 145 });
    expect(evaluateChoice('neresi', '34', '06', 1000)).toMatchObject({ correct: false, score: 0, picked: '06' });
  });
  it('Yakın Atış: Ankara il sınırları içi 1000 puan (gerçek veriyle)', () => {
    const ankara = tr.unitById.get('06')!;
    const a = evaluateNear('06', ankara.feature, [32.85, 39.93], 2000, 150);
    expect(a).toMatchObject({ km: 0, score: 1000, correct: true });
  });
  it('Yakın Atış: İstanbul hedefken Ankara merkezine dokunmak ~200+ km', () => {
    const ist = tr.unitById.get('34')!;
    const a = evaluateNear('34', ist.feature, [32.85, 39.93], 2000, 150);
    expect(a.km!).toBeGreaterThan(200);
    expect(a.km!).toBeLessThan(330);
    expect(a.correct).toBe(false);
  });
  it('Yakın Atış (dünya): Nairobi Kenya içinde', () => {
    expect(evaluateNear('KEN', dunya.unitById.get('KEN')!.feature, [36.82, -1.29], 0, 1500).score).toBe(1000);
  });
  it('haritanın dışına dokunmak 0 puan', () => {
    expect(evaluateNear('34', tr.unitById.get('34')!.feature, null, 0, 150).score).toBe(0);
  });
});
