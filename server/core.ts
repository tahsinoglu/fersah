// Fersah sunucu mantığı: saf işlevler (depolamadan ve HTTP'den bağımsız, test edilir).
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// ---------- Ad ve kimlik ----------

const FOLD: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', i: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };

/** "Tahsinoğlu" ve "tahsinoglu" aynı hesaptır */
export function slugOf(name: string): string {
  return name
    .toLocaleLowerCase('tr')
    .replace(/[^\u0000-\u007f]/g, (c) => FOLD[c] ?? c.normalize('NFD').replace(/[̀-ͯ]/g, ''))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export type NameCheck = { ok: true; ad: string; slug: string } | { ok: false; error: string };

export function checkName(raw: unknown): NameCheck {
  const ad = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (ad.length < 3) return { ok: false, error: 'Kullanıcı adı en az 3 harf olmalı.' };
  if (ad.length > 20) return { ok: false, error: 'Kullanıcı adı en çok 20 harf olabilir.' };
  if (!/^[\p{L}\p{N} _.-]+$/u.test(ad)) return { ok: false, error: 'Kullanıcı adında yalnızca harf, rakam, boşluk, nokta, tire ve alt çizgi olabilir.' };
  const slug = slugOf(ad);
  if (slug.length < 3) return { ok: false, error: 'Kullanıcı adı en az 3 harf ya da rakam içermeli.' };
  return { ok: true, ad, slug };
}

export const checkPin = (pin: unknown) => /^\d{4}$/.test(String(pin ?? ''));

export function hashPin(pin: string, salt = randomBytes(16).toString('hex')): { salt: string; hash: string } {
  const hash = scryptSync(pin, salt, 32, { N: 16384, r: 8, p: 1 }).toString('hex');
  return { salt, hash };
}

export function verifyPin(pin: string, stored: { salt: string; hash: string }): boolean {
  const { hash } = hashPin(pin, stored.salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(stored.hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

const hmac = (secret: string, text: string) => createHmac('sha256', secret).update(text).digest('hex');

/** Kullanıcı dosyasının tahmin edilemeyen yolu */
export const userPath = (slug: string, secret: string) => `kullanici/${hmac(secret, `kullanici:${slug}`).slice(0, 40)}.json`;

export const makeToken = (slug: string, secret: string) => `${slug}.${hmac(secret, `oturum:${slug}`).slice(0, 32)}`;

export function readToken(token: unknown, secret: string): string | null {
  const t = String(token ?? '');
  const i = t.lastIndexOf('.');
  if (i <= 0) return null;
  const slug = t.slice(0, i);
  const expected = makeToken(slug, secret);
  if (expected.length !== t.length) return null;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(t)) ? slug : null;
}

// ---------- Zaman ----------

/** Türkiye saatine göre YYYY-MM-DD */
export function trDay(ms: number): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
}
export function utcDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** ISO hafta anahtarı (Türkiye saati): 2026-H47 */
export function weekKey(ms: number): string {
  const [y, m, d] = trDay(ms).split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-H${String(week).padStart(2, '0')}`;
}

// ---------- Unvanlar (Kimlik Rehberi) ----------

export const TITLES = [
  { min: 0, ad: 'Acemi Seyyah' },
  { min: 1000, ad: 'Seyyah' },
  { min: 5000, ad: 'Usta Seyyah' },
] as const;

export function titleOf(total: number, mastery?: { memleket?: number; cihan?: number }): string {
  if ((mastery?.cihan ?? 0) >= 60) return 'Seyyâh-ı Âlem';
  if ((mastery?.memleket ?? 0) >= 60) return 'Seyyâh-ı Memleket';
  let t: string = TITLES[0].ad;
  for (const x of TITLES) if (total >= x.min) t = x.ad;
  return t;
}

// ---------- Pano ----------

export interface Player {
  ad: string;
  toplam: number;
  turlar: number;
  hafta: { k: string; puan: number };
  /** Günün Haritası puanları: "memleket:2026-11-22" → puan (son birkaç gün tutulur) */
  gun: Record<string, number>;
  /** Son etkinlik zamanı (ms) */
  son: number;
  ustalik?: { memleket?: number; cihan?: number };
}

export interface Board {
  v: 1;
  oyuncular: Record<string, Player>;
}

export const emptyBoard = (): Board => ({ v: 1, oyuncular: {} });

export interface RoundInput {
  atlas: 'memleket' | 'cihan';
  mode: string;
  total: number;
  correct: number;
  score: number;
  ms: number;
}

export interface DailyInput {
  key: string; // YYYY-MM-DD
  score: number;
}

/** Bir turda alınabilecek en yüksek puan (hile kontrolü) */
export function maxScore(r: RoundInput): number {
  const per = r.mode === 'yakin' || r.mode === 'gunluk' ? 1000 : 150;
  return Math.max(0, r.total) * per;
}

export type RoundCheck = { ok: true } | { ok: false; error: string; status: number };

export const MIN_GAP_MS = 8000;

export function checkRound(r: RoundInput, daily: DailyInput | undefined, prev: Player | undefined, now: number): RoundCheck {
  if (r.atlas !== 'memleket' && r.atlas !== 'cihan') return { ok: false, status: 400, error: 'Geçersiz bölüm.' };
  if (!Number.isFinite(r.score) || r.score < 0 || !Number.isInteger(r.total) || r.total < 1 || r.total > 250) {
    return { ok: false, status: 400, error: 'Geçersiz tur.' };
  }
  if (r.correct < 0 || r.correct > r.total) return { ok: false, status: 400, error: 'Geçersiz tur.' };
  if (r.score > maxScore(r)) return { ok: false, status: 422, error: 'Puan bu tur için olası en yüksek puanı aşıyor.' };
  // İnsanüstü hız: soru başına 600 ms'den kısa
  if (r.ms < r.total * 600) return { ok: false, status: 422, error: 'Tur gerçek dışı bir hızda bitmiş.' };
  if (prev && now - prev.son < MIN_GAP_MS) return { ok: false, status: 429, error: 'Çok hızlı gönderim; biraz bekle.' };
  if (daily) {
    const today = r.atlas === 'memleket' ? trDay(now) : utcDay(now);
    const yesterday = r.atlas === 'memleket' ? trDay(now - 86400000) : utcDay(now - 86400000);
    if (daily.key !== today && daily.key !== yesterday) return { ok: false, status: 422, error: 'Günün Haritası tarihi geçersiz.' };
    if (prev?.gun[`${r.atlas}:${daily.key}`] !== undefined) return { ok: false, status: 409, error: 'Bugünün haritasını zaten çözdün.' };
  }
  return { ok: true };
}

/** Turu panoya işler (yeni pano döner; girdi değiştirilmez) */
export function applyRound(board: Board, slug: string, ad: string, r: RoundInput, daily: DailyInput | undefined, now: number): Board {
  const prev = board.oyuncular[slug];
  const wk = weekKey(now);
  const p: Player = prev
    ? { ...prev, hafta: prev.hafta.k === wk ? { ...prev.hafta } : { k: wk, puan: 0 }, gun: { ...prev.gun } }
    : { ad, toplam: 0, turlar: 0, hafta: { k: wk, puan: 0 }, gun: {}, son: now };
  p.ad = ad;
  p.toplam += Math.round(r.score);
  p.turlar += 1;
  p.hafta.puan += Math.round(r.score);
  p.son = now;
  if (daily) p.gun[`${r.atlas}:${daily.key}`] = Math.round(daily.score);
  // Eski günleri at (3 günden eski)
  const keep = new Set([0, 1, 2].flatMap((d) => [`memleket:${trDay(now - d * 86400000)}`, `cihan:${utcDay(now - d * 86400000)}`]));
  for (const k of Object.keys(p.gun)) if (!keep.has(k)) delete p.gun[k];
  return { ...board, oyuncular: { ...board.oyuncular, [slug]: p } };
}

export function touch(board: Board, slug: string, ad: string, now: number, ustalik?: Player['ustalik']): Board {
  const prev = board.oyuncular[slug];
  const p: Player = prev ? { ...prev, ad, son: now } : { ad, toplam: 0, turlar: 0, hafta: { k: weekKey(now), puan: 0 }, gun: {}, son: now };
  if (ustalik) p.ustalik = ustalik;
  return { ...board, oyuncular: { ...board.oyuncular, [slug]: p } };
}

export const ACTIVE_MS = 10 * 60 * 1000;

export function activeCount(board: Board, now: number): number {
  return Object.values(board.oyuncular).filter((p) => now - p.son <= ACTIVE_MS).length;
}

export interface Row {
  sira: number;
  ad: string;
  slug: string;
  puan: number;
  unvan: string;
}

export interface Ranking {
  ust: Row[];
  ben?: Row;
}

function rank(entries: { slug: string; p: Player; puan: number }[], me: string | undefined, limit: number): Ranking {
  const sorted = entries.filter((e) => e.puan > 0).sort((a, b) => b.puan - a.puan || a.p.ad.localeCompare(b.p.ad, 'tr'));
  const rows: Row[] = sorted.map((e, i) => ({ sira: i + 1, ad: e.p.ad, slug: e.slug, puan: e.puan, unvan: titleOf(e.p.toplam, e.p.ustalik) }));
  return { ust: rows.slice(0, limit), ben: me ? rows.find((r) => r.slug === me) : undefined };
}

export interface BoardView {
  aktif: number;
  gunluk: { memleket: Ranking; cihan: Ranking; anahtar: { memleket: string; cihan: string } };
  haftalik: Ranking;
  tum: Ranking;
}

export function viewBoard(board: Board, me: string | undefined, now: number, limit = 50): BoardView {
  const entries = Object.entries(board.oyuncular);
  const mk = trDay(now);
  const ck = utcDay(now);
  const wk = weekKey(now);
  return {
    aktif: activeCount(board, now),
    gunluk: {
      memleket: rank(entries.map(([slug, p]) => ({ slug, p, puan: p.gun[`memleket:${mk}`] ?? 0 })), me, limit),
      cihan: rank(entries.map(([slug, p]) => ({ slug, p, puan: p.gun[`cihan:${ck}`] ?? 0 })), me, limit),
      anahtar: { memleket: mk, cihan: ck },
    },
    haftalik: rank(entries.map(([slug, p]) => ({ slug, p, puan: p.hafta.k === wk ? p.hafta.puan : 0 })), me, limit),
    tum: rank(entries.map(([slug, p]) => ({ slug, p, puan: p.toplam })), me, limit),
  };
}
