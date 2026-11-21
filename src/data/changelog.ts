/** Sürüm notları: en yeni en üstte. Her yayında sürüm numarası (package.json) ile birlikte güncellenir. */
export interface Release {
  version: string;
  date: string;
  notes: string[];
}

export const CHANGELOG: Release[] = [
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
      'Küçük Seyyah: doğal ses paketi',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-11-21',
    notes: ['İlk yayın: seviyeli harita, beş oyun modu, Günün Haritası, istatistikler, Çocuk Köşesi, çevrimdışı çalışma'],
  },
];
