# Fersah · Harita oyunu

Türkiye ve dünya harita bilgisini geliştiren, telefonda uygulama gibi çalışan bir web oyunu (PWA).

- **Memleket:** Türkiye → coğrafi bölge → il (+ ilçeler, metin tabanlı Memleket Testi)
- **Cihan:** Dünya → kıta → ülke
- **Küçük Seyyah:** okul öncesi için yapboz, bul, keşfet; önceden kaydedilmiş çocuksu ses

**Canlı:** https://fersah.vercel.app · **Kod:** https://github.com/tahsinoglu/fersah ·
Sürüm numarası uygulamanın altında görünür; dokununca "Yenilikler" açılır (`src/data/changelog.ts`).

## Kurulum

```bash
npm install
npm run dev        # http://localhost:5173 (yerel /api/fersah dahil; veriler .data/ klasöründe)
```

| Komut | Ne yapar |
|---|---|
| `npm run build` | Tip denetimi + üretim derlemesi (`dist/`, PWA dahil) |
| `npm run preview` | Derlenmiş sürümü sunar |
| `npm test` | Birim testleri (Vitest: soru motoru, puanlama, sunucu mantığı, ses paketi) |
| `npm run e2e` | Tarayıcı testleri (Playwright; telefon + masaüstü; hesap akışı dahil) |
| `npm run geo` | Harita, bayrak, ilçe ve karayolu verisini yeniden üretir |

### Yayın

Vercel projesi `fersah`, GitHub deposuna bağlı: `main`'e her gönderim üretime çıkar. Sürüm yükseltirken
`package.json` sürümü ve `src/data/changelog.ts` birlikte güncellenir.

Sunucu ortam değişkenleri (Vercel'de şifreli; depoda yok): `BLOB_READ_WRITE_TOKEN` (Vercel Blob deposu
`fersah-veri`), `FERSAH_SECRET` (oturum imzası ve gizli kullanıcı yolları için rastgele anahtar).

**Duman testi:** `vercel deploy --build-env FERSAH_SMOKE=1` ile açılan önizleme derlemesi, gerçek Blob deposunda ve
canlı API'de giriş → tur → sıralama → tekrar giriş → silme akışını koşar; sonuçlar derleme kaydında `[duman]` satırlarıdır.

## Hesaplar ve sıralama (sunucu)

- Giriş: **kullanıcı adı + 4 haneli şifre**. Aynı adla girince eski puan ve ilerleme geri gelir; "Tahsinoğlu" ile
  "tahsinoglu" aynı hesaptır. Misafir olarak da oynanabilir (ilerleme yalnızca cihazda kalır).
- `api/fersah.ts` → `server/handler.ts` (HTTP'den bağımsız; yerelde Vite eklentisi aynısını çağırır).
  İşlemler: `giris`, `ilerleme`, `tur`, `pano`, `sil`.
- Depolama Vercel Blob'dur. Blob veritabanı değildir ve aynı dosyanın üzerine yazınca CDN bir süre eski içerik
  döndürür; bu yüzden her mantıksal kayıt sürümlü bir klasördür, her yazış yeni değişmez bir dosya açar ve eskiler
  silinir (`server/storage.ts`). Her oyuncunun kendi kaydı vardır, ortak dosya yoktur: aynı anda oynayanlar
  birbirinin puanını ezmez.
- Hile koruması (`server/core.ts`): turun olası en yüksek puanı, soru başına en az 600 ms, iki tur arası en az
  8 sn, Günün Haritası günde bir kez.
- Şifreler scrypt ile özetlenir; kullanıcı dosyalarının yolu gizli anahtarla türetilir. Hesap ve tüm veriler
  Sıralama sayfasından silinebilir (KVKK).
- **Ölçek sınırı:** sıralama, oyuncu kayıtları listelenerek hesaplanır (30 sn önbellek). Birkaç bin oyuncuya kadar
  yeterlidir; daha büyük kitle için Neon/Supabase gibi bir veritabanına geçilmeli (Vercel'de entegrasyon
  koşullarının hesap sahibince onaylanması gerekir).

## Klasör yapısı

```
api/fersah.ts           Vercel işlevi
server/                 Sunucu mantığı (saf işlevler), depolama, testler, duman testi
scripts/build-geo.mjs   Natural Earth → TopoJSON, başkentler, bayraklar, ilçeler, karayolu mesafeleri
scripts/ses/            Küçük Seyyah ses paketi üreticisi (geliştirici aracı)
public/geo/             turkiye.topo.json, dunya.topo.json
public/flags/           Ülke bayrakları (SVG)
public/ses/             Küçük Seyyah ses kayıtları (MP3, ~870 KB; ilk kullanımda önbelleğe alınır)
src/map-engine/         Oyundan bağımsız harita motoru
src/data/               İl–bölge–plaka tablosu, kıtalar, atlas (Web Worker), bilgi kartları, generated/
src/quiz-engine/        Soru motoru: bul, neresi, yakın atış, plaka, bayrak, Memleket Testi, Günün Haritası
src/scoring/            Puanlama, mesafe (km + fersah), paylaşım metni
src/progress/           Leitner kutuları, seri, ilerleme
src/account/            Giriş, eşitleme, kutlama mesajları, sıralama arayüzü
src/kids/               Küçük Seyyah
src/ui/                 Ortak arayüz (logo, sürüm rozeti, ...)
src/i18n/tr.ts          Arayüz metinleri
tests/                  Playwright testleri
```

## Veri kaynakları ve lisanslar

| Veri | Kaynak | Lisans |
|---|---|---|
| Dünya ülke sınırları | [Natural Earth](https://www.naturalearthdata.com/) 1:10m Admin 0 – Türkiye bakış açısı, 5.2.0 | Kamu malı |
| Türkiye il sınırları, başkentler, Türkçe ülke adları | Natural Earth 1:10m | Kamu malı |
| Coğrafi bölge – il eşlemesi | 1941 Birinci Coğrafya Kongresi, elle girildi | Kendi verimiz |
| Bayraklar | [flag-icons](https://github.com/lipis/flag-icons) | MIT |
| İlçeler ve iller arası karayolu mesafeleri | [turkey-neighbourhoods](https://github.com/muratgozel/turkey-neighbourhoods) 4.0.3 (Murat Gözel) | MIT |
| Yazı tipleri | Poppins, Inter (`@fontsource`) | SIL Open Font License 1.1 |
| Küçük Seyyah sesi | Piper Türkçe "fahrettin" sesi ([NabuCasa voice-datasets](https://github.com/NabuCasa/voice-datasets), CC0), [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) ile okutuldu, WORLD vokoderiyle (pyworld, MIT) çocuk sesine dönüştürüldü | CC0 |
| Simgeler, logo | Projede çizildi (Fersah kimlik rehberi) | Kendi verimiz |
| Bilgi kartları | Elle yazıldı; her kartta Türkçe Vikipedi kaynak bağlantısı | Metinler kendi verimiz |

Notlar: GADM kullanılmaz (ticari kullanımı yasaklar). KKTC haritada seçilebilir ama "ülke" olarak sorulmaz.
Antarktika görünür, oynanamaz. 1 fersah ≈ 5,685 km.

### Ses paketini yeniden üretme

```bash
node scripts/ses/cumleler.mjs /tmp/cumleler.json
python3 scripts/ses/uret.py <vits-piper-tr_TR-fahrettin-medium klasörü> /tmp/cumleler.json .
```

Gerekenler: `pip install sherpa-onnx==1.12.40 pyworld soundfile`, ffmpeg. Model:
`github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-tr_TR-fahrettin-medium.tar.bz2`.
Okunan her cümle `src/kids/phrases.ts`'tedir; `phrases.test.ts` kaydı eksik cümle bırakmaz. Pakette olmayan bir
cümle olursa tarayıcının konuşma özelliğine düşülür. Gerçek bir çocuk seslendirmeni kaydı gelirse aynı dosya
adlarıyla `public/ses/` altına konması yeterlidir (`src/kids/ses.json` cümle → dosya eşlemesi).

## Bilgi kartlarının doğrulama durumu

`src/data/facts/*.json` içindeki 81 il ve 43 ülke kartında `dogrulandi` alanı var. Doğrulanan kart `true`
yapılır; kaynağında bulunamayan kart düzeltilir ya da boşaltılır.

Son doğrulama (2026-11-22): geliştirme ortamının çıkış adresi Vikipedi'de paylaşıldığı için istekler sürekli hız
sınırına (429) takıldı; gece boyunca yalnızca 3 makale indirilebildi. Adana, Afyonkarahisar ve Ağrı kartları kaynak
metinle karşılaştırılıp doğrulandı (`true`); kalan 121 kart henüz doğrulanmadı (`false`).

## Ölçümler

- Lighthouse (mobil): performans 95–96, erişilebilirlik 100, en iyi uygulamalar 100 (Aşama 1).
- Harita verisi Web Worker'da işlenir; kamera geçişleri 4× yavaş CPU'da 53–60 fps.
- 81 ilin ve tüm ülkelerin gerçek işaretçiyle seçilebildiği, çevrimdışı açılış ve hesap akışı Playwright ile test edilir.
