import { describe, expect, it } from 'vitest';
import { applyRound, checkName, checkRound, emptyBoard, makeToken, readToken, slugOf, titleOf, trDay, utcDay, viewBoard, weekKey } from './core';
import { BOARD_PATH, handle, type Ctx } from './handler';
import { LocalStorage } from './storage';

const T0 = Date.UTC(2026, 10, 22, 12, 0, 0);

function ctx(start = T0) {
  let now = start;
  const c: Ctx & { tick: (ms: number) => void } = { storage: new LocalStorage(), secret: 'test-sirri', now: () => now, tick: (ms) => (now += ms) };
  return c;
}
const call = (c: Ctx, op: string, body: Record<string, unknown> = {}, method = 'POST', query: Record<string, string> = {}) => handle(op, method, body, query, c);

describe('ad ve oturum', () => {
  it('Türkçe adlar aynı hesaba çıkar', () => {
    expect(slugOf('Tahsinoğlu')).toBe('tahsinoglu');
    expect(checkName('  Tahsin  Oğlu ')).toEqual({ ok: true, ad: 'Tahsin Oğlu', slug: 'tahsin-oglu' });
    expect(checkName('ab').ok).toBe(false);
    expect(checkName('<script>').ok).toBe(false);
  });
  it('oturum anahtarı doğrulanır, değiştirilmiş anahtar reddedilir', () => {
    const t = makeToken('ayse', 's');
    expect(readToken(t, 's')).toBe('ayse');
    expect(readToken(t.replace('ayse', 'ali'), 's')).toBeNull();
    expect(readToken(t, 'baska')).toBeNull();
  });
  it('unvanlar', () => {
    expect(titleOf(0)).toBe('Acemi Seyyah');
    expect(titleOf(1500)).toBe('Seyyah');
    expect(titleOf(9000)).toBe('Usta Seyyah');
    expect(titleOf(10, { memleket: 70 })).toBe('Seyyâh-ı Memleket');
  });
  it('gün ve hafta anahtarları Türkiye saatiyle', () => {
    const lateUtc = Date.UTC(2026, 10, 22, 22, 30);
    expect(trDay(lateUtc)).toBe('2026-11-23');
    expect(utcDay(lateUtc)).toBe('2026-11-22');
    expect(weekKey(T0)).toBe('2026-H47');
  });
});

describe('tur denetimi', () => {
  const r = { atlas: 'memleket' as const, mode: 'bul', total: 10, correct: 8, score: 900, ms: 60000 };
  it('olası en yüksek puan ve insanüstü hız reddedilir', () => {
    expect(checkRound({ ...r, score: 5000 }, undefined, undefined, T0).ok).toBe(false);
    expect(checkRound({ ...r, ms: 2000 }, undefined, undefined, T0).ok).toBe(false);
    expect(checkRound(r, undefined, undefined, T0).ok).toBe(true);
  });
  it('Günün Haritası günde bir kez', () => {
    const b = applyRound(emptyBoard(), 'ayse', 'Ayşe', { ...r, mode: 'gunluk' }, { key: trDay(T0), score: 900 }, T0);
    const again = checkRound({ ...r, mode: 'gunluk' }, { key: trDay(T0), score: 900 }, b.oyuncular.ayse, T0 + 60000);
    expect(again).toMatchObject({ ok: false, status: 409 });
  });
});

describe('API akışı', () => {
  it('yeni ad önce onay ister, sonra hesap açılır; aynı adla girince puanlar durur', async () => {
    const c = ctx();
    expect((await call(c, 'giris', { ad: 'Tahsinoğlu', pin: '1234' })).body).toEqual({ durum: 'yeni' });
    const k = await call(c, 'giris', { ad: 'Tahsinoğlu', pin: '1234', yeniOnay: true });
    expect(k.status).toBe(200);
    const token = (k.body as { token: string }).token;
    c.tick(60_000);
    const tur = await call(c, 'tur', { token, tur: { atlas: 'memleket', mode: 'bul', total: 10, correct: 9, score: 1200, ms: 50000 } });
    expect(tur.status).toBe(200);
    expect(tur.body).toMatchObject({ toplam: 1200, unvan: 'Seyyah', sira: { tum: 1 } });
    await call(c, 'ilerleme', { token, ilerleme: { kartlar: 3 }, ustalik: { memleket: 10, cihan: 0 } });
    // Başka cihazdan: aynı ad (farklı yazım), doğru şifre
    const g = await call(c, 'giris', { ad: 'tahsinoglu', pin: '1234' });
    expect(g.body).toMatchObject({ durum: 'girildi', profil: { ad: 'Tahsinoğlu', toplam: 1200, ilerleme: { kartlar: 3 } } });
    // Yanlış şifre
    expect((await call(c, 'giris', { ad: 'Tahsinoğlu', pin: '0000' })).status).toBe(403);
  });

  it('sıralamada kendi adını ve sırasını görür; anlık seyyah sayısı', async () => {
    const c = ctx();
    const tokens: string[] = [];
    for (const [i, ad] of ['Ayşe', 'Mehmet', 'Zeynep'].entries()) {
      const k = await call(c, 'giris', { ad, pin: '1111', yeniOnay: true });
      tokens.push((k.body as { token: string }).token);
      c.tick(10_000);
      await call(c, 'tur', { token: tokens[i], tur: { atlas: 'cihan', mode: 'neresi', total: 10, correct: 5, score: 100 * (i + 1), ms: 40000 } });
    }
    const pano = await call(c, 'pano', {}, 'GET', { ben: 'ayse' });
    const v = pano.body as ReturnType<typeof viewBoard>;
    expect(v.aktif).toBe(3);
    expect(v.tum.ust.map((r) => r.ad)).toEqual(['Zeynep', 'Mehmet', 'Ayşe']);
    expect(v.tum.ben).toMatchObject({ ad: 'Ayşe', sira: 3 });
    c.tick(11 * 60_000);
    expect(((await call(c, 'pano', {}, 'GET')).body as { aktif: number }).aktif).toBe(0);
  });

  it('çok hızlı art arda gönderim ve günlüğün ikinci kez gönderimi reddedilir', async () => {
    const c = ctx();
    const token = ((await call(c, 'giris', { ad: 'Ali', pin: '2222', yeniOnay: true })).body as { token: string }).token;
    c.tick(30_000);
    const body = { token, tur: { atlas: 'memleket', mode: 'gunluk', total: 10, correct: 7, score: 2000, ms: 90000 }, gunluk: { key: trDay(T0), score: 2000 } };
    expect((await call(c, 'tur', body)).status).toBe(200);
    expect((await call(c, 'tur', body)).status).toBe(429);
    c.tick(30_000);
    expect((await call(c, 'tur', body)).status).toBe(409);
  });

  it('eşzamanlı turlar kaybolmaz (koşullu yazma ve yeniden deneme)', async () => {
    const c = ctx();
    const toks = await Promise.all(
      Array.from({ length: 8 }, async (_, i) => ((await call(c, 'giris', { ad: `Oyuncu${i}`, pin: '3333', yeniOnay: true })).body as { token: string }).token),
    );
    c.tick(30_000);
    await Promise.all(toks.map((token) => call(c, 'tur', { token, tur: { atlas: 'memleket', mode: 'bul', total: 10, correct: 10, score: 1000, ms: 30000 } })));
    const b = await c.storage.read<{ oyuncular: Record<string, { toplam: number }> }>(BOARD_PATH);
    expect(Object.values(b!.data.oyuncular).filter((p) => p.toplam === 1000)).toHaveLength(8);
  });

  it('hesap silinir ve sıralamadan çıkar', async () => {
    const c = ctx();
    const token = ((await call(c, 'giris', { ad: 'Silinecek', pin: '4444', yeniOnay: true })).body as { token: string }).token;
    expect((await call(c, 'sil', { token, pin: '0000' })).status).toBe(403);
    expect((await call(c, 'sil', { token, pin: '4444' })).status).toBe(200);
    expect(((await call(c, 'pano', {}, 'GET')).body as { tum: { ust: unknown[] } }).tum.ust).toHaveLength(0);
    expect((await call(c, 'giris', { ad: 'Silinecek', pin: '4444' })).body).toEqual({ durum: 'yeni' });
  });
});
