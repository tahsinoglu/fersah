/** Çocuk Köşesi keşif haritası: yöresel ürünler, hayvanlar, ünlü yapılar. Cümleler kısa ve doğrulanabilir. */
export interface ExploreItem {
  icon: string;
  unit: string; // il plakası ya da ülke kodu
  title: string;
  text: string;
}

export const EXPLORE: Record<'memleket' | 'cihan', ExploreItem[]> = {
  memleket: [
    { icon: 'cay', unit: '53', title: 'Rize çayı', text: "Rize'de çay yetişir. Türkiye'nin çayının çoğu buradan gelir." },
    { icon: 'kayisi', unit: '44', title: 'Malatya kayısısı', text: 'Malatya kayısısıyla ünlüdür.' },
    { icon: 'findik', unit: '28', title: 'Giresun fındığı', text: 'Giresun fındığıyla ünlüdür.' },
    { icon: 'fistik', unit: '27', title: 'Antep fıstığı', text: 'Gaziantep, Antep fıstığıyla ünlüdür.' },
    { icon: 'gul', unit: '32', title: 'Isparta gülü', text: "Isparta'da güller yetişir. Bu güllerden gülyağı yapılır." },
    { icon: 'uzum', unit: '45', title: 'Manisa üzümü', text: "Manisa'da bol bol üzüm yetişir." },
    { icon: 'zeytin', unit: '10', title: 'Balıkesir zeytini', text: "Balıkesir'in Ayvalık ve Edremit kıyılarında zeytin yetişir." },
    { icon: 'incir', unit: '09', title: 'Aydın inciri', text: 'Aydın inciriyle ünlüdür.' },
    { icon: 'balon', unit: '50', title: 'Kapadokya', text: "Nevşehir'de, Kapadokya'da peribacaları var. Gökyüzünde sıcak hava balonları uçar." },
    { icon: 'dag', unit: '04', title: 'Ağrı Dağı', text: "Türkiye'nin en yüksek dağı Ağrı Dağı'dır." },
    { icon: 'kedi', unit: '65', title: 'Van kedisi', text: 'Van kedilerinin gözleri bazen iki farklı renktir.' },
  ],
  cihan: [
    { icon: 'koala', unit: 'AUS', title: 'Koala', text: "Avustralya'da koalalar yaşar. Okaliptüs yaprağı yerler." },
    { icon: 'panda', unit: 'CHN', title: 'Dev panda', text: "Çin'de dev pandalar yaşar. Bambu yerler." },
    { icon: 'piramit', unit: 'EGY', title: 'Piramitler', text: "Mısır'da kocaman piramitler vardır." },
    { icon: 'eyfel', unit: 'FRA', title: 'Eyfel Kulesi', text: "Fransa'nın başkenti Paris'te Eyfel Kulesi vardır." },
    { icon: 'penguen', unit: 'ARG', title: 'Penguen', text: "Arjantin'in güney kıyılarında penguenler yaşar." },
    { icon: 'zurafa', unit: 'KEN', title: 'Zürafa', text: "Kenya'da zürafalar yaşar. Zürafa, boyu en uzun hayvandır." },
    { icon: 'fil', unit: 'IND', title: 'Fil', text: "Hindistan'da filler yaşar." },
    { icon: 'papagan', unit: 'BRA', title: 'Papağan', text: "Brezilya'nın ormanlarında rengârenk papağanlar yaşar." },
  ],
};
