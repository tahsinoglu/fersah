// Çengel bulmaca üretici (saf TS, tohumlu): kelimeleri kesiştirerek küçük bir ızgaraya yerleştirir.
import { createRng, shuffle } from './random';

export interface ClueInput {
  /** Cevabın görünen hâli (ör. "Kahramanmaraş") */
  answer: string;
  clue: string;
  /** İsteğe bağlı görsel ipucu (bayrak adresi) */
  image?: string;
  /** İlerleme kaydı için yer kimliği */
  about?: string;
}

export type Dir = 'yatay' | 'dikey';

export interface PlacedWord extends ClueInput {
  /** Izgaradaki harfler (BÜYÜK, boşluksuz) */
  letters: string;
  row: number;
  col: number;
  dir: Dir;
  num: number;
}

export interface Crossword {
  rows: number;
  cols: number;
  words: PlacedWord[];
  /** "r,c" → harf */
  cells: Map<string, string>;
}

const TR_UPPER: Record<string, string> = { i: 'İ', ı: 'I' };
const KEEP = new Set('ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZQWX'.split(''));

/** "Bogotá" → "BOGOTA", "Kuzey Makedonya" → "KUZEYMAKEDONYA"; Türkçe harfler korunur */
export function toGridLetters(s: string): string {
  let out = '';
  for (const ch of s) {
    let u = TR_UPPER[ch] ?? ch.toLocaleUpperCase('tr');
    if (!KEEP.has(u)) {
      // Türkçe olmayan aksanlar atılır (É → E); harf olmayanlar (boşluk, kesme) atılır
      const base = u.normalize('NFD').replace(/[̀-ͯ]/g, '');
      u = KEEP.has(base) ? base : '';
    }
    out += u;
  }
  return out;
}

const key = (r: number, c: number) => `${r},${c}`;

interface Draft {
  cells: Map<string, string>;
  words: { w: ClueInput & { letters: string }; row: number; col: number; dir: Dir }[];
  minR: number;
  maxR: number;
  minC: number;
  maxC: number;
}

function canPlace(d: Draft, letters: string, row: number, col: number, dir: Dir, maxSize: number): number {
  const dr = dir === 'dikey' ? 1 : 0;
  const dc = dir === 'yatay' ? 1 : 0;
  const n = letters.length;
  // Baştan önce ve sondan sonra boş olmalı
  if (d.cells.has(key(row - dr, col - dc)) || d.cells.has(key(row + dr * n, col + dc * n))) return -1;
  let crossings = 0;
  for (let i = 0; i < n; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    const cur = d.cells.get(key(r, c));
    if (cur !== undefined) {
      if (cur !== letters[i]) return -1;
      crossings++;
      continue;
    }
    // Yeni hücrenin yanları (kelimeye dik yönde) boş olmalı: kazara oluşan kelime olmasın
    if (d.cells.has(key(r + dc, c + dr)) || d.cells.has(key(r - dc, c - dr))) return -1;
  }
  const minR = Math.min(d.minR, row);
  const maxR = Math.max(d.maxR, row + dr * (n - 1));
  const minC = Math.min(d.minC, col);
  const maxC = Math.max(d.maxC, col + dc * (n - 1));
  if (maxR - minR + 1 > maxSize || maxC - minC + 1 > maxSize) return -1;
  return crossings;
}

function place(d: Draft, w: ClueInput & { letters: string }, row: number, col: number, dir: Dir) {
  const dr = dir === 'dikey' ? 1 : 0;
  const dc = dir === 'yatay' ? 1 : 0;
  for (let i = 0; i < w.letters.length; i++) d.cells.set(key(row + dr * i, col + dc * i), w.letters[i]);
  d.words.push({ w, row, col, dir });
  d.minR = Math.min(d.minR, row);
  d.maxR = Math.max(d.maxR, row + dr * (w.letters.length - 1));
  d.minC = Math.min(d.minC, col);
  d.maxC = Math.max(d.maxC, col + dc * (w.letters.length - 1));
}

function attempt(pool: (ClueInput & { letters: string })[], target: number, maxSize: number, rng: () => number): Draft {
  const d: Draft = { cells: new Map(), words: [], minR: 0, maxR: 0, minC: 0, maxC: 0 };
  const [first, ...rest] = pool;
  place(d, first, 0, 0, rng() < 0.5 ? 'yatay' : 'dikey');
  const used = new Set([first.letters]);
  for (const w of rest) {
    if (d.words.length >= target) break;
    if (used.has(w.letters)) continue;
    let best: { row: number; col: number; dir: Dir; score: number } | null = null;
    for (const [k, ch] of d.cells) {
      const [r, c] = k.split(',').map(Number);
      for (let i = 0; i < w.letters.length; i++) {
        if (w.letters[i] !== ch) continue;
        for (const dir of ['yatay', 'dikey'] as Dir[]) {
          const row = dir === 'dikey' ? r - i : r;
          const col = dir === 'yatay' ? c - i : c;
          const x = canPlace(d, w.letters, row, col, dir, maxSize);
          if (x < 1) continue;
          // Çok kesişen ve ızgarayı az büyüten yer tercih edilir; biraz rastgelelik çeşitlilik verir
          const area = (Math.max(d.maxR, row + (dir === 'dikey' ? w.letters.length - 1 : 0)) - Math.min(d.minR, row) + 1) *
            (Math.max(d.maxC, col + (dir === 'yatay' ? w.letters.length - 1 : 0)) - Math.min(d.minC, col) + 1);
          const score = x * 12 - area * 0.15 + rng() * 3;
          if (!best || score > best.score) best = { row, col, dir, score };
        }
      }
    }
    if (best) {
      place(d, w, best.row, best.col, best.dir);
      used.add(w.letters);
    }
  }
  return d;
}

export interface CrosswordOptions {
  seed: string;
  /** Hedef kelime sayısı */
  target?: number;
  /** En büyük ızgara kenarı (telefon için 12) */
  maxSize?: number;
  minLen?: number;
  maxLen?: number;
  attempts?: number;
}

export function generateCrossword(clues: ClueInput[], o: CrosswordOptions): Crossword {
  const target = o.target ?? 10;
  const maxSize = o.maxSize ?? 12;
  const rng = createRng(o.seed);
  const all = clues
    .map((c) => ({ ...c, letters: toGridLetters(c.answer) }))
    .filter((c) => c.letters.length >= (o.minLen ?? 3) && c.letters.length <= Math.min(o.maxLen ?? 11, maxSize));
  let best: Draft | null = null;
  for (let a = 0; a < (o.attempts ?? 40); a++) {
    // Uzun kelimeler önce (iskelet), ama her denemede farklı bir karışım
    const pool = shuffle(all, rng).slice(0, target * 4);
    pool.sort((x, y) => y.letters.length - x.letters.length + (rng() - 0.5) * 4);
    const d = attempt(pool, target, maxSize, rng);
    const size = (d.maxR - d.minR + 1) * (d.maxC - d.minC + 1);
    const bestSize = best ? (best.maxR - best.minR + 1) * (best.maxC - best.minC + 1) : Infinity;
    if (!best || d.words.length > best.words.length || (d.words.length === best.words.length && size < bestSize)) best = d;
    if (best.words.length >= target && a >= 8) break;
  }
  const d = best!;
  // Sola-yukarı hizala, numarala (satır, sonra sütun sırasıyla)
  const rows = d.maxR - d.minR + 1;
  const cols = d.maxC - d.minC + 1;
  const cells = new Map<string, string>();
  for (const [k, ch] of d.cells) {
    const [r, c] = k.split(',').map(Number);
    cells.set(key(r - d.minR, c - d.minC), ch);
  }
  const starts = [...new Set(d.words.map((w) => key(w.row - d.minR, w.col - d.minC)))].sort((a, b) => {
    const [ar, ac] = a.split(',').map(Number);
    const [br, bc] = b.split(',').map(Number);
    return ar - br || ac - bc;
  });
  const numOf = new Map(starts.map((k, i) => [k, i + 1]));
  const words: PlacedWord[] = d.words
    .map(({ w, row, col, dir }) => ({ ...w, row: row - d.minR, col: col - d.minC, dir, num: numOf.get(key(row - d.minR, col - d.minC))! }))
    .sort((a, b) => (a.dir === b.dir ? a.num - b.num : a.dir === 'yatay' ? -1 : 1));
  return { rows, cols, words, cells };
}

/** Bir kelimenin hücreleri */
export function cellsOf(w: PlacedWord): [number, number][] {
  return Array.from(w.letters, (_, i) => (w.dir === 'yatay' ? [w.row, w.col + i] : [w.row + i, w.col]) as [number, number]);
}
