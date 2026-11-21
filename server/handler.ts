// HTTP'den bağımsız istek işleyici: Vercel işlevi ve yerel geliştirme sunucusu aynısını çağırır.
import {
  applyRound, checkName, checkPin, checkRound, emptyBoard, hashPin, makeToken, readToken, titleOf, touch, userPath, verifyPin, viewBoard,
  type Board, type DailyInput, type Player, type RoundInput,
} from './core.js';
import { ConflictError, type Storage } from './storage.js';

export const BOARD_PATH = 'pano/pano.json';
const MAX_PROGRESS_BYTES = 256 * 1024;

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

/** Panoyu oku-değiştir-yaz; araya başka yazma girerse yeniden dene */
async function updateBoard(ctx: Ctx, fn: (b: Board) => Board | Result): Promise<Board | Result> {
  for (let i = 0; i < 6; i++) {
    const doc = await ctx.storage.read<Board>(BOARD_PATH);
    const cur = doc?.data ?? emptyBoard();
    const next = fn(cur);
    if (!('oyuncular' in next)) return next;
    try {
      await ctx.storage.write(BOARD_PATH, next, doc ? { ifMatch: doc.etag } : { create: true });
      return next;
    } catch (e) {
      if (!(e instanceof ConflictError)) throw e;
      await new Promise((r) => setTimeout(r, 40 + Math.random() * 120 * (i + 1)));
    }
  }
  return fail(503, 'Sunucu şu an meşgul, birazdan tekrar dene.');
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

async function auth(ctx: Ctx, token: unknown): Promise<{ slug: string; doc: { data: UserDoc; etag: string | null } } | Result> {
  const slug = readToken(token, ctx.secret);
  if (!slug) return fail(401, 'Oturum geçersiz; yeniden giriş yap.');
  const doc = await ctx.storage.read<UserDoc>(userPath(slug, ctx.secret));
  if (!doc) return fail(401, 'Hesap bulunamadı; yeniden giriş yap.');
  return { slug, doc };
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
      if (body.yeniOnay !== true) {
        // İstemci önce "bu ad boşta mı" bilgisini alsın, kullanıcı onaylasın
        return ok({ durum: 'yeni' });
      }
      user = { v: 1, ad: name.ad, slug: name.slug, pin: hashPin(pin), olusturma: now, ilerleme: null, ilerlemeZamani: 0 };
      try {
        await ctx.storage.write(path, user, { create: true });
      } catch (e) {
        if (e instanceof ConflictError) return fail(409, 'Bu ad az önce alındı. Bir dakika sonra tekrar dene ya da başka bir ad seç.');
        throw e;
      }
      yeni = true;
    }
    const board = await updateBoard(ctx, (b) => touch(b, user.slug, user.ad, now));
    const p = 'oyuncular' in board ? board.oyuncular[user.slug] : undefined;
    return ok({ durum: yeni ? 'olusturuldu' : 'girildi', token: makeToken(user.slug, ctx.secret), profil: profileOf(user, p) });
  }

  // ---- İlerleme eşitleme ----
  if (op === 'ilerleme' && method === 'POST') {
    const a = await auth(ctx, body.token);
    if ('status' in a) return a;
    const text = JSON.stringify(body.ilerleme ?? null);
    if (text.length > MAX_PROGRESS_BYTES) return fail(413, 'İlerleme verisi çok büyük.');
    const user: UserDoc = { ...a.doc.data, ilerleme: body.ilerleme ?? null, ilerlemeZamani: now };
    await ctx.storage.write(userPath(a.slug, ctx.secret), user);
    const ustalik = body.ustalik as Player['ustalik'] | undefined;
    if (ustalik && typeof ustalik === 'object') {
      await updateBoard(ctx, (b) => touch(b, a.slug, user.ad, now, {
        memleket: Math.max(0, Math.min(100, Number(ustalik.memleket) || 0)),
        cihan: Math.max(0, Math.min(100, Number(ustalik.cihan) || 0)),
      }));
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
    let rejected: Result | null = null;
    const board = await updateBoard(ctx, (b) => {
      const check = checkRound(r, daily, b.oyuncular[a.slug], now);
      if (!check.ok) {
        rejected = fail(check.status, check.error);
        return rejected;
      }
      return applyRound(b, a.slug, a.doc.data.ad, r, daily, now);
    });
    if (rejected) return rejected;
    if (!('oyuncular' in board)) return board;
    const p = board.oyuncular[a.slug];
    const view = viewBoard(board, a.slug, now, 3);
    return ok({
      toplam: p.toplam, turlar: p.turlar, unvan: titleOf(p.toplam, p.ustalik),
      sira: { tum: view.tum.ben?.sira ?? null, haftalik: view.haftalik.ben?.sira ?? null, gunluk: daily ? view.gunluk[r.atlas].ben?.sira ?? null : null },
      aktif: view.aktif,
    });
  }

  // ---- Pano (sıralamalar ve anlık seyyah sayısı) ----
  if (op === 'pano' && method === 'GET') {
    const doc = await ctx.storage.read<Board>(BOARD_PATH);
    const me = query.ben ? String(query.ben) : undefined;
    return ok(viewBoard(doc?.data ?? emptyBoard(), me, now), { 'cache-control': 'public, max-age=0, s-maxage=15, stale-while-revalidate=30' });
  }

  // ---- Hesap silme (KVKK) ----
  if (op === 'sil' && method === 'POST') {
    const a = await auth(ctx, body.token);
    if ('status' in a) return a;
    if (!checkPin(body.pin) || !verifyPin(String(body.pin), a.doc.data.pin)) return fail(403, 'Şifre eşleşmedi.');
    await updateBoard(ctx, (b) => {
      const o = { ...b.oyuncular };
      delete o[a.slug];
      return { ...b, oyuncular: o };
    });
    await ctx.storage.remove(userPath(a.slug, ctx.secret));
    return ok({ silindi: true });
  }

  return fail(404, 'Bilinmeyen istek.');
}
