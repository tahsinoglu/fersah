# Bilgi kartları için veri kaynakları (araştırma, 2026-11)

Amaç: Vikipedi'den tek cümle almak zayıf kalıyor. Hem daha zengin hem de yeniden kullanımı hukuken temiz kaynaklar.

| Kaynak | Ne verir | Lisans / kullanım | Bu ortamdan erişim | Öneri |
|---|---|---|---|---|
| **Wikidata** (SPARQL) | İl/ülke için yapılandırılmış veri: yüzölçümü, nüfus, rakım, en yüksek nokta, kardeş şehir, ünlü kişiler, UNESCO alanları, coğrafi işaretli ürünler | CC0 (atıf gerekmez) | Kapalı (ağ izni gerekir) | **1. öncelik.** Sorulardan ve kartlardan "kesin" bilgiler (sayılar, listeler) buradan üretilmeli; metin değil veri olduğu için doğrulaması kolay |
| **CIA World Factbook** (factbook.json) | Her ülke için coğrafya, iklim, en yüksek/alçak nokta, doğal kaynaklar, diller, para birimi, kısa tarih | Kamu malı (ABD hükümeti eseri; yalnızca CIA mührü kullanılamaz) | **Açık** (raw.githubusercontent.com) | **Cihan için hemen kullanılabilir.** İngilizce; alanlar yapılandırılmış olduğu için Türkçe kalıp cümlelere çevrilebilir ("En yüksek noktası: Zugspitze, 2.963 m") |
| **TÜRKPATENT Coğrafi İşaretler Portalı** (ci.turkpatent.gov.tr) | İl il tescilli yöresel ürünler (Rize çayı, Malatya kayısısı…) | Resmî kayıt; ürün adları ve tescil bilgisi olgudur, metinler alıntılanmamalı | Denenmedi | **Memleket için en zengin kaynak.** Dışa aktarma dosyası doğrulanamadı; liste elle ya da Wikidata'daki "coğrafi işaret" kayıtlarından çekilebilir |
| **TÜİK** (ADNKS il/ilçe nüfusu) | İl ve ilçe nüfusları, yıllık | Resmî istatistik; kullanım koşulları TÜİK sitesinde ayrıca kontrol edilmeli | Denenmedi | İlçe sorularında "bilinirlik" ölçüsü olarak mahalle sayısı yerine nüfus kullanılmalı; "en kalabalık ilçe" soruları açılır |
| **UNESCO Dünya Mirası Listesi** | Ülke/il bazında miras alanları | Liste verisi serbestçe kullanılabilir; açıklama metinleri telifli | Denenmedi | Wikidata üzerinden almak daha kolay |
| **OpenStreetMap** | Zirveler, göller, kaleler, adalar (koordinatlıyla) | ODbL (zaten kullanıyoruz) | Kısmen | Haritada "Ağrı Dağı burada" gibi gösterimler için |
| Valilik / Kültür Portalı / il tanıtım siteleri | Zengin tanıtım metinleri | **Telifli**; kopyalanamaz | — | Yalnızca elle yazılan cümlelerin doğrulanmasında kaynak olarak |

## Önerilen yol

1. **Cihan:** Factbook'tan her ülke için 3–5 yapılandırılmış bilgi (yüzölçümü, en yüksek nokta, para birimi, resmî dil, bağımsızlık yılı) → Türkçe kalıp cümleler. Kaynak bağlantısı Factbook sayfası olur.
2. **Memleket:** Wikidata erişimi açılırsa il başına coğrafi işaretli ürünler, en yüksek dağ, göller, UNESCO alanları; açılmazsa coğrafi işaret listesi elle derlenir (81 il × 3–5 ürün).
3. Kartlar tek cümle yerine 2–3 kısa bilgiye çıkar; her bilginin kaynağı ayrı tutulur (`kaynak` alanı bilgi başına).
4. Aynı veriler Memleket Testi ve Çengel Bulmaca ipuçlarında da kullanılır ("Kayısısıyla ünlü il", "En yüksek noktası Zugspitze olan ülke").

Kaynaklar: Wikidata lisansı https://www.wikidata.org/wiki/Wikidata:Licensing · Factbook telif https://www.cia.gov/the-world-factbook/about/copyright-and-contributors/ · TÜRKPATENT coğrafi işaret veri tabanı https://ci.turkpatent.gov.tr
