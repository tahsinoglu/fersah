// HTTP'den bağımsız istek işleyici: Vercel işlevi ve yerel geliştirme sunucusu aynısını çağırır.
//
// Depolama düzeni (Vercel Blob bir veritabanı değil; yazdıktan sonra kısa süre eski sürüm dönebilir):
// - kullanici/<gizli>.json : şifre özeti ve ilerleme (yalnızca sahibi yazar)
// - oyuncu/<ad>.json       : herkese açık skor kaydı (yalnızca sahibi yazar)
// (Blob'da her biri sürümlü bir klasördür; bkz. storage.ts)
// Ortak, çok kişinin güncellediği dosya yoktur; böylece eşzamanlı oyuncuların puanları kaybolmaz.
// Sıralama, oyuncu kayıtları listelenerek hesaplanır ve kısa süre önbellekte tutulur.
import {
  applyRoundToPlayer, checkName, checkPin, checkRound, hashPin, makeToken, readToken, titleOf, touchPlayer, userPath, verifyPin, viewBoard,
  type Board, type DailyInput, type Player, type RoundInput,
} from './core.js';
import { ConflictError, type Storage } from './storage.js';

const MAX_PROGRESS_BYTES = 256 * 1024;
const BOARD_TTL_MS = 30_000;

export const playerPath = (slug: string) => `oyuncu/${slug}.json`;

export interface UserDoc {
  v: 1;
  ad: string;
  slug: string;
  pin: { salt: string; hash: string };
  olusturma: number;
  /** İstemcideki ilerleme (Leitner kartları, turlar, rekorlar, günlükler) */
  ilerleme: unknown;
  ilerlemeZamani: number;
}

export interface Ctx {
  storage: Storage;
  secret: string;
  now?: () => number;
  /** Sıralama önbelleği süresi (test için 0) */
  boardTtlMs?: number;
}

export interface Result {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

const ok = (body: unknown, headers?: Record<string, string>): Result => ({ status: 200, body, headers });
const fail = (status: number, error: string): Result => ({ status, body: { error } });

// Şifre denemesi sınırı (işlev örneği başına; en iyi çaba)
const attempts = new Map<string, { n: number; until: number }>();
function tooMany(slug: string, now: number): boolean {
  const a = attempts.get(slug);
  return !!a && a.n >= 5 && now < a.until;
}
function noteFailure(slug: string, now: number) {
  const a = attempts.get(slug);
  if (!a || now > a.until) attempts.set(slug, { n: 1, until: now + 60_000 });
  else a.n += 1;
}

// Sıralama önbelleği (işlev örneği başına) + bu örnekte yazılan son kayıtlar (CDN gecikmesini kapatmak için)
const boardCache = new WeakMap<Storage, { at: number; board: Board }>();
const recent = new WeakMap<Storage, Map<string, Player>>();
function remember(storage: Storage, slug: string, p: Player | null) {
  let m = recent.get(storage);
  if (!m) recent.set(storage, (m = new Map()));
  if (p) m.set(slug, p);
  else m.delete(slug);
}

async function loadBoard(ctx: Ctx, now: number): Promise<Board> {
  const ttl = ctx.boardTtlMs ?? BOARD_TTL_MS;
  const cached = boardCache.get(ctx.storage);
  let board: Board;
  if (cached && now - cached.at < ttl) board = cached.board;
  else {
    const rows = await ctx.storage.listJSON<Player>('oyuncu/');
    board = { v: 1, oyuncular: Object.fromEntries(rows.map((r) => [r.path.slice('oyuncu/'.length, -'.json'.length), r.data])) };
    boardCache.set(ctx.storage, { at: now, board });
  }
  // Bu örnekte az önce yazılanlar listeye henüz yansımamış olabilir
  const mine = recent.get(ctx.storage);
  if (mine?.size) {
    const o = { ...board.oyuncular };
    for (const [slug, p] of mine) if (!o[slug] || o[slug].son <= p.son) o[slug] = p;
    board = { ...board, oyuncular: o };
  }
  return board;
}

async function readPlayer(ctx: Ctx, slug: string): Promise<Player | undefined> {
  const fresh = (await ctx.storage.read<Player>(playerPath(slug)))?.data;
  const mem = recent.get(ctx.storage)?.get(slug);
  // Okuma birkaç saniye eski olabilir: bu örnekte yazdığımız daha yeni kayıt varsa onu kullan
  if (mem && (!fresh || mem.son > fresh.son)) return mem;
  return fresh;
}

async function writePlayer(ctx: Ctx, slug: string, p: Player) {
  await ctx.storage.write(playerPath(slug), p);
  remember(ctx.storage, slug, p);
}

function profileOf(u: UserDoc, p: Player | undefined) {
  return {
    ad: u.ad,
    toplam: p?.toplam ?? 0,
    turlar: p?.turlar ?? 0,
    unvan: titleOf(p?.toplam ?? 0, p?.ustalik),
    ilerleme: u.ilerleme ?? null,
    ilerlemeZamani: u.ilerlemeZamani ?? 0,
  };
}

async function auth(ctx: Ctx, token: unknown): Promise<{ slug: string; user: UserDoc } | Result> {
  const slug = readToken(token, ctx.secret);
  if (!slug) return fail(401, 'Oturum geçersiz; yeniden giriş yap.');
  const doc = await ctx.storage.read<UserDoc>(userPath(slug, ctx.secret));
  if (!doc) return fail(401, 'Hesap bulunamadı; yeniden giriş yap.');
  return { slug, user: doc.data };
}

export async function handle(op: string, method: string, body: Record<string, unknown>, query: Record<string, string>, ctx: Ctx): Promise<Result> {
  const now = (ctx.now ?? Date.now)();

  // ---- Giriş / kayıt ----
  if (op === 'giris' && method === 'POST') {
    const name = checkName(body.ad);
    if (!name.ok) return fail(400, name.error);
    if (!checkPin(body.pin)) return fail(400, 'Şifre 4 haneli bir sayı olmalı.');
    const pin = String(body.pin);
    if (tooMany(name.slug, now)) return fail(429, 'Çok fazla deneme. Bir dakika sonra tekrar dene.');
    const path = userPath(name.slug, ctx.secret);
    const existing = await ctx.storage.read<UserDoc>(path);
    let user: UserDoc;
    let yeni = false;
    if (existing) {
      if (!verifyPin(pin, existing.data.pin)) {
        noteFailure(name.slug, now);
        return fail(403, 'Bu kullanıcı adı alınmış ve şifre eşleşmedi. Senin adınsa şifreni kontrol et; değilse başka bir ad seç.');
      }
      user = existing.data;
    } else {
      // İstemci önce "bu ad boşta" bilgisini alır, kullanıcı onaylarsa hesap açılır
      if (body.yeniOnay !== true) return ok({ durum: 'yeni' });
      user = { v: 1, ad: name.ad, slug: name.slug, pin: hashPin(pin), olusturma: now, ilerleme: null, ilerlemeZamani: 0 };
      try {
        await ctx.storage.write(path, user, { create: true });
      } catch (e) {
        if (e instanceof ConflictError) return fail(409, 'Bu ad az önce alındı. Bir dakika sonra tekrar dene ya da başka bir ad seç.');
        throw e;
      }
      yeni = true;
    }
    const p = touchPlayer(await readPlayer(ctx, user.slug), user.ad, now);
    await writePlayer(ctx, user.slug, p);
    return ok({ durum: yeni ? 'olusturuldu' : 'girildi', token: makeToken(user.slug, ctx.secret), profil: profileOf(user, p) });
  }

  // ---- İlerleme eşitleme ----
  if (op === 'ilerleme' && method === 'POST') {
    const a = await auth(ctx, body.token);
    if ('status' in a) return a;
    const text = JSON.stringify(body.ilerleme ?? null);
    if (text.length > MAX_PROGRESS_BYTES) return fail(413, 'İlerleme verisi çok büyük.');
    await ctx.storage.write(userPath(a.slug, ctx.secret), { ...a.user, ilerleme: body.ilerleme ?? null, ilerlemeZamani: now });
    const u = body.ustalik as Player['ustalik'] | undefined;
    if (u && typeof u === 'object') {
      const ustalik = {
        memleket: Math.max(0, Math.min(100, Math.round(Number(u.memleket) || 0))),
        cihan: Math.max(0, Math.min(100, Math.round(Number(u.cihan) || 0))),
      };
      const prev = await readPlayer(ctx, a.slug);
      // Yalnızca değiştiyse yaz (depolama işlem kotasını korur)
      if (!prev?.ustalik || prev.ustalik.memleket !== ustalik.memleket || prev.ustalik.cihan !== ustalik.cihan) {
        await writePlayer(ctx, a.slug, touchPlayer(prev, a.user.ad, now, ustalik));
      }
    }
    return ok({ ilerlemeZamani: now });
  }

  // ---- Tur sonucu ----
  if (op === 'tur' && method === 'POST') {
    const a = await auth(ctx, body.token);
    if ('status' in a) return a;
    const t = (body.tur ?? {}) as Partial<RoundInput>;
    const r: RoundInput = {
      atlas: t.atlas as RoundInput['atlas'], mode: String(t.mode ?? ''), total: Number(t.total), correct: Number(t.correct), score: Number(t.score), ms: Number(t.ms),
    };
    const d = body.gunluk as Partial<DailyInput> | undefined;
    const daily: DailyInput | undefined = d && typeof d.key === 'string' ? { key: d.key, score: Number(d.score) } : undefined;
    const prev = await readPlayer(ctx, a.slug);
    const check = checkRound(r, daily, prev, now);
    if (!check.ok) return fail(check.status, check.error);
    const p = applyRoundToPlayer(prev, a.user.ad, r, daily, now);
    await writePlayer(ctx, a.slug, p);
    const view = viewBoard(await loadBoard(ctx, now), a.slug, now, 3);
    return ok({
      toplam: p.toplam, turlar: p.turlar, unvan: titleOf(p.toplam, p.ustalik),
      sira: { tum: view.tum.ben?.sira ?? null, haftalik: view.haftalik.ben?.sira ?? null, gunluk: daily ? view.gunluk[r.atlas].ben?.sira ?? null : null },
      aktif: view.aktif,
    });
  }

  // ---- Pano (sıralamalar ve anlık seyyah sayısı) ----
  if (op === 'pano' && method === 'GET') {
    const me = query.ben ? String(query.ben) : undefined;
    const board = await loadBoard(ctx, now);
    // Kişiye özel ("ben") yanıtlar paylaşılan önbelleğe girmez
    const cache = me ? 'private, max-age=15' : 'public, max-age=0, s-maxage=30, stale-while-revalidate=60';
    return ok(viewBoard(board, me, now), { 'cache-control': cache });
  }

  // ---- Hesap silme (KVKK) ----
  if (op === 'sil' && method === 'POST') {
    const a = await auth(ctx, body.token);
    if ('status' in a) return a;
    if (!checkPin(body.pin) || !verifyPin(String(body.pin), a.user.pin)) return fail(403, 'Şifre eşleşmedi.');
    await ctx.storage.remove(playerPath(a.slug));
    await ctx.storage.remove(userPath(a.slug, ctx.secret));
    remember(ctx.storage, a.slug, null);
    const cached = boardCache.get(ctx.storage);
    if (cached) {
      const o = { ...cached.board.oyuncular };
      delete o[a.slug];
      boardCache.set(ctx.storage, { at: cached.at, board: { ...cached.board, oyuncular: o } });
    }
    return ok({ silindi: true });
  }

  return fail(404, 'Bilinmeyen istek.');
}
