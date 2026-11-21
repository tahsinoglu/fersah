import { describe, expect, it } from 'vitest';
import { accusative, capitalsOf, factOf } from './content';

describe('içerik', () => {
  it('belirtme hâli eki ünlü uyumuna uyar', () => {
    expect(accusative('Kastamonu')).toBe("Kastamonu'yu");
    expect(accusative('Rize')).toBe("Rize'yi");
    expect(accusative('Muş')).toBe("Muş'u");
    expect(accusative('Ankara')).toBe("Ankara'yı");
    expect(accusative('Bingöl')).toBe("Bingöl'ü");
    expect(accusative('Kenya')).toBe("Kenya'yı");
    expect(accusative('Mısır')).toBe("Mısır'ı");
  });
  it('81 ilin hepsinin bilgi kartı ve kaynağı var', () => {
    for (let i = 1; i <= 81; i++) {
      const f = factOf('memleket', String(i).padStart(2, '0'));
      expect(f?.metin.length).toBeGreaterThan(10);
      expect(f?.kaynak).toMatch(/^https:\/\/tr\.wikipedia\.org\/wiki\//);
    }
  });
  it('başkentler Natural Earth verisinden', () => {
    expect(capitalsOf('TUR')).toEqual(['Ankara']);
    expect(capitalsOf('ZAF')).toHaveLength(3);
  });
});
