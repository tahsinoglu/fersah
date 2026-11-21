// Türkiye'nin 7 coğrafi bölgesi (1941 Birinci Coğrafya Kongresi) ve 81 il.
// İl kodu = plaka = ISO 3166-2:TR kodu.

export interface BolgeTanim {
  id: string;
  ad: string;
  /** Harita renk ailesi (HSL ton açısı ve doygunluk) */
  hue: number;
  sat: number;
}

export const BOLGELER: BolgeTanim[] = [
  { id: 'marmara', ad: 'Marmara', hue: 206, sat: 52 },
  { id: 'ege', ad: 'Ege', hue: 176, sat: 38 },
  { id: 'akdeniz', ad: 'Akdeniz', hue: 22, sat: 62 },
  { id: 'ic-anadolu', ad: 'İç Anadolu', hue: 44, sat: 52 },
  { id: 'karadeniz', ad: 'Karadeniz', hue: 136, sat: 30 },
  { id: 'dogu-anadolu', ad: 'Doğu Anadolu', hue: 262, sat: 32 },
  { id: 'guneydogu-anadolu', ad: 'Güneydoğu Anadolu', hue: 346, sat: 42 },
];

/** [plaka, ad, bölge] */
const ILLER_HAM: [string, string, string][] = [
  ['01', 'Adana', 'akdeniz'], ['02', 'Adıyaman', 'guneydogu-anadolu'], ['03', 'Afyonkarahisar', 'ege'],
  ['04', 'Ağrı', 'dogu-anadolu'], ['05', 'Amasya', 'karadeniz'], ['06', 'Ankara', 'ic-anadolu'],
  ['07', 'Antalya', 'akdeniz'], ['08', 'Artvin', 'karadeniz'], ['09', 'Aydın', 'ege'],
  ['10', 'Balıkesir', 'marmara'], ['11', 'Bilecik', 'marmara'], ['12', 'Bingöl', 'dogu-anadolu'],
  ['13', 'Bitlis', 'dogu-anadolu'], ['14', 'Bolu', 'karadeniz'], ['15', 'Burdur', 'akdeniz'],
  ['16', 'Bursa', 'marmara'], ['17', 'Çanakkale', 'marmara'], ['18', 'Çankırı', 'ic-anadolu'],
  ['19', 'Çorum', 'karadeniz'], ['20', 'Denizli', 'ege'], ['21', 'Diyarbakır', 'guneydogu-anadolu'],
  ['22', 'Edirne', 'marmara'], ['23', 'Elazığ', 'dogu-anadolu'], ['24', 'Erzincan', 'dogu-anadolu'],
  ['25', 'Erzurum', 'dogu-anadolu'], ['26', 'Eskişehir', 'ic-anadolu'], ['27', 'Gaziantep', 'guneydogu-anadolu'],
  ['28', 'Giresun', 'karadeniz'], ['29', 'Gümüşhane', 'karadeniz'], ['30', 'Hakkari', 'dogu-anadolu'],
  ['31', 'Hatay', 'akdeniz'], ['32', 'Isparta', 'akdeniz'], ['33', 'Mersin', 'akdeniz'],
  ['34', 'İstanbul', 'marmara'], ['35', 'İzmir', 'ege'], ['36', 'Kars', 'dogu-anadolu'],
  ['37', 'Kastamonu', 'karadeniz'], ['38', 'Kayseri', 'ic-anadolu'], ['39', 'Kırklareli', 'marmara'],
  ['40', 'Kırşehir', 'ic-anadolu'], ['41', 'Kocaeli', 'marmara'], ['42', 'Konya', 'ic-anadolu'],
  ['43', 'Kütahya', 'ege'], ['44', 'Malatya', 'dogu-anadolu'], ['45', 'Manisa', 'ege'],
  ['46', 'Kahramanmaraş', 'akdeniz'], ['47', 'Mardin', 'guneydogu-anadolu'], ['48', 'Muğla', 'ege'],
  ['49', 'Muş', 'dogu-anadolu'], ['50', 'Nevşehir', 'ic-anadolu'], ['51', 'Niğde', 'ic-anadolu'],
  ['52', 'Ordu', 'karadeniz'], ['53', 'Rize', 'karadeniz'], ['54', 'Sakarya', 'marmara'],
  ['55', 'Samsun', 'karadeniz'], ['56', 'Siirt', 'guneydogu-anadolu'], ['57', 'Sinop', 'karadeniz'],
  ['58', 'Sivas', 'ic-anadolu'], ['59', 'Tekirdağ', 'marmara'], ['60', 'Tokat', 'karadeniz'],
  ['61', 'Trabzon', 'karadeniz'], ['62', 'Tunceli', 'dogu-anadolu'], ['63', 'Şanlıurfa', 'guneydogu-anadolu'],
  ['64', 'Uşak', 'ege'], ['65', 'Van', 'dogu-anadolu'], ['66', 'Yozgat', 'ic-anadolu'],
  ['67', 'Zonguldak', 'karadeniz'], ['68', 'Aksaray', 'ic-anadolu'], ['69', 'Bayburt', 'karadeniz'],
  ['70', 'Karaman', 'ic-anadolu'], ['71', 'Kırıkkale', 'ic-anadolu'], ['72', 'Batman', 'guneydogu-anadolu'],
  ['73', 'Şırnak', 'guneydogu-anadolu'], ['74', 'Bartın', 'karadeniz'], ['75', 'Ardahan', 'dogu-anadolu'],
  ['76', 'Iğdır', 'dogu-anadolu'], ['77', 'Yalova', 'marmara'], ['78', 'Karabük', 'karadeniz'],
  ['79', 'Kilis', 'guneydogu-anadolu'], ['80', 'Osmaniye', 'akdeniz'], ['81', 'Düzce', 'karadeniz'],
];

export interface IlTanim {
  plaka: string;
  ad: string;
  bolge: string;
}

export const ILLER: IlTanim[] = ILLER_HAM.map(([plaka, ad, bolge]) => ({ plaka, ad, bolge }));
export const ILLER_BY_PLAKA = new Map(ILLER.map((il) => [il.plaka, il]));
