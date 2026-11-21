// Kıtalar ve ülke kuralları. Ülke geometrisi ve Türkçe adlar Natural Earth
// (Türkiye bakış açısı sürümü) verisinden gelir.

export interface KitaTanim {
  id: string;
  ad: string;
  /** Natural Earth CONTINENT değeri */
  ne: string;
  hue: number;
  sat: number;
  /** Kamera kutusu [[batı, güney], [doğu, kuzey]] (boylam, enlem) */
  kutu: [[number, number], [number, number]];
  /** Dünya görünümünde kıta etiketinin yeri [boylam, enlem] */
  etiket: [number, number];
  oynanabilir: boolean;
}

export const KITALAR: KitaTanim[] = [
  { id: 'afrika', ad: 'Afrika', ne: 'Africa', hue: 30, sat: 58, kutu: [[-20, -36], [53, 38]], etiket: [18, 6], oynanabilir: true },
  { id: 'asya', ad: 'Asya', ne: 'Asia', hue: 350, sat: 42, kutu: [[26, -11], [150, 62]], etiket: [88, 44], oynanabilir: true },
  { id: 'avrupa', ad: 'Avrupa', ne: 'Europe', hue: 214, sat: 50, kutu: [[-24, 34], [45, 71]], etiket: [15, 52], oynanabilir: true },
  { id: 'kuzey-amerika', ad: 'Kuzey Amerika', ne: 'North America', hue: 160, sat: 34, kutu: [[-168, 7], [-52, 72]], etiket: [-102, 44], oynanabilir: true },
  { id: 'guney-amerika', ad: 'Güney Amerika', ne: 'South America', hue: 92, sat: 34, kutu: [[-82, -56], [-34, 13]], etiket: [-60, -14], oynanabilir: true },
  { id: 'okyanusya', ad: 'Okyanusya', ne: 'Oceania', hue: 190, sat: 46, kutu: [[110, -48], [189, 2]], etiket: [134, -25], oynanabilir: true },
  { id: 'antarktika', ad: 'Antarktika', ne: 'Antarctica', hue: 220, sat: 14, kutu: [[-168, -90], [190, -60]], etiket: [20, -80], oynanabilir: false },
];

/** "Seven seas" ve tartışmalı atamaları düzelt */
export const KITA_DUZELTME: Record<string, string> = {
  SYC: 'Africa', MUS: 'Africa', SHN: 'Africa', ATF: 'Africa',
  MDV: 'Asia', IOT: 'Asia', IOA: 'Asia',
  HMD: 'Oceania', UMI: 'Oceania', PGA: 'Oceania',
  SGS: 'South America', CLP: 'North America',
};

/** Ülke sayılanlar: Natural Earth "Sovereign country" + aşağıdakiler. KKTC haritada gösterilir ama sorulmaz. */
const EK_ULKELER = ['CHN', 'ISR', 'PSX', 'FRA', 'FIN', 'KOS', 'DNK', 'GBR', 'NLD', 'USA', 'AUS', 'NZL', 'KAZ', 'CUB'];
const ULKE_DEGIL = ['CYN', 'ATA'];

export function ulkeMi(id: string, tur: string): boolean {
  if (ULKE_DEGIL.includes(id)) return false;
  return tur === 'Sovereign country' || EK_ULKELER.includes(id);
}

/** Ülke olmasa da haritada seçilebilen büyük ya da tanınmış bölgeler */
export const EK_SECILEBILIR = ['CYN', 'GRL', 'PRI', 'NCL', 'FLK', 'FRO', 'HKG', 'ATA'];

/** Adres ve görünen ad düzeltmeleri */
export const AD_DUZELTME: Record<string, string> = {
  TWN: 'Tayvan',
  CHN: 'Çin',
  CYN: 'KKTC',
  UMI: 'ABD Küçük Dış Adaları',
  IOA: 'Avustralya Hint Okyanusu Toprakları',
};

/** Kesim çizgisine bölünen ülkeler için etiket ve kamera düzeltmesi (boylam/enlem) */
export const KONUM_DUZELTME: Record<string, { etiket: [number, number]; kutu: [[number, number], [number, number]] }> = {
  // Kiribati: başkent Tarawa tarafı (Gilbert ve Phoenix adaları)
  KIR: { etiket: [173.0, 1.4], kutu: [[169, -5], [189, 4]] },
};
