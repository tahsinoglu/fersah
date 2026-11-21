// Duman testi: yalnızca FERSAH_SMOKE=1 ile çalışan bir Vercel önizleme derlemesinde koşar.
// 1) Gerçek Blob deposunda koşullu yazma/okuma, 2) canlı /api/fersah uç noktasında uçtan uca akış.
// Sonuçlar derleme kaydına yazılır; test verisi sonunda silinir.
import { BlobStorage, ConflictError } from './storage.js';

const log = (...a: unknown[]) => console.log('[duman]', ...a);

async function blobTest() {
  const s = new BlobStorage();
  const path = `duman/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  await s.write(path, { n: 1 }, { create: true });
  const a = await s.read<{ n: number }>(path);
  log('blob okuma', a?.data.n === 1 ? 'TAMAM' : 'HATA', 'etag', a?.etag ? 'var' : 'yok');
  await s.write(path, { n: 2 }, { ifMatch: a!.etag });
  const b = await s.read<{ n: number }>(path);
  log('blob koşullu yazma', b?.data.n === 2 ? 'TAMAM' : 'HATA');
  let conflict = false;
  try {
    await s.write(path, { n: 3 }, { ifMatch: a!.etag });
  } catch (e) {
    conflict = e instanceof ConflictError;
  }
  log('blob eski etag reddi', conflict ? 'TAMAM' : 'HATA');
  let exists = false;
  try {
    await s.write(path, { n: 4 }, { create: true });
  } catch (e) {
    exists = e instanceof ConflictError;
  }
  log('blob var olanı oluşturma reddi', exists ? 'TAMAM' : 'HATA');
  await s.remove(path);
  log('blob silme', (await s.read(path)) === null ? 'TAMAM' : 'HATA');
}

async function apiTest(base: string) {
  const call = async (op: string, body?: unknown) => {
    const r = await fetch(`${base}/api/fersah?op=${op}`, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, body: (await r.json().catch(() => null)) as Record<string, unknown> | null };
  };
  const pano = await call('pano');
  log('api pano', pano.status, pano.status === 200 ? 'TAMAM' : JSON.stringify(pano.body));
  const ad = `dumantesti${Math.random().toString(36).slice(2, 7)}`;
  const g1 = await call('giris', { ad, pin: '4321' });
  log('api giris (yeni ad)', g1.status, g1.body?.durum === 'yeni' ? 'TAMAM' : JSON.stringify(g1.body));
  const g2 = await call('giris', { ad, pin: '4321', yeniOnay: true });
  const token = g2.body?.token as string | undefined;
  log('api hesap açma', g2.status, token ? 'TAMAM' : JSON.stringify(g2.body));
  if (!token) return;
  await new Promise((r) => setTimeout(r, 9000));
  const tur = await call('tur', { token, tur: { atlas: 'memleket', mode: 'bul', total: 10, correct: 9, score: 1100, ms: 40000 } });
  log('api tur', tur.status, tur.body?.toplam === 1100 ? 'TAMAM' : JSON.stringify(tur.body));
  // Tutarlılık ölçümü: oyuncu kaydı farklı anlarda doğrudan okunur
  const st = new BlobStorage();
  for (const wait of [0, 2000, 5000]) {
    await new Promise((r) => setTimeout(r, wait));
    const d = await st.read<{ toplam: number }>(`oyuncu/${ad}.json`);
    log(`oyuncu kaydı +${wait}ms`, 'toplam', d?.data.toplam ?? 'yok');
  }
  // İkinci tur: önceki puanın üstüne eklenmeli (kayıp güncelleme olmamalı)
  await new Promise((r) => setTimeout(r, 9000));
  const tur2 = await call('tur', { token, tur: { atlas: 'cihan', mode: 'bul', total: 10, correct: 5, score: 500, ms: 40000 } });
  log('api ikinci tur', tur2.status, tur2.body?.toplam === 1600 ? 'TAMAM' : JSON.stringify(tur2.body));
  await new Promise((r) => setTimeout(r, 3000));
  const p2 = await call('pano');
  log('api pano sonrası', JSON.stringify((p2.body as { tum?: { ust?: unknown[] } })?.tum?.ust?.slice(0, 3)));
  const g3 = await call('giris', { ad, pin: '4321' });
  log('api tekrar giris', g3.status, (g3.body?.profil as { toplam?: number } | undefined)?.toplam === 1600 ? 'TAMAM' : JSON.stringify(g3.body));
  const yanlis = await call('giris', { ad, pin: '0000' });
  log('api yanlis sifre', yanlis.status, yanlis.status === 403 ? 'TAMAM' : 'HATA');
  const sil = await call('sil', { token, pin: '4321' });
  log('api hesap silme', sil.status, sil.body?.silindi ? 'TAMAM' : JSON.stringify(sil.body));
}

if (process.env.FERSAH_SMOKE === '1') {
  try {
    await blobTest();
  } catch (e) {
    log('blob HATA', String(e));
  }
  try {
    await apiTest(process.env.FERSAH_SMOKE_URL ?? 'https://fersah.vercel.app');
  } catch (e) {
    log('api HATA', String(e));
  }
}
