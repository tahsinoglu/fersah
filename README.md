# Memleket & Cihan

Türkiye ve dünya harita bilgisini geliştiren, telefonda uygulama gibi çalışan bir web oyunu.

- **Memleket:** Türkiye → coğrafi bölge → il
- **Cihan:** Dünya → kıta → ülke

Şu an **Aşama 1** tamam: seviyeli harita, beş oyun modu, Günün Haritası (yerel), öğretici yapı,
istatistikler, öğrenme haritası, Çocuk Köşesi ve çevrimdışı çalışan PWA. Sunucu yok; ilerleme yalnızca cihazda.

**Canlı:** https://fersah.vercel.app · **Kod:** https://github.com/tahsinoglu/fersah

## Kurulum

```bash
npm install
npm run dev        # http://localhost:5173 (aynı ağdaki telefondan da açılır)
```

Diğer komutlar:

| Komut | Ne yapar |
|---|---|
| `npm run build` | Tip denetimi + üretim derlemesi (`dist/`, PWA dahil) |
| `npm run preview` | Derlenmiş sürümü sunar (PWA'yı denemek için) |
| `npm test` | Birim testleri (Vitest) |
| `npm run e2e` | Tarayıcı testleri (Playwright; telefon + masaüstü) |
| `npm run geo` | Harita verisini indirip `public/geo/*.topo.json` dosyalarını yeniden üretir |

### Yayın

Vercel projesi: `fersah` (Vite, `npm run build`, çıktı `dist`). `vercel.json` tüm adresleri `index.html`'e yönlendirir
(seviyeli adresler doğrudan açılabilsin diye) ve servis çalışanını önbelleğe almaz. Elle yayın: `scripts/deploy.sh`.

### Telefona ekleme

Üretim sürümü PWA'dır. HTTPS üzerinden yayınlanınca iPhone'da Safari → Paylaş → **Ana Ekrana Ekle**,
Android'de Chrome → **Uygulamayı yükle**. Uygulama kabuğu ve harita verisi önbelleğe alınır; çevrimdışı açılır.

## Klasör yapısı

```
scripts/build-geo.mjs   Natural Earth → sadeleştirme → TopoJSON + başkentler
public/geo/             turkiye.topo.json (37 KB), dunya.topo.json (210 KB; gzip ~70 KB),
                        dunya-siluet.topo.json (yalnızca Siluet modunda yüklenir)
src/map-engine/         Oyundan bağımsız harita motoru: MapView, kamera, etiketler, etkileşim, oyun efektleri
src/data/               İl–bölge–plaka tablosu, kıta kuralları, atlas yükleyici (Web Worker),
                        facts/*.json (bilgi kartları), generated/baskentler.json
src/quiz-engine/        Soru motoru (saf TS): tohumlu rastgelelik, 5 mod, çeldiriciler, Günün Haritası
src/scoring/            Puanlama (saf TS): haversine, Yakın Atış, hız puanı, paylaşım metni
src/progress/           Leitner kutuları, seri, cihazda saklanan ilerleme
src/game/               Soru havuzu, bilgi kartı/başkent erişimi, cevap değerlendirme
src/routes/             Harita, oyun, Oyna merkezi, istatistik sayfaları
src/kids/               Çocuk Köşesi: yapboz, bul, keşfet, sesli okuma, ebeveyn kilidi, elle çizilmiş simgeler
src/ui/                 Ortak arayüz parçaları
src/i18n/tr.ts          Tüm arayüz metinleri (İngilizce için en.ts eklenecek)
tests/                  Playwright uçtan uca testleri
```

Harita motoru (`src/map-engine`) dışarıya yalnızca `atlas`, `selection`, `onSelect`, `onUp` alır;
oyun katmanı (Aşama 1) bunun üstüne kurulacak.

## Adresler

Her seviyenin adresi var; tarayıcının geri tuşu bir üst seviyeye döner.

```
/memleket
/memleket/karadeniz
/memleket/karadeniz/rize
/cihan/afrika/kenya
```

## Veri kaynakları ve lisanslar

| Veri | Kaynak | Lisans |
|---|---|---|
| Dünya ülke sınırları | [Natural Earth](https://www.naturalearthdata.com/) 1:10m Admin 0 – **Türkiye bakış açısı** (`ne_10m_admin_0_countries_tur`), sürüm 5.2.0 | Kamu malı (public domain). Atıf gerekmez, ticari kullanım serbest. |
| Türkiye il sınırları | Natural Earth 1:10m Admin 1 (`ne_10m_admin_1_states_provinces`, Türkiye süzülmüş), sürüm 5.2.0 | Kamu malı |
| Ülke adlarının Türkçesi, nüfus tahmini | Natural Earth öznitelikleri (`NAME_TR`, `POP_EST`) | Kamu malı |
| Coğrafi bölge – il eşlemesi | 1941 Birinci Coğrafya Kongresi sınıflandırması, elle girildi (`src/data/memleket.ts`) | Kendi verimiz |
| Yazı tipi | [Manrope](https://github.com/sharanda/manrope) (`@fontsource-variable/manrope`) | SIL Open Font License 1.1 |
| Arayüz ve Çocuk Köşesi simgeleri | Projede elle çizildi (telifli karakter yok) | Kendi verimiz |
| Başkentler | Natural Earth 1:10m Populated Places (`FEATURECLA = "Admin-0 capital"`, Türkçe ad `NAME_TR`) | Kamu malı |
| Bilgi kartları | Elle yazıldı; her kartta kaynak sayfa (Türkçe Vikipedi) bağlantısı var | Metinler kendi verimiz |

Notlar:

- Planda il ve ilçe sınırları için geoBoundaries (CC BY 4.0) önerilmişti. İller için kamu malı ve daha sade olduğu
  için Natural Earth Admin 1 kullanıldı. **İlçe seviyesi** geldiğinde geoBoundaries ADM2 (CC BY 4.0, atıf
  zorunlu) eklenecek; atıf metni buraya yazılacak.
- **GADM kullanılmaz**: ticari kullanımı yasaklar.
- Natural Earth Türkiye bakış açısı sürümünde KKTC ayrı bir alan olarak yer alır. KKTC haritada seçilebilir
  ama oyunda "ülke" olarak sorulmaz. Antarktika görünür, oynanamaz.
- Etiket noktaları: iller ve etiket noktası denize düşen ülkeler için
  [polylabel](https://github.com/mapbox/polylabel) (ISC) ile hesaplanır (yalnızca derleme sırasında).

## Aşama planı

- [x] **Aşama 0:** Harita etkileşimi demosu
- [x] **Aşama 1:** Tek oyunculu oyun: 5 mod, öğretici yapı, Leitner tekrarı, istatistikler, Günün Haritası (yerel), Çocuk Köşesi, çevrimdışı PWA
- [ ] **Aşama 2:** Supabase: giriş, iki ayrı günlük sıralama, sunucuda puanlama ve hile koruması, KVKK
- [ ] **Aşama 3:** Canlı düello (Realtime), lig, rozetler, ilçe ve yeni katmanlar

## Bilgi kartlarının doğrulama durumu

`src/data/facts/*.json` içindeki 81 il ve 43 ülke kartı genel bilinen, tek cümlelik bilgilerden oluşur ve
her birinde kaynak bağlantısı vardır. Her kartta `dogrulandi` alanı var. Geliştirme ortamından Vikipedi'ye
erişilemediği için kartlar henüz kaynağıyla tek tek karşılaştırılmadı (`dogrulandi: false`). Doğrulanan kart
`true` yapılmalı; doğrulanamayan kart boşaltılmalı.

## Aşama 1 adresleri

```
/oyna                          Oyna merkezi (Günün Haritası, hızlı başla, Çocuk Köşesi)
/oyun/memleket/bul/karadeniz   Oyun: atlas / mod (bul, neresi, yakin, siluet, hepsi) / kapsam (tum ya da bölge/kıta)
/gunluk/memleket               Günün Haritası (Memleket: Türkiye saati, Cihan: UTC)
/istatistik                    Kişisel istatistikler
/cocuk                         Çocuk Köşesi
```

## Aşama 1 ölçümleri

- Lighthouse (mobil, `vite preview`): tüm sayfalarda performans 95–96, erişilebilirlik 100, en iyi uygulamalar 100.
- Harita verisi bir Web Worker'da işlenir (dünya haritası için ana iş parçacığı engeli 810 ms → 10–20 ms).
- 81 ilin ve tüm ülkelerin gerçek işaretçiyle seçilebildiği Playwright ile test edildi.
- Çevrimdışı: bir kez açıldıktan sonra ağ kapalıyken oyun açılıyor (Playwright testi).

## Aşama 0 ölçümleri

Kamera geçişlerinde kare hızı (`scripts/dev/fps.mjs`, Pixel 7 taklidi, başsız Chromium, GPU'suz yazılımsal çizim):

| Geçiş | Normal CPU | 4× yavaş CPU |
|---|---|---|
| Türkiye → bölge → il | 60 fps | 54–60 fps |
| Dünya → Afrika → Kenya | 60 fps | 53–56 fps |

Performans kararları: sönükleştirme tek bir "perde" katmanıyla yapılır (250 ayrı geçiş yerine),
`opacity` yerine `fill-opacity`, kamera uçarken etiket yerleşimi durur, `will-change` ölçülerek kaldırıldı.
