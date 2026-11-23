/** Sürüm notları: en yeni en üstte. Her yayında sürüm numarası (package.json) ile birlikte güncellenir. */
export interface Release {
  version: string;
  date: string;
  notes: string[];
}

export const CHANGELOG: Release[] = [
  {
    version: '1.4.0',
    date: '2026-11-23',
    notes: [
      'Çengel Bulmaca: Memleket ve Cihan için, her seferinde yeni bulmaca',
      'Cihan haritasında başkentler ve büyük şehirler',
      'İl adları artık çakışınca kendi sınırları içinde boş yere kayar (ör. Üsküdar, Kadıköy)',
      'Bir ile bakarken komşu illerin ilçeleri de görünür',
      'Oyunda cevaptan sonra haritada tüm il/ülke adları',
      'Memleket Testi: yeni soru türleri ve daha iyi şıklar',
      'Uygulama her zaman açık temada',
    ],
  },
  {
    version: '1.3.1',
    date: '2026-11-23',
    notes: ['Düzeltme: ana ekrana eklenen uygulama ve paylaşılan bağlantılar (ör. /oyna) "sayfa bulunamadı" veriyordu'],
  },
  {
    version: '1.3.0',
    date: '2026-11-22',
    notes: [
      'Haritada ilçeler: bir ile girince 973 ilçenin sınırları ve adları görünür, ilçeye dokununca vurgulanır',
      'İl sınırları daha ayrıntılı ve doğru (OpenStreetMap verisinden)',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-11-22',
    notes: [
      'Küçük Seyyah: robot sesi yerine önceden kaydedilmiş, çocuksu ses paketi (çevrimdışı da çalışır)',
      'Puanlar sunucuda oyuncu başına ayrı tutuluyor: aynı anda oynayanların puanı kaybolmaz',
      'Sıralama ve "şu an keşifte" sayısı daha hızlı güncelleniyor',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-11-22',
    notes: [
      'Fersah kimliği: yeni logo, renkler ve yazı tipleri (Poppins, Inter)',
      'Genel haritada bölge adlarıyla birlikte il ve ülke adları',
      '"Burası Neresi?" adı; Yakın Atış\'ta dokunulan yerin adı ve iki yer arası mesafe',
      'Siluet yerine Plaka (Memleket) ve Bayrak (Cihan) soruları',
      'İlçeler ve metin tabanlı Memleket Testi',
      'Kullanıcı adı, sunucuda saklanan puanlar, sıralamalar ve anlık seyyah sayısı',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-11-21',
    notes: ['İlk yayın: seviyeli harita, beş oyun modu, Günün Haritası, istatistikler, Çocuk Köşesi, çevrimdışı çalışma'],
  },
];
