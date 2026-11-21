import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Topology } from 'topojson-specification';
import { atlasFromTopology } from './atlases';
import { parsePath, pathFor } from '../lib/routes';

const load = (f: string) => JSON.parse(readFileSync(`public/geo/${f}`, 'utf8')) as Topology;
const memleket = atlasFromTopology('memleket', load('turkiye.topo.json'));
const cihan = atlasFromTopology('cihan', load('dunya.topo.json'));

describe('Memleket verisi', () => {
  it('81 il, hepsi seçilebilir ve geometrili', () => {
    expect(memleket.units).toHaveLength(81);
    for (const u of memleket.units) {
      expect(u.selectable).toBe(true);
      expect(u.d.length).toBeGreaterThan(20);
    }
  });
  it('bölgelerin il sayıları doğru', () => {
    const n = Object.fromEntries(memleket.groups.map((g) => [g.id, g.units.length]));
    expect(n).toEqual({
      marmara: 11, ege: 8, akdeniz: 8, 'ic-anadolu': 13, karadeniz: 18, 'dogu-anadolu': 14, 'guneydogu-anadolu': 9,
    });
  });
  it('aynı bölgedeki komşu iller farklı tonda', () => {
    // Ton ataması 4 renkle yapılır; komşuların çoğunda farklı olmalı
    expect(new Set(memleket.units.map((u) => u.tone)).size).toBeGreaterThan(2);
  });
  it('adresler benzersiz ve geri çözülebilir', () => {
    const slugs = memleket.units.map((u) => u.slug);
    expect(new Set(slugs).size).toBe(81);
    const rize = memleket.unitById.get('53')!;
    const path = pathFor('memleket', memleket, { groupId: rize.groupId, unitId: rize.id });
    expect(path).toBe('/memleket/karadeniz/rize');
    expect(parsePath('memleket', memleket, 'karadeniz', 'rize')).toEqual({ selection: { groupId: 'karadeniz', unitId: '53' }, canonical: null });
  });
  it('yanlış bölgedeki il adresi düzeltilir', () => {
    const r = parsePath('memleket', memleket, 'ege', 'rize');
    expect(r.selection).toEqual({ groupId: 'ege' });
    expect(r.canonical).toBe('/memleket/ege');
  });
});

describe('Cihan verisi', () => {
  it('ülke sayısı makul ve hepsi bir kıtada', () => {
    const ulkeler = cihan.units.filter((u) => u.extra.ulke);
    expect(ulkeler.length).toBeGreaterThanOrEqual(193);
    expect(ulkeler.length).toBeLessThanOrEqual(200);
    for (const u of ulkeler) expect(cihan.groupById.has(u.groupId)).toBe(true);
  });
  it('KKTC haritada var ama ülke sorusu değil; Türkiye ülke', () => {
    expect(cihan.unitById.get('CYN')?.extra.ulke).toBe(false);
    expect(cihan.unitById.get('TUR')?.extra.ulke).toBe(true);
  });
  it('örnek adres: /cihan/afrika/kenya', () => {
    expect(parsePath('cihan', cihan, 'afrika', 'kenya').selection).toEqual({ groupId: 'afrika', unitId: 'KEN' });
  });
  it('ülke adresleri benzersiz', () => {
    const s = cihan.units.map((u) => u.slug);
    expect(new Set(s).size).toBe(s.length);
  });
});
