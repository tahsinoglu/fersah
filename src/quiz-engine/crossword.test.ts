import { describe, expect, it } from 'vitest';
import { cellsOf, generateCrossword, toGridLetters, type ClueInput } from './crossword';

const IL = ['Adana', 'Rize', 'Sinop', 'Bursa', 'Konya', 'Ankara', 'İzmir', 'Iğdır', 'Muğla', 'Çorum', 'Şırnak', 'Düzce', 'Bitlis', 'Kars', 'Tokat', 'Ordu', 'Van', 'Edirne', 'Hatay', 'Ağrı', 'Kahramanmaraş', 'Eskişehir', 'Trabzon', 'Giresun'];
const clues: ClueInput[] = IL.map((a) => ({ answer: a, clue: `${a} ipucu` }));

/** Izgaradaki her yatay/dikey (2+ harfli) dizi bir yerleştirilmiş kelime olmalı */
function runs(cells: Map<string, string>, rows: number, cols: number) {
  const out: string[] = [];
  for (const dir of ['yatay', 'dikey'] as const) {
    const outer = dir === 'yatay' ? rows : cols;
    const inner = dir === 'yatay' ? cols : rows;
    for (let a = 0; a < outer; a++) {
      let cur = '';
      let start = '';
      for (let b = 0; b <= inner; b++) {
        const k = dir === 'yatay' ? `${a},${b}` : `${b},${a}`;
        const ch = b < inner ? cells.get(k) : undefined;
        if (ch) {
          if (!cur) start = `${dir}:${k}`;
          cur += ch;
        } else {
          if (cur.length >= 2) out.push(`${start}:${cur}`);
          cur = '';
        }
      }
    }
  }
  return out.sort();
}

describe('çengel bulmaca', () => {
  it('Türkçe büyük harf ve sadeleştirme', () => {
    expect(toGridLetters('İzmir')).toBe('İZMİR');
    expect(toGridLetters('Iğdır')).toBe('IĞDIR');
    expect(toGridLetters('Bogotá')).toBe('BOGOTA');
    expect(toGridLetters('Kuzey Makedonya')).toBe('KUZEYMAKEDONYA');
    expect(toGridLetters("Côte d'Ivoire")).toBe('COTEDIVOİRE'); // küçük i → İ (Türkçe kural)
  });

  it('geçerli ızgara: çakışma yok, istenmeyen kelime oluşmaz, numaralar sıralı', () => {
    for (let s = 0; s < 25; s++) {
      const cw = generateCrossword(clues, { seed: `t${s}`, target: 10, maxSize: 12 });
      expect(cw.words.length).toBeGreaterThanOrEqual(7);
      expect(cw.rows).toBeLessThanOrEqual(12);
      expect(cw.cols).toBeLessThanOrEqual(12);
      for (const w of cw.words) {
        cellsOf(w).forEach(([r, c], i) => expect(cw.cells.get(`${r},${c}`)).toBe(w.letters[i]));
      }
      const placed = cw.words.map((w) => `${w.dir}:${w.row},${w.col}:${w.letters}`).sort();
      expect(runs(cw.cells, cw.rows, cw.cols)).toEqual(placed);
      // Aynı kelime iki kez yok
      expect(new Set(cw.words.map((w) => w.letters)).size).toBe(cw.words.length);
    }
  });

  it('aynı tohum aynı bulmacayı verir', () => {
    const a = generateCrossword(clues, { seed: 'x' });
    const b = generateCrossword(clues, { seed: 'x' });
    expect(a.words.map((w) => w.letters)).toEqual(b.words.map((w) => w.letters));
  });
});
