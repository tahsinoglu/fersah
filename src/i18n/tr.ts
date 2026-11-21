// Arayüz metinleri. Yeni dil eklemek için bu dosyanın kopyasını oluşturup çevirin.
export const tr = {
  app: {
    name: 'Memleket & Cihan',
    loading: 'Tefekkür ediliyor…',
    loadError: 'Harita yüklenemedi. Bağlantını kontrol edip tekrar dene.',
    retry: 'Tekrar dene',
  },
  nav: {
    memleket: 'Memleket',
    cihan: 'Cihan',
    sections: 'Bölümler',
  },
  search: {
    placeholder: 'İl, bölge, ülke ara',
    noResult: 'Sonuç yok',
    clear: 'Aramayı temizle',
    kind: { group_memleket: 'Bölge', unit_memleket: 'İl', group_cihan: 'Kıta', unit_cihan: 'Ülke' },
  },
  theme: {
    label: 'Tema',
    light: 'Açık',
    dark: 'Koyu',
    auto: 'Otomatik',
  },
  map: {
    recenter: 'Haritayı ortala',
    breadcrumb: 'Konum',
    ariaLabel: 'Etkileşimli harita. Yön tuşlarıyla gez, Enter ile seç, Esc ile geri çık.',
    hintRoot_memleket: 'Bir bölgeye dokun',
    hintRoot_cihan: 'Bir kıtaya dokun',
  },
  panel: {
    play_group_memleket: 'Bu bölgeyi oyna',
    play_unit_memleket: 'Bu ili oyna',
    play_group_cihan: 'Bu kıtayı oyna',
    play_unit_cihan: 'Bu ülkeyi oyna',
    comingSoon: 'Oyun bir sonraki aşamada geliyor',
    notPlayable: 'Bu alan oyunda sorulmaz',
    mastery: 'Ustalık',
    close: 'Kapat',
    regionWord: 'Bölgesi',
    ilCount: (n: number) => `${n} il`,
    countryCount: (n: number) => `${n} ülke`,
    plaka: (p: string) => `Plaka ${p}`,
    population: (s: string) => `Nüfus ≈ ${s}`,
    populationNote: 'Natural Earth tahmini',
    territory: 'Bağımlı ya da özel statülü bölge',
  },
} as const;

export type Dict = typeof tr;
